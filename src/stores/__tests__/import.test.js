import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import { createDb, setDb, getDb } from '@/services/db.js'
import { useImportStore } from '@/stores/import.js'
import { useLibraryStore } from '@/stores/library.js'

PouchDB.plugin(memoryAdapter)

const BASE = 'https://n8n.test/webhook'
let counter = 0

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })
const errorResponse = (status) => ({ ok: false, status, json: async () => ({}) })

// Formes réellement émises par les workflows (voir docs/n8n/).
const SPOTIFY_PLAYLISTS = [
  {
    name: 'BAT BEAT',
    description: '',
    tracks: { total: 2 },
    uri: 'spotify:playlist:PL_A',
    id: 'PL_A',
    href: 'https://api.spotify.com/v1/playlists/PL_A',
  },
]
const SPOTIFY_TRACKS = [
  {
    track: {
      artist: 'Talking Heads',
      title: 'Burning Down the House',
      added_at: '2025-04-07T14:34:51Z',
      album: 'Survival',
      track_id: 'X1',
    },
  },
  {
    track: {
      artist: 'Talking Heads',
      title: 'Once in a Lifetime',
      added_at: '2025-04-08T10:00:00Z',
      album: 'Remain in Light',
      track_id: 'X2',
    },
  },
]
const YOUTUBE_ITEMS = [
  {
    playlistId: 'PL_Y',
    videoId: 'UBS4Gi1y_nc',
    title: 'Aphex Twin - Windowlicker (Official Video)',
    description: '',
    thumbnail_url: '',
  },
]

const pendingDoc = (externalId, note = '') => ({
  _id: `track:youtube:${externalId}`,
  type: 'track',
  title: '',
  artist: '',
  album: '',
  matchKey: '',
  pending: true,
  sources: [
    {
      platform: 'youtube',
      playlistId: null,
      playlistName: null,
      externalId,
      addedAt: null,
      url: `https://youtu.be/${externalId}`,
      rawTitle: null,
    },
  ],
  note,
  tags: [],
  createdAt: '2026-08-18T14:00:00Z',
  updatedAt: '2026-08-18T14:00:00Z',
})

beforeEach(() => {
  setActivePinia(createPinia())
  setDb(createDb(`import-db-${counter++}`, { adapter: 'memory' }))
  vi.stubEnv('VITE_N8N_BASE_URL', BASE)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('endpoints réels', () => {
  it('appelle les URLs des workflows existants, pas un contrat inventé', async () => {
    const fetchMock = vi.fn(async (url) =>
      url.includes('/getplaylist') ? jsonResponse(SPOTIFY_PLAYLISTS) : jsonResponse(SPOTIFY_TRACKS),
    )
    vi.stubGlobal('fetch', fetchMock)

    await useImportStore().importPlatform('spotify')

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/getplaylist`,
      `${BASE}/playlist?id=PL_A`,
      `${BASE}/babines/liked?cache=false`,
    ])
  })

  it('appelle les URLs YouTube et n’essaie pas d’importer des favoris inexistants', async () => {
    const fetchMock = vi.fn(async (url) =>
      url.endsWith('/youtube')
        ? jsonResponse([
            { id: 'PL_Y', snippet: { title: 'Trouvailles' }, contentDetails: { itemCount: 1 } },
          ])
        : jsonResponse(YOUTUBE_ITEMS),
    )
    vi.stubGlobal('fetch', fetchMock)

    await useImportStore().importPlatform('youtube')

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/youtube`,
      `${BASE}/youtube/items?playlistId=PL_Y`,
    ])
  })
})

describe('écriture en base', () => {
  it('traduit la forme imbriquée de Spotify en document du modèle unique', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    await useImportStore().importPlaylist('spotify', {
      playlistId: 'PL_A',
      playlistName: 'BAT BEAT',
    })

    const doc = await getDb().get('track:spotify:X1')
    expect(doc.type).toBe('track')
    expect(doc.title).toBe('Burning Down the House')
    expect(doc.artist).toBe('Talking Heads')
    expect(doc.sources[0].playlistName).toBe('BAT BEAT')
    expect(doc.sources[0].url).toBe('https://open.spotify.com/track/X1')
    expect(doc.matchKey).toBe('talking heads::burning down the house')
  })

  it('découpe le titre brut d’une vidéo YouTube et conserve l’original', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(YOUTUBE_ITEMS)),
    )
    await useImportStore().importPlaylist('youtube', {
      playlistId: 'PL_Y',
      playlistName: 'Trouvailles',
    })

    const doc = await getDb().get('track:youtube:UBS4Gi1y_nc')
    expect(doc.title).toBe('Windowlicker')
    expect(doc.artist).toBe('Aphex Twin')
    expect(doc.sources[0].rawTitle).toBe('Aphex Twin - Windowlicker (Official Video)')
  })

  it('RÉIMPORTER NE DÉTRUIT NI LA NOTE NI LES TAGS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const importStore = useImportStore()
    const library = useLibraryStore()

    await importStore.importPlaylist('spotify', { playlistId: 'PL_A', playlistName: 'BAT BEAT' })
    await library.load()
    await library.updateEntry('track:spotify:X1', { note: 'vu au Petit Bain', tags: ['funk'] })

    await importStore.importPlaylist('spotify', { playlistId: 'PL_A', playlistName: 'BAT BEAT' })

    const doc = await getDb().get('track:spotify:X1')
    expect(doc.note).toBe('vu au Petit Bain')
    expect(doc.tags).toEqual(['funk'])
  })

  it('ajoute une provenance quand le morceau vient d’une seconde playlist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const store = useImportStore()
    await store.importPlaylist('spotify', { playlistId: 'PL_A', playlistName: 'BAT BEAT' })
    await store.importPlaylist('spotify', { playlistId: 'PL_B', playlistName: 'VOYAGER' })

    const doc = await getDb().get('track:spotify:X1')
    expect(doc.sources).toHaveLength(2)
    expect(doc.sources.map((s) => s.playlistName)).toEqual(['BAT BEAT', 'VOYAGER'])
  })
})

describe('forme réelle du workflow YouTube — pas la forme brute de l’API Google', () => {
  it('importe une playlist depuis la forme plate émise par « Edit Fields » (title/itemCount/id/thumbnail)', async () => {
    // Ce que le nœud « Edit Fields » du workflow YT_Babines/getAllPlaylists émet
    // réellement (voir docs/n8n/YT_Babines_getAllPlaylists.json), pas la forme
    // imbriquée snippet/contentDetails de l'API Google. C'est cette confusion qui
    // avait fait passer un nom de playlist vide et un décompte nul sans que rien
    // n'échoue.
    const REAL_PLAYLIST = {
      title: 'Trouvailles 2026',
      itemCount: 1,
      id: 'PL_Y',
      thumbnail: 'https://i.ytimg.com/vi/x/default.jpg',
    }
    const fetchMock = vi.fn(async (url) =>
      url.endsWith('/youtube') ? jsonResponse([REAL_PLAYLIST]) : jsonResponse(YOUTUBE_ITEMS),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useImportStore()
    await store.importPlatform('youtube')

    // 1. La playlist est bien lue : Babines connaît son nom et l'utilise pour
    // appeler le bon endpoint avec le bon identifiant.
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/youtube`,
      `${BASE}/youtube/items?playlistId=PL_Y`,
    ])

    // 2. Le document écrit en base porte le bon _id, le titre découpé et le
    // titre brut conservé dans la provenance.
    const doc = await getDb().get('track:youtube:UBS4Gi1y_nc')
    expect(doc.title).toBe('Windowlicker')
    expect(doc.artist).toBe('Aphex Twin')
    expect(doc.sources[0].rawTitle).toBe('Aphex Twin - Windowlicker (Official Video)')

    // 3. C'est l'assertion qui aurait attrapé le bug : la provenance doit porter
    // le nom de la playlist tiré de `title`, pas une chaîne vide.
    expect(doc.sources[0].playlistName).toBe('Trouvailles 2026')

    // 4. itemCount (1) correspond exactement au nombre d'éléments renvoyés (1) :
    // pas de troncature signalée, le job ressort « ok ».
    const job = store.jobs.at(-1)
    expect(job.status).toBe('ok')
    expect(job.truncated).toEqual([])
  })
})

describe('erreurs — jamais de liste vide silencieuse', () => {
  it('consigne le code HTTP et la plateforme', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse(500)),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.status).toBe('error')
    expect(job.httpStatus).toBe(500)
    expect(job.platform).toBe('spotify')
    expect(job.message).toMatch(/500/)
    expect(job.finishedAt).toBeTruthy()
  })

  it('consigne une panne réseau', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const store = useImportStore()
    await store.importPlatform('deezer')

    const job = store.jobs.at(-1)
    expect(job.status).toBe('error')
    expect(job.httpStatus).toBe(0)
  })

  it('rapporte un import partiel avec le décompte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist'))
          return jsonResponse([
            ...SPOTIFY_PLAYLISTS,
            { id: 'PL_KO', name: 'CASSÉE', tracks: { total: 3 } },
          ])
        if (url.includes('PL_KO')) return errorResponse(502)
        return jsonResponse(SPOTIFY_TRACKS)
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.status).toBe('partial')
    expect(job.imported).toBe(4)
    expect(job.failed).toBe(1)
    expect(job.message).toMatch(/CASSÉE/)
  })
})

describe('détection des imports tronqués — la source ment, le job ne doit pas mentir avec elle', () => {
  it('signale une playlist dont la source annonce plus de morceaux qu’elle n’en renvoie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist'))
          return jsonResponse([{ ...SPOTIFY_PLAYLISTS[0], tracks: { total: 60 } }])
        return jsonResponse(SPOTIFY_TRACKS) // seulement 2 morceaux reçus
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.truncated).toEqual([{ playlistName: 'BAT BEAT', received: 2, announced: 60 }])
    expect(job.status).toBe('partial')
    expect(job.message).toMatch(/BAT BEAT/)
    expect(job.message).toMatch(/2/)
    expect(job.message).toMatch(/60/)
  })

  it('ne signale rien quand le nombre reçu correspond à l’annoncé', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist'))
          return jsonResponse([{ ...SPOTIFY_PLAYLISTS[0], tracks: { total: 2 } }])
        return jsonResponse(SPOTIFY_TRACKS)
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.truncated).toEqual([])
    expect(job.status).toBe('ok')
  })

  it('ne signale rien quand la playlist n’annonce aucun total', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist'))
          return jsonResponse([{ ...SPOTIFY_PLAYLISTS[0], tracks: { total: null } }])
        return jsonResponse(SPOTIFY_TRACKS)
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.truncated).toEqual([])
    expect(job.status).toBe('ok')
  })

  it('ne signale rien quand on reçoit plus que l’annoncé', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist'))
          return jsonResponse([{ ...SPOTIFY_PLAYLISTS[0], tracks: { total: 1 } }])
        return jsonResponse(SPOTIFY_TRACKS) // 2 reçus, 1 annoncé
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.truncated).toEqual([])
  })

  it('porte à la fois une troncature et un échec réseau dans le même message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/getplaylist')) {
          return jsonResponse([
            { ...SPOTIFY_PLAYLISTS[0], tracks: { total: 60 } },
            { id: 'PL_KO', name: 'CASSÉE', tracks: { total: 3 } },
          ])
        }
        if (url.includes('PL_KO')) return errorResponse(502)
        return jsonResponse(SPOTIFY_TRACKS) // 2 reçus sur 60 annoncés pour BAT BEAT
      }),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.truncated).toEqual([{ playlistName: 'BAT BEAT', received: 2, announced: 60 }])
    expect(job.status).toBe('partial')
    expect(job.message).toMatch(/CASSÉE/)
    expect(job.message).toMatch(/BAT BEAT/)
  })
})

describe('resolvePending', () => {
  it('enrichit les entrées capturées hors ligne', async () => {
    const db = getDb()
    await db.put(pendingDoc('UBS4Gi1y_nc', 'entendu en soirée'))

    const fetchMock = vi.fn(async () =>
      jsonResponse({ videoId: 'UBS4Gi1y_nc', title: 'Aphex Twin - Windowlicker (Official Video)' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const resolved = await useImportStore().resolvePending()

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/resolve/youtube?id=UBS4Gi1y_nc`)
    const doc = await db.get('track:youtube:UBS4Gi1y_nc')
    expect(resolved).toBe(1)
    expect(doc.pending).toBe(false)
    expect(doc.title).toBe('Windowlicker')
    expect(doc.artist).toBe('Aphex Twin')
    expect(doc.note).toBe('entendu en soirée')
  })

  it('laisse l’entrée en attente si la résolution échoue, sans rien perdre', async () => {
    const db = getDb()
    await db.put(pendingDoc('ZZZ', 'à réécouter'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse(404)),
    )

    const resolved = await useImportStore().resolvePending()
    const doc = await db.get('track:youtube:ZZZ')
    expect(resolved).toBe(0)
    expect(doc.pending).toBe(true)
    expect(doc.note).toBe('à réécouter')
  })
})

describe('écritures vérifiées — le compteur ne doit pas mentir', () => {
  it('ne compte que les morceaux réellement écrits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const db = getDb()
    const realBulkDocs = db.bulkDocs.bind(db)
    db.bulkDocs = async (docs) => {
      const results = await realBulkDocs(docs)
      // Le premier document échoue, comme le ferait un conflit de révision.
      return results.map((r, i) =>
        i === 0 ? { id: docs[0]._id, error: true, name: 'conflict', message: 'simulé' } : r,
      )
    }

    const { written } = await useImportStore().importPlaylist('spotify', {
      playlistId: 'PL_A',
      playlistName: 'BAT BEAT',
    })
    expect(written).toBe(1)
  })

  it('fait remonter un échec d’écriture dans le job, pas seulement dans le décompte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        url.includes('/getplaylist')
          ? jsonResponse(SPOTIFY_PLAYLISTS)
          : jsonResponse(SPOTIFY_TRACKS),
      ),
    )
    const db = getDb()
    db.bulkDocs = async (docs) =>
      docs.map((d) => ({ id: d._id, error: true, name: 'conflict', message: 'simulé' }))

    const store = useImportStore()
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.status).toBe('partial')
    expect(job.imported).toBe(0)
    expect(job.message).toMatch(/écriture/i)
  })

  it('ne se contredit pas quand la même piste apparaît deux fois dans une volée', async () => {
    const doubled = [SPOTIFY_TRACKS[0], SPOTIFY_TRACKS[0]]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(doubled)),
    )

    const { written } = await useImportStore().importPlaylist('spotify', {
      playlistId: 'PL_A',
      playlistName: 'BAT BEAT',
    })

    // Un seul document, une seule écriture, aucun conflit.
    expect(written).toBe(1)
    const doc = await getDb().get('track:spotify:X1')
    expect(doc.sources).toHaveLength(1)
  })
})

describe('resolvePending — le silence global disparaît', () => {
  it('consigne un job quand des résolutions échouent', async () => {
    const db = getDb()
    await db.put(pendingDoc('ZZZ', 'à réécouter'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse(404)),
    )

    const store = useImportStore()
    const resolved = await store.resolvePending()

    expect(resolved).toBe(0)
    const job = store.jobs.at(-1)
    expect(job.status).toBe('error')
    expect(job.httpStatus).toBe(404)
    expect((await db.get('track:youtube:ZZZ')).pending).toBe(true)
  })

  it('ne consigne aucun job quand tout se résout', async () => {
    const db = getDb()
    await db.put(pendingDoc('UBS4Gi1y_nc'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ videoId: 'UBS4Gi1y_nc', title: 'Aphex Twin - Windowlicker' }),
      ),
    )

    const store = useImportStore()
    await store.resolvePending()
    expect(store.jobs).toHaveLength(0)
  })
})

describe('n8n non configuré', () => {
  it('échoue explicitement sans émettre la moindre requête', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const store = useImportStore()
    await store.importPlatform('spotify')

    expect(fetchMock).not.toHaveBeenCalled()
    const job = store.jobs.at(-1)
    expect(job.status).toBe('error')
    expect(job.message).toMatch(/configur/i)
  })

  it('ne tente aucune résolution et le consigne', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    const db = getDb()
    await db.put(pendingDoc('ZZZ'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const store = useImportStore()
    const resolved = await store.resolvePending()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(resolved).toBe(0)
    expect(store.jobs.at(-1).message).toMatch(/configur/i)
    // L'entrée reste intacte et en attente : rien n'est perdu.
    expect((await db.get('track:youtube:ZZZ')).pending).toBe(true)
  })
})

describe('searchVideos', () => {
  // Forme réellement émise par le workflow searchvideos : items affecté par un
  // nœud « Edit Fields », puis allIncomingItems qui enveloppe dans un tableau.
  const REPONSE = [
    {
      items: [
        {
          id: { videoId: 'V1' },
          snippet: {
            title: 'Talking Heads - Once in a Lifetime',
            channelTitle: 'Talking Heads',
            publishedAt: '2011-02-15T00:00:00Z',
            thumbnails: { medium: { url: 'https://i.ytimg.com/vi/V1/mqdefault.jpg' } },
          },
        },
      ],
    },
  ]

  it('interroge le bon webhook avec la requête encodée', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(REPONSE))
    vi.stubGlobal('fetch', fetchMock)
    const imports = useImportStore()

    await imports.searchVideos('Talking Heads Once in a Lifetime')

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/searchvideos?q=Talking%20Heads%20Once%20in%20a%20Lifetime`,
    )
  })

  it('renvoie les candidats traduits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(REPONSE)))
    const imports = useImportStore()

    const candidats = await imports.searchVideos('Talking Heads')

    expect(candidats).toEqual([
      {
        videoId: 'V1',
        title: 'Talking Heads - Once in a Lifetime',
        channel: 'Talking Heads',
        thumbnail: 'https://i.ytimg.com/vi/V1/mqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=V1',
        publishedAt: '2011-02-15T00:00:00Z',
      },
    ])
  })

  it('renvoie une liste vide quand YouTube ne trouve rien', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ items: [] }])))
    const imports = useImportStore()

    expect(await imports.searchVideos('zzzz')).toEqual([])
  })

  it('lève une ImportError portant le statut sur une réponse en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(500)))
    const imports = useImportStore()

    await expect(imports.searchVideos('Talking Heads')).rejects.toMatchObject({
      name: 'ImportError',
      status: 500,
    })
  })

  it('refuse d’appeler le réseau quand n8n n’est pas configuré', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const imports = useImportStore()

    await expect(imports.searchVideos('Talking Heads')).rejects.toThrow(/VITE_N8N_BASE_URL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('playlistContains', () => {
  // Forme émise par getPlaylistVideo : plate, comme YOUTUBE_ITEMS en tête de fichier.
  const CONTENU = [
    { playlistId: 'PL_Y', videoId: 'V1', title: 'Une vidéo' },
    { playlistId: 'PL_Y', videoId: 'V2', title: 'Une autre' },
  ]

  it('trouve une vidéo présente et rapporte le nombre d’éléments examinés', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(CONTENU)))
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V2')).toEqual({ found: true, checked: 2 })
  })

  it('ne trouve pas une vidéo absente, en rapportant ce qui a été examiné', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(CONTENU)))
    const imports = useImportStore()

    // `checked` est ce qui permet à l'écran de dire « absente des 2 premières »
    // plutôt que d'affirmer une absence que la troncature ne garantit pas.
    expect(await imports.playlistContains('PL_Y', 'V9')).toEqual({ found: false, checked: 2 })
  })

  it('interroge le contenu de la bonne playlist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(CONTENU))
    vi.stubGlobal('fetch', fetchMock)
    const imports = useImportStore()

    await imports.playlistContains('PL_Y', 'V1')

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/youtube/items?playlistId=PL_Y`)
  })

  it('lit l’identifiant même sous snippet.resourceId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse([{ snippet: { resourceId: { videoId: 'V3' } } }])),
    )
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V3')).toEqual({ found: true, checked: 1 })
  })

  it('traite une playlist vide sans jeter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V1')).toEqual({ found: false, checked: 0 })
  })

  it('lève sur une réponse en erreur : c’est à l’appelant de décider de passer outre', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(404)))
    const imports = useImportStore()

    await expect(imports.playlistContains('PL_Y', 'V1')).rejects.toMatchObject({
      name: 'ImportError',
      status: 404,
    })
  })
})

describe('resolveOne — résolution à l’enregistrement', () => {
  it('complète l’entrée qu’on vient de capturer, sans toucher aux autres', async () => {
    const db = getDb()
    await db.put(pendingDoc('UBS4Gi1y_nc'))
    await db.put(pendingDoc('AUTRE'))

    const fetchMock = vi.fn(async () =>
      jsonResponse({ videoId: 'UBS4Gi1y_nc', title: 'Aphex Twin - Windowlicker (Official Video)' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const ok = await useImportStore().resolveOne('track:youtube:UBS4Gi1y_nc')

    expect(ok).toBe(true)
    // Un seul appel : capturer un lien ne doit pas relancer la résolution de
    // toute la bibliothèque en attente.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/resolve/youtube?id=UBS4Gi1y_nc`)

    const doc = await db.get('track:youtube:UBS4Gi1y_nc')
    expect(doc.pending).toBe(false)
    expect(doc.artist).toBe('Aphex Twin')
    expect(doc.title).toBe('Windowlicker')

    // L'autre entrée en attente n'a pas bougé.
    expect((await db.get('track:youtube:AUTRE')).pending).toBe(true)
  })

  it('renvoie false et laisse l’entrée en attente quand la résolution échoue', async () => {
    const db = getDb()
    await db.put(pendingDoc('ZZZ', 'à réécouter'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse(500)),
    )

    const ok = await useImportStore().resolveOne('track:youtube:ZZZ')

    expect(ok).toBe(false)
    const doc = await db.get('track:youtube:ZZZ')
    expect(doc.pending).toBe(true)
    expect(doc.note).toBe('à réécouter')
  })

  it('ne tente rien pour une entrée sans provenance, comme un artiste noté à la main', async () => {
    const db = getDb()
    await db.put({
      _id: 'artist:1',
      type: 'artist',
      name: 'Aphex Twin',
      matchKey: 'aphex twin',
      pending: false,
      sources: [],
      note: '',
      tags: [],
      createdAt: '2026-08-18T14:00:00Z',
      updatedAt: '2026-08-18T14:00:00Z',
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await useImportStore().resolveOne('artist:1')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ne jette pas quand le document a disparu entre la capture et la résolution', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(useImportStore().resolveOne('track:youtube:FANTOME')).resolves.toBe(false)
  })
})

describe('addVideoToPlaylist', () => {
  it('poste sur le bon webhook avec la vidéo et la playlist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 'PLI_1' }]))
    vi.stubGlobal('fetch', fetchMock)
    const imports = useImportStore()

    await imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' })

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/addvideotoyoutube?id=V1&playlistId=PL_Y`, {
      method: 'POST',
    })
  })

  it('lève une ImportError portant le statut quand YouTube refuse', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(403)))
    const imports = useImportStore()

    await expect(
      imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' }),
    ).rejects.toMatchObject({ name: 'ImportError', status: 403 })
  })

  it('refuse d’appeler le réseau quand n8n n’est pas configuré', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const imports = useImportStore()

    await expect(imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' })).rejects.toThrow(
      /VITE_N8N_BASE_URL/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ne touche pas au document de l’entrée : la playlist YouTube est la seule destination', async () => {
    // Garde-fou de la contrainte du flux. Si ce test tombe, c'est qu'une écriture
    // s'est glissée dans le chemin sortant — la décision était de n'en faire aucune.
    // Les quatre actions du flux sont exercées, pas seulement les deux qui écrivent.
    const db = getDb()
    const { rev } = await db.put(pendingDoc('V1'))
    const avant = await db.get('track:youtube:V1')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'PLI_1' }])))
    const imports = useImportStore()

    await imports.searchVideos('Aphex Twin Windowlicker')
    await imports.fetchPlaylists('youtube')
    await imports.playlistContains('PL_Y', 'V1')
    await imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' })

    const apres = await db.get('track:youtube:V1')
    expect(apres).toEqual(avant)
    expect(apres._rev).toBe(rev)
  })
})

describe('« déjà à jour » — un réimport sans nouveauté n’est pas un import à zéro', () => {
  it('compte les morceaux inchangés au lieu de les passer sous silence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const store = useImportStore()
    const opts = { playlistId: 'PL_A', playlistName: 'BAT BEAT' }

    const premier = await store.importPlaylist('spotify', opts)
    expect(premier).toMatchObject({ written: 2, skipped: 0 })

    const second = await store.importPlaylist('spotify', opts)
    expect(second).toMatchObject({ written: 0, skipped: 2 })
  })

  it('ne compte qu’une fois un morceau que la volée contient deux fois', async () => {
    const doubled = [SPOTIFY_TRACKS[0], SPOTIFY_TRACKS[0]]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(doubled)),
    )
    const store = useImportStore()
    const opts = { playlistId: 'PL_A', playlistName: 'BAT BEAT' }

    await store.importPlaylist('spotify', opts)
    const second = await store.importPlaylist('spotify', opts)

    expect(second.skipped).toBe(1)
  })

  it('le dit dans le job, et ne dégrade pas son statut pour autant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        url.includes('/getplaylist')
          ? jsonResponse(SPOTIFY_PLAYLISTS)
          : jsonResponse(SPOTIFY_TRACKS),
      ),
    )
    const store = useImportStore()
    await store.importPlatform('spotify')
    await store.importPlatform('spotify')

    const job = store.jobs.at(-1)
    expect(job.imported).toBe(0)
    expect(job.skipped).toBe(4)
    expect(job.status).toBe('ok')
    expect(job.message).toMatch(/déjà à jour/)
  })
})

describe('nouveau ou mis à jour — « importé » recouvrait deux choses différentes', () => {
  it('distingue la création d’un document de l’ajout d’une provenance à un document existant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const store = useImportStore()

    const premier = await store.importPlaylist('spotify', {
      playlistId: 'PL_A',
      playlistName: 'BAT BEAT',
    })
    expect(premier).toMatchObject({ written: 2, created: 2, updated: 0, skipped: 0 })

    // Mêmes morceaux, autre playlist : rien de neuf en base, deux provenances de plus.
    const second = await store.importPlaylist('spotify', {
      playlistId: 'PL_B',
      playlistName: 'VOYAGER',
    })
    expect(second).toMatchObject({ written: 2, created: 0, updated: 2, skipped: 0 })
  })

  it('ne compte comme créé que ce que PouchDB a réellement accepté', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(SPOTIFY_TRACKS)),
    )
    const db = getDb()
    const realBulkDocs = db.bulkDocs.bind(db)
    db.bulkDocs = async (docs) => {
      const results = await realBulkDocs(docs)
      return results.map((r, i) =>
        i === 0 ? { id: docs[0]._id, error: true, name: 'conflict', message: 'simulé' } : r,
      )
    }

    const { created, written } = await useImportStore().importPlaylist('spotify', {
      playlistId: 'PL_A',
      playlistName: 'BAT BEAT',
    })
    expect(written).toBe(1)
    expect(created).toBe(1)
  })

  it('sépare les trois comptes dans le message du job', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        url.includes('/getplaylist')
          ? jsonResponse(SPOTIFY_PLAYLISTS)
          : jsonResponse(SPOTIFY_TRACKS),
      ),
    )
    const store = useImportStore()

    // La playlist crée les deux morceaux ; les favoris leur ajoutent une provenance.
    await store.importPlatform('spotify')
    const job = store.jobs.at(-1)
    expect(job.created).toBe(2)
    expect(job.updated).toBe(2)
    expect(job.message).toMatch(/2 nouveaux morceaux/)
    expect(job.message).toMatch(/2 mis à jour/)
  })
})
