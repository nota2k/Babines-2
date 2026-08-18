import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import { createDb, setDb, getDb } from '@/services/db.js'
import { useLibraryStore, displayTitle } from '@/stores/library.js'

PouchDB.plugin(memoryAdapter)

let counter = 0
let store

const track = (over = {}) => ({
  type: 'track',
  title: 'Burning Down the House',
  artist: 'Talking Heads',
  album: 'Survival',
  matchKey: 'talking heads::burning down the house',
  pending: false,
  sources: [{ platform: 'spotify', playlistId: 'PL_A', playlistName: 'BAT BEAT', externalId: 'X1aaaaaaaaaaaaaaaaaaaa', addedAt: null, url: null, rawTitle: null }],
  note: '',
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
})

beforeEach(async () => {
  setActivePinia(createPinia())
  const db = createDb(`lib-db-${counter++}`, { adapter: 'memory' })
  setDb(db)
  await db.put({ _id: 'track:spotify:X1aaaaaaaaaaaaaaaaaaaa', ...track() })
  await db.put({
    _id: 'track:youtube:Y2',
    ...track({
      title: 'Windowlicker',
      artist: 'Aphex Twin',
      matchKey: 'aphex twin::windowlicker',
      tags: ['électro'],
      sources: [{ platform: 'youtube', playlistId: 'PL_B', playlistName: 'Trouvailles', externalId: 'Y2', addedAt: null, url: null, rawTitle: null }],
    }),
  })
  await db.put({
    _id: 'artist:uuid-1',
    type: 'artist',
    name: 'Pulsallama',
    matchKey: 'pulsallama',
    pending: false,
    sources: [],
    note: 'vu au Petit Bain',
    tags: [],
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  })
  store = useLibraryStore()
  await store.load()
})

describe('load', () => {
  it('charge morceaux et artistes dans un flux unique', () => {
    expect(store.entries).toHaveLength(3)
    expect(store.error).toBeNull()
  })

  it('efface error mais ne touche pas notice', async () => {
    store.error = 'panne précédente'
    store.notice = 'migration incomplète'
    await store.load()
    expect(store.error).toBeNull()
    expect(store.notice).toBe('migration incomplète')
  })
})

describe('filtres', () => {
  it('filtre par plateforme via sources[]', () => {
    store.platform = 'youtube'
    expect(store.filtered.map((e) => e._id)).toEqual(['track:youtube:Y2'])
  })

  it('filtre par playlist', () => {
    store.playlist = 'BAT BEAT'
    expect(store.filtered).toHaveLength(1)
  })

  it('filtre par type', () => {
    store.entryType = 'artist'
    expect(store.filtered.map((e) => e.name)).toEqual(['Pulsallama'])
  })

  it('filtre par tag', () => {
    store.tag = 'électro'
    expect(store.filtered).toHaveLength(1)
  })

  it('cherche dans le titre, l’artiste, le nom et la note', () => {
    store.query = 'petit bain'
    expect(store.filtered.map((e) => e.name)).toEqual(['Pulsallama'])
    store.query = 'aphex'
    expect(store.filtered).toHaveLength(1)
  })

  it('expose les playlists, plateformes et tags disponibles', () => {
    expect(store.playlists).toEqual(['BAT BEAT', 'Trouvailles'])
    expect(store.platforms).toEqual(['spotify', 'youtube'])
    expect(store.tags).toEqual(['électro'])
  })

  it('compte les entrées par playlist, une seule fois même si une entrée y figure via plusieurs provenances', async () => {
    // Une entrée dont deux provenances partagent la même playlist ne doit
    // compter que pour une seule entrée dans le décompte de cette playlist.
    await getDb().put({
      _id: 'track:spotify:X2bbbbbbbbbbbbbbbbbbbb',
      ...track({
        title: 'This Must Be the Place',
        matchKey: 'talking heads::this must be the place',
        sources: [
          { platform: 'spotify', playlistId: 'PL_A', playlistName: 'BAT BEAT', externalId: 'X2bbbbbbbbbbbbbbbbbbbb', addedAt: null, url: null, rawTitle: null },
          { platform: 'youtube', playlistId: 'PL_A2', playlistName: 'BAT BEAT', externalId: 'Y3', addedAt: null, url: null, rawTitle: null },
        ],
      }),
    })
    await store.load()
    expect(store.playlistCounts).toEqual({ 'BAT BEAT': 2, Trouvailles: 1 })
  })
})

describe('playlistsByPlatform', () => {
  it('ne montre à chaque plateforme que ses propres playlists', () => {
    expect(store.playlistsByPlatform).toEqual({
      spotify: ['BAT BEAT'],
      youtube: ['Trouvailles'],
    })
  })

  it('fait apparaître une playlist sous les deux plateformes quand ses provenances en portent deux, sans doublon', async () => {
    await getDb().put({
      _id: 'track:spotify:X3cccccccccccccccccccc',
      ...track({
        title: 'Psycho Killer',
        matchKey: 'talking heads::psycho killer',
        sources: [
          { platform: 'spotify', playlistId: 'PL_A', playlistName: 'BAT BEAT', externalId: 'X3cccccccccccccccccccc', addedAt: null, url: null, rawTitle: null },
          { platform: 'youtube', playlistId: 'PL_A2', playlistName: 'BAT BEAT', externalId: 'Y4', addedAt: null, url: null, rawTitle: null },
        ],
      }),
    })
    await store.load()
    expect(store.playlistsByPlatform.spotify).toEqual(['BAT BEAT'])
    expect(store.playlistsByPlatform.youtube).toEqual(['BAT BEAT', 'Trouvailles'])
  })

  it('ignore une provenance sans playlistName sans provoquer d’erreur', async () => {
    await getDb().put({
      _id: 'artist:uuid-2',
      type: 'artist',
      name: 'Favoris',
      matchKey: 'favoris',
      pending: false,
      sources: [{ platform: 'spotify', playlistId: null, playlistName: null, externalId: null, addedAt: null, url: null, rawTitle: null }],
      note: '',
      tags: [],
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    })
    await store.load()
    expect(store.playlistsByPlatform.spotify).toEqual(['BAT BEAT'])
  })

  it('renvoie un objet vide pour une bibliothèque vide', async () => {
    store.entries = []
    expect(store.playlistsByPlatform).toEqual({})
  })
})

describe('capture', () => {
  it('crée une entrée en attente à partir d’un lien', async () => {
    const doc = await store.capture('https://youtu.be/UBS4Gi1y_nc')
    expect(doc._id).toBe('track:youtube:UBS4Gi1y_nc')
    expect(doc.pending).toBe(true)
    expect(store.entries).toHaveLength(4)
  })

  it('crée une entrée artiste à partir de texte libre', async () => {
    const doc = await store.capture('Gaspard Claus')
    expect(doc.type).toBe('artist')
    expect(doc.name).toBe('Gaspard Claus')
  })

  it('ne crée pas de doublon si le lien est déjà en base', async () => {
    await store.capture('https://open.spotify.com/track/X1aaaaaaaaaaaaaaaaaaaa')
    expect(store.entries).toHaveLength(3)
  })

  it('refuse une saisie vide', async () => {
    await expect(store.capture('   ')).resolves.toBeNull()
  })

  it('remonte l’erreur sans perdre la saisie quand l’écriture d’une capture échoue', async () => {
    const db = getDb()
    db.put = async () => { const e = new Error('disque plein'); e.status = 500; throw e }
    await expect(store.capture('Gaspard Claus')).rejects.toThrow('disque plein')
    expect(store.error).toMatch(/Gaspard Claus/)
  })
})

describe('updateEntry', () => {
  it('enregistre une note et des tags', async () => {
    await store.updateEntry('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', { note: 'à réécouter', tags: ['funk'] })
    const entry = store.entries.find((e) => e._id === 'track:spotify:X1aaaaaaaaaaaaaaaaaaaa')
    expect(entry.note).toBe('à réécouter')
    expect(entry.tags).toEqual(['funk'])
    expect(entry.updatedAt).not.toBe('2026-01-01T00:00:00Z')
  })

  it('efface une erreur périmée quand une action réussit ensuite', async () => {
    store.error = 'panne précédente'
    await store.updateEntry('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', { note: 'ok' })
    expect(store.error).toBeNull()
  })
})

describe('mergeEntries', () => {
  it('fusionne les provenances, les tags et les notes, puis supprime le doublon', async () => {
    await store.updateEntry('track:youtube:Y2', { note: 'version clip' })
    await store.mergeEntries('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', 'track:youtube:Y2')
    const kept = store.entries.find((e) => e._id === 'track:spotify:X1aaaaaaaaaaaaaaaaaaaa')
    expect(kept.sources).toHaveLength(2)
    expect(kept.note).toContain('version clip')
    expect(kept.tags).toContain('électro')
    expect(store.entries.find((e) => e._id === 'track:youtube:Y2')).toBeUndefined()
  })
})

describe('mergeEntries — reprise', () => {
  it('ne duplique pas la note quand une fusion est reproposée après l’échec de la suppression du doublon', async () => {
    await store.updateEntry('track:youtube:Y2', { note: 'version clip' })
    const db = getDb()
    db.remove = async () => { throw new Error('suppression refusée') }

    // Première tentative : la fusion est écrite, mais la suppression du doublon échoue.
    await store.mergeEntries('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', 'track:youtube:Y2')
    // Le doublon survit, donc la fusion peut être reproposée.
    await store.mergeEntries('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', 'track:youtube:Y2')

    const kept = store.entries.find((e) => e._id === 'track:spotify:X1aaaaaaaaaaaaaaaaaaaa')
    expect(kept.note).toBe('version clip')
  })
})

describe('remontée des erreurs — rien ne doit échouer en silence', () => {
  it('renseigne l’erreur et relance quand l’écriture d’une modification échoue', async () => {
    const db = getDb()
    db.put = async () => { const e = new Error('quota dépassé'); e.status = 500; throw e }

    await expect(store.updateEntry('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', { note: 'perdue ?' })).rejects.toThrow('quota dépassé')
    expect(store.error).toMatch(/quota dépassé/)
  })

  it('renseigne l’erreur et relance quand une suppression échoue', async () => {
    const db = getDb()
    db.remove = async () => { throw new Error('base verrouillée') }

    await expect(store.removeEntry('track:spotify:X1aaaaaaaaaaaaaaaaaaaa')).rejects.toThrow('base verrouillée')
    expect(store.error).toMatch(/base verrouillée/)
  })
})

describe('mergeEntries — échec de la suppression du doublon', () => {
  it('conserve la fusion déjà écrite, la reflète localement, et signale l’échec', async () => {
    await store.updateEntry('track:youtube:Y2', { note: 'version clip' })
    const db = getDb()
    db.remove = async () => { throw new Error('suppression refusée') }

    // La fusion ne doit pas être annulée : elle est déjà en base.
    await store.mergeEntries('track:spotify:X1aaaaaaaaaaaaaaaaaaaa', 'track:youtube:Y2')

    const kept = store.entries.find((e) => e._id === 'track:spotify:X1aaaaaaaaaaaaaaaaaaaa')
    expect(kept.sources).toHaveLength(2)
    expect(kept.note).toContain('version clip')
    // Le doublon survit : rien n'est perdu, il pourra être refusionné.
    expect(store.entries.find((e) => e._id === 'track:youtube:Y2')).toBeTruthy()
    expect(store.error).toMatch(/suppression/i)
  })
})

describe('duplicateGroups', () => {
  it('regroupe les entrées partageant une matchKey, sans jamais fusionner seul', async () => {
    await store.capture('https://open.spotify.com/track/Z9bbbbbbbbbbbbbbbbbbbb')
    await store.updateEntry('track:spotify:Z9bbbbbbbbbbbbbbbbbbbb', {
      title: 'Windowlicker',
      artist: 'Aphex Twin',
      matchKey: 'aphex twin::windowlicker',
      pending: false,
    })
    expect(store.duplicateGroups).toHaveLength(1)
    expect(store.duplicateGroups[0]).toHaveLength(2)
    expect(store.entries).toHaveLength(4)
  })
})

describe('syncLabel', () => {
  it('traduit chaque état de réplication, le hors-ligne n’étant pas une erreur', () => {
    const cases = {
      idle: 'à jour',
      pending: 'synchronisation…',
      offline: 'hors ligne',
      'auth-error': 'erreur d’authentification',
      error: 'erreur de synchronisation',
      'local-only': 'local uniquement',
    }
    for (const [status, label] of Object.entries(cases)) {
      store.syncStatus = status
      expect(store.syncLabel).toBe(label)
    }
  })

  it('démarre en « local uniquement »', () => {
    expect(useLibraryStore().syncStatus).toBe('local-only')
  })
})

describe('displayTitle', () => {
  it('affiche le titre d’un morceau et le nom d’un artiste', () => {
    expect(displayTitle({ type: 'track', title: 'X' })).toBe('X')
    expect(displayTitle({ type: 'artist', name: 'Y' })).toBe('Y')
  })

  it('replie sur l’URL pour une entrée en attente', () => {
    expect(displayTitle({ type: 'track', title: '', pending: true, sources: [{ url: 'https://youtu.be/a' }] })).toBe('https://youtu.be/a')
  })
})
