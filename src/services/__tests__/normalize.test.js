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
