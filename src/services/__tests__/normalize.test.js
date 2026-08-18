import { describe, it, expect } from 'vitest'
import { matchKey, stripNoise } from '@/services/normalize.js'

describe('stripNoise', () => {
  it('retire une parenthèse parasite', () => {
    expect(stripNoise('Windowlicker (Official Video)')).toBe('Windowlicker')
  })

  it('retire un suffixe de remaster', () => {
    expect(stripNoise('Creep - Remastered 2011')).toBe('Creep')
  })

  it('retire une mention feat entre parenthèses', () => {
    expect(stripNoise('Get Lucky (feat. Pharrell Williams)')).toBe('Get Lucky')
  })

  it('retire une mention feat sans parenthèses', () => {
    expect(stripNoise('Get Lucky feat. Pharrell Williams')).toBe('Get Lucky')
  })

  it('conserve une parenthèse porteuse de sens', () => {
    expect(stripNoise('Ungawa Pt. II (Way Out Guyana)')).toBe('Ungawa Pt. II (Way Out Guyana)')
  })

  it('conserve un tiret porteur de sens', () => {
    expect(stripNoise('Burning Down the House - I Get Wild')).toBe(
      'Burning Down the House - I Get Wild',
    )
  })
})

describe('matchKey', () => {
  it('minuscule, sans accent, espaces normalisés', () => {
    expect(matchKey('Talking Heads', 'Burning Down  the House')).toBe(
      'talking heads::burning down the house',
    )
  })

  it('retire les accents', () => {
    expect(matchKey('Björk', 'Hyperballad')).toBe('bjork::hyperballad')
  })

  it('rend identiques un titre et sa version remasterisée', () => {
    expect(matchKey('Radiohead', 'Creep - Remastered 2011')).toBe(matchKey('Radiohead', 'Creep'))
  })

  it('retire la ponctuation', () => {
    expect(matchKey('Bob Marley & The Wailers', 'So Much Trouble In The World')).toBe(
      'bob marley the wailers::so much trouble in the world',
    )
  })

  it('sans titre, ne renvoie que l’artiste', () => {
    expect(matchKey('Pulsallama')).toBe('pulsallama')
  })
})

import { splitYoutubeTitle, toTrackDoc } from '@/services/normalize.js'

const NOW = '2026-08-18T14:00:00Z'

describe('splitYoutubeTitle', () => {
  it('sépare artiste et titre sur le premier tiret', () => {
    expect(splitYoutubeTitle('Aphex Twin - Windowlicker (Official Video)')).toEqual({
      artist: 'Aphex Twin',
      title: 'Windowlicker',
    })
  })

  it('ne coupe que sur le premier tiret', () => {
    expect(splitYoutubeTitle('A - B - C')).toEqual({ artist: 'A', title: 'B - C' })
  })

  it('laisse l’artiste vide quand il n’y a pas de tiret', () => {
    expect(splitYoutubeTitle('Un titre sans separateur')).toEqual({
      artist: '',
      title: 'Un titre sans separateur',
    })
  })
})

describe('toTrackDoc', () => {
  const spotifyRaw = {
    externalId: '2VNfJpwdEQBLyXajaa6LWT',
    title: 'Burning Down the House',
    artist: 'Talking Heads',
    album: 'Burning Down the House / I Get Wild / Wild Gravity',
    addedAt: '2025-04-07T14:34:51Z',
    url: 'https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWT',
  }
  const spotifySource = {
    platform: 'spotify',
    playlistId: '2bh4gKi6Jn1dtayg9fFwr5',
    playlistName: 'BAT BEAT',
  }

  it('construit un _id préfixé par la plateforme', () => {
    expect(toTrackDoc(spotifyRaw, spotifySource, NOW)._id).toBe(
      'track:spotify:2VNfJpwdEQBLyXajaa6LWT',
    )
  })

  it('produit un document complet et vierge de note', () => {
    expect(toTrackDoc(spotifyRaw, spotifySource, NOW)).toEqual({
      _id: 'track:spotify:2VNfJpwdEQBLyXajaa6LWT',
      type: 'track',
      title: 'Burning Down the House',
      artist: 'Talking Heads',
      album: 'Burning Down the House / I Get Wild / Wild Gravity',
      matchKey: 'talking heads::burning down the house',
      pending: false,
      sources: [
        {
          platform: 'spotify',
          playlistId: '2bh4gKi6Jn1dtayg9fFwr5',
          playlistName: 'BAT BEAT',
          externalId: '2VNfJpwdEQBLyXajaa6LWT',
          addedAt: '2025-04-07T14:34:51Z',
          url: 'https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWT',
          rawTitle: null,
        },
      ],
      note: '',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  it('conserve le titre d’origine pour Spotify, même bruité', () => {
    const doc = toTrackDoc({ ...spotifyRaw, title: 'Creep - Remastered 2011' }, spotifySource, NOW)
    expect(doc.title).toBe('Creep - Remastered 2011')
  })

  it('nettoie le titre YouTube et conserve le titre brut dans la source', () => {
    const doc = toTrackDoc(
      {
        externalId: 'UBS4Gi1y_nc',
        title: 'Aphex Twin - Windowlicker (Official Video)',
        addedAt: '2025-01-02T10:00:00Z',
        url: 'https://www.youtube.com/watch?v=UBS4Gi1y_nc',
      },
      { platform: 'youtube', playlistId: 'PL123', playlistName: 'Trouvailles' },
      NOW,
    )
    expect(doc.title).toBe('Windowlicker')
    expect(doc.artist).toBe('Aphex Twin')
    expect(doc.sources[0].rawTitle).toBe('Aphex Twin - Windowlicker (Official Video)')
    expect(doc._id).toBe('track:youtube:UBS4Gi1y_nc')
  })

  it('accepte une source sans playlist (titres likés)', () => {
    const doc = toTrackDoc(
      { externalId: 'abc', title: 'X', artist: 'Y' },
      { platform: 'deezer', playlistId: null, playlistName: 'Titres likés' },
      NOW,
    )
    expect(doc.sources[0].playlistId).toBeNull()
    expect(doc.sources[0].playlistName).toBe('Titres likés')
    expect(doc.album).toBe('')
  })
})

import likedTracksData from '@/data/likedTracks.js'

describe('toTrackDoc sur les données réelles', () => {
  it('traduit les titres likés Spotify sans perte', () => {
    const docs = likedTracksData.map((row) =>
      toTrackDoc(
        {
          externalId: row.track.track_id,
          title: row.track.title,
          artist: row.track.artist,
          album: row.track.album,
          addedAt: row.track.added_at,
        },
        { platform: 'spotify', playlistId: null, playlistName: 'Titres likés' },
        NOW,
      ),
    )
    expect(docs.length).toBeGreaterThan(10)
    expect(docs.every((d) => d._id.startsWith('track:spotify:'))).toBe(true)
    expect(docs.every((d) => d.matchKey.includes('::'))).toBe(true)
    expect(docs.every((d) => d.note === '' && d.tags.length === 0)).toBe(true)
  })
})

import { parseShareUrl, toPendingTrackDoc, toArtistDoc } from '@/services/normalize.js'

describe('parseShareUrl', () => {
  it('reconnaît une URL Spotify', () => {
    expect(parseShareUrl('https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWT?si=ab12')).toEqual({
      platform: 'spotify',
      externalId: '2VNfJpwdEQBLyXajaa6LWT',
      url: 'https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWT?si=ab12',
    })
  })

  it('reconnaît une URL Spotify localisée', () => {
    expect(parseShareUrl('https://open.spotify.com/intl-fr/track/4Vy7V1tayxddOy2pGkOVT0').platform).toBe('spotify')
  })

  it('reconnaît un URI Spotify', () => {
    expect(parseShareUrl('spotify:track:4Vy7V1tayxddOy2pGkOVT0').externalId).toBe('4Vy7V1tayxddOy2pGkOVT0')
  })

  it('reconnaît une URL Deezer', () => {
    expect(parseShareUrl('https://www.deezer.com/fr/track/3135556')).toEqual({
      platform: 'deezer',
      externalId: '3135556',
      url: 'https://www.deezer.com/fr/track/3135556',
    })
  })

  it('reconnaît une URL YouTube longue avec paramètres', () => {
    expect(parseShareUrl('https://www.youtube.com/watch?v=UBS4Gi1y_nc&list=PL1').externalId).toBe('UBS4Gi1y_nc')
  })

  it('reconnaît une URL YouTube courte', () => {
    expect(parseShareUrl('https://youtu.be/UBS4Gi1y_nc?t=12').platform).toBe('youtube')
  })

  it('renvoie null sur du texte libre', () => {
    expect(parseShareUrl('Pulsallama')).toBeNull()
    expect(parseShareUrl('')).toBeNull()
  })

  it('rejette un identifiant Spotify tronqué', () => {
    expect(parseShareUrl('https://open.spotify.com/track/2VNfJpwd')).toBeNull()
  })

  it('rejette un identifiant Spotify rallongé', () => {
    expect(parseShareUrl('https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWTextra')).toBeNull()
  })

  it('rejette un lien de piste sans identifiant', () => {
    expect(parseShareUrl('https://open.spotify.com/track/')).toBeNull()
  })
})

describe('toPendingTrackDoc', () => {
  it('crée une entrée en attente, annotable immédiatement', () => {
    const parsed = parseShareUrl('https://youtu.be/UBS4Gi1y_nc')
    expect(toPendingTrackDoc(parsed, NOW)).toEqual({
      _id: 'track:youtube:UBS4Gi1y_nc',
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
          externalId: 'UBS4Gi1y_nc',
          addedAt: NOW,
          url: 'https://youtu.be/UBS4Gi1y_nc',
          rawTitle: null,
        },
      ],
      note: '',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    })
  })
})

describe('toArtistDoc', () => {
  it('crée une entrée artiste avec un identifiant dédié', () => {
    expect(toArtistDoc('Pulsallama', NOW, 'fixed-uuid')).toEqual({
      _id: 'artist:fixed-uuid',
      type: 'artist',
      name: 'Pulsallama',
      matchKey: 'pulsallama',
      pending: false,
      sources: [],
      note: '',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    })
  })
})

import {
  fromSpotifyPlaylist,
  fromSpotifyTrack,
  fromYoutubePlaylist,
  fromYoutubeItem,
  fromDeezerPlaylist,
  fromDeezerTrack,
  ADAPTERS,
} from '@/services/normalize.js'

describe('adaptateurs Spotify', () => {
  it('aplatit une playlist et lit le nombre de morceaux dans tracks.total', () => {
    expect(
      fromSpotifyPlaylist({
        name: 'BAT BEAT',
        description: '',
        tracks: { href: 'https://api.spotify.com/v1/playlists/PL_A/tracks', total: 11 },
        uri: 'spotify:playlist:PL_A',
        id: 'PL_A',
        href: 'https://api.spotify.com/v1/playlists/PL_A',
      }),
    ).toEqual({
      id: 'PL_A',
      name: 'BAT BEAT',
      description: '',
      trackCount: 11,
      url: 'https://open.spotify.com/playlist/PL_A',
    })
  })

  it('aplatit un morceau imbriqué sous track et reconstruit son URL', () => {
    expect(
      fromSpotifyTrack({
        track: {
          artist: 'Talking Heads',
          title: 'Burning Down the House',
          added_at: '2025-04-07T14:34:51Z',
          album: 'Survival',
          track_id: '2VNfJpwdEQBLyXajaa6LWT',
        },
      }),
    ).toEqual({
      externalId: '2VNfJpwdEQBLyXajaa6LWT',
      title: 'Burning Down the House',
      artist: 'Talking Heads',
      album: 'Survival',
      addedAt: '2025-04-07T14:34:51Z',
      url: 'https://open.spotify.com/track/2VNfJpwdEQBLyXajaa6LWT',
    })
  })

  it('tolère un morceau déjà plat', () => {
    expect(fromSpotifyTrack({ track_id: 'X1', title: 'T', artist: 'A' }).externalId).toBe('X1')
  })
})

describe('adaptateurs YouTube', () => {
  it('lit un élément de playlist et reconstruit son URL de vidéo', () => {
    expect(
      fromYoutubeItem({
        playlistId: 'PL123',
        videoId: 'UBS4Gi1y_nc',
        title: 'Aphex Twin - Windowlicker (Official Video)',
        description: '…',
        thumbnail_url: 'https://i.ytimg.com/vi/UBS4Gi1y_nc/default.jpg',
      }),
    ).toEqual({
      externalId: 'UBS4Gi1y_nc',
      title: 'Aphex Twin - Windowlicker (Official Video)',
      artist: '',
      album: '',
      addedAt: null,
      url: 'https://www.youtube.com/watch?v=UBS4Gi1y_nc',
    })
  })

  it('lit une playlist au format de l’API YouTube', () => {
    expect(
      fromYoutubePlaylist({
        id: 'PL123',
        snippet: { title: 'Trouvailles', description: 'en vrac' },
        contentDetails: { itemCount: 42 },
      }),
    ).toEqual({
      id: 'PL123',
      name: 'Trouvailles',
      description: 'en vrac',
      trackCount: 42,
      url: 'https://www.youtube.com/playlist?list=PL123',
    })
  })

  it('tolère une playlist déjà aplatie par n8n', () => {
    expect(fromYoutubePlaylist({ id: 'PL9', name: 'Déjà plate' }).name).toBe('Déjà plate')
  })

  it('lit la forme réellement émise par le workflow n8n', () => {
    // Relevé sur docs/n8n/YT_Babines_getAllPlaylists.json, nœud « Edit Fields » :
    // {title, itemCount, id, thumbnail} — ni snippet, ni contentDetails.
    expect(
      fromYoutubePlaylist({
        title: 'Trouvailles',
        itemCount: 42,
        id: 'PL123',
        thumbnail: 'https://i.ytimg.com/vi/x/default.jpg',
      }),
    ).toEqual({
      id: 'PL123',
      name: 'Trouvailles',
      description: '',
      trackCount: 42,
      url: 'https://www.youtube.com/playlist?list=PL123',
    })
  })
})

describe('adaptateurs Deezer', () => {
  it('laisse passer une playlist déjà au format cible', () => {
    const raw = { id: '123', name: 'Rave', description: '', trackCount: 4, url: 'https://deezer.com/playlist/123' }
    expect(fromDeezerPlaylist(raw)).toEqual(raw)
  })

  it('laisse passer un morceau déjà au format cible et complète l’URL manquante', () => {
    expect(fromDeezerTrack({ externalId: '3135556', title: 'T', artist: 'A', album: 'Al', addedAt: null })).toEqual({
      externalId: '3135556',
      title: 'T',
      artist: 'A',
      album: 'Al',
      addedAt: null,
      url: 'https://www.deezer.com/track/3135556',
    })
  })
})

describe('ADAPTERS', () => {
  it('expose un couple playlist/track pour les trois plateformes', () => {
    for (const platform of ['spotify', 'youtube', 'deezer']) {
      expect(typeof ADAPTERS[platform].playlist).toBe('function')
      expect(typeof ADAPTERS[platform].track).toBe('function')
    }
  })
})

describe('chaînage adaptateur → toTrackDoc sur les données réelles', () => {
  it('traduit le dump Spotify figé jusqu’au document final', () => {
    const docs = likedTracksData.map((row) =>
      toTrackDoc(fromSpotifyTrack(row), { platform: 'spotify', playlistId: null, playlistName: 'Titres likés' }, NOW),
    )
    expect(docs.length).toBeGreaterThan(10)
    expect(docs.every((d) => d._id.startsWith('track:spotify:'))).toBe(true)
    expect(docs.every((d) => d.sources[0].url.startsWith('https://open.spotify.com/track/'))).toBe(true)
    expect(docs.every((d) => d.artist && d.title)).toBe(true)
  })
})
