import { describe, it, expect } from 'vitest'
import { buildExport, exportFilename, toExportEntry } from '@/services/exportLibrary.js'

const AT = '2026-08-18T14:22:00Z'

const track = {
  _id: 'track:spotify:X1',
  _rev: '3-abcdef',
  type: 'track',
  title: 'Burning Down the House',
  artist: 'Talking Heads',
  album: 'Survival',
  matchKey: 'talking heads::burning down the house',
  pending: false,
  sources: [{ platform: 'spotify', playlistId: 'PL_A', playlistName: 'BAT BEAT', externalId: 'X1', addedAt: '2025-04-07T14:34:51Z', url: 'https://open.spotify.com/track/X1', rawTitle: null }],
  note: 'vu au Petit Bain',
  tags: ['funk'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
}

const artist = {
  _id: 'artist:uuid-1',
  _rev: '1-xyz',
  type: 'artist',
  name: 'Pulsallama',
  matchKey: 'pulsallama',
  pending: false,
  sources: [],
  note: '',
  tags: [],
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

describe('toExportEntry', () => {
  it('renomme _id en id et retire _rev', () => {
    const entry = toExportEntry(track)
    expect(entry.id).toBe('track:spotify:X1')
    expect(entry._id).toBeUndefined()
    expect(entry._rev).toBeUndefined()
  })

  it('conserve note, tags, provenances et dates', () => {
    const entry = toExportEntry(track)
    expect(entry.note).toBe('vu au Petit Bain')
    expect(entry.tags).toEqual(['funk'])
    expect(entry.sources).toHaveLength(1)
    expect(entry.createdAt).toBe('2026-01-01T00:00:00Z')
  })
})

describe('buildExport', () => {
  it('produit une enveloppe versionnée séparant morceaux et artistes', () => {
    const payload = buildExport([track, artist], 'library', AT)
    expect(payload.version).toBe(1)
    expect(payload.exportedAt).toBe(AT)
    expect(payload.scope).toBe('library')
    expect(payload.tracks).toHaveLength(1)
    expect(payload.artists).toHaveLength(1)
  })

  it('ne laisse aucun _rev dans la sortie', () => {
    expect(JSON.stringify(buildExport([track, artist], 'library', AT))).not.toContain('_rev')
  })

  it('consigne la portée quand un filtre est actif', () => {
    expect(buildExport([track], 'playlist:BAT BEAT', AT).scope).toBe('playlist:BAT BEAT')
  })
})

describe('exportFilename', () => {
  it('nomme un export global', () => {
    expect(exportFilename('library', AT)).toBe('babines-2026-08-18.json')
  })

  it('suffixe avec la portée, translittérée', () => {
    expect(exportFilename('playlist:BAT BEAT', AT)).toBe('babines-2026-08-18-playlist-bat-beat.json')
    expect(exportFilename('artiste:Björk', AT)).toBe('babines-2026-08-18-artiste-bjork.json')
  })
})
