import { describe, it, expect } from 'vitest'
import { mergeSources, mergeTrackDoc } from '@/services/merge.js'

const NOW = '2026-08-18T14:00:00Z'
const LATER = '2026-09-01T09:00:00Z'

const source = (over = {}) => ({
  platform: 'spotify',
  playlistId: 'PL_A',
  playlistName: 'BAT BEAT',
  externalId: 'X1',
  addedAt: '2025-04-07T14:34:51Z',
  url: 'https://open.spotify.com/track/X1',
  rawTitle: null,
  ...over,
})

const doc = (over = {}) => ({
  _id: 'track:spotify:X1',
  type: 'track',
  title: 'Burning Down the House',
  artist: 'Talking Heads',
  album: 'Survival',
  matchKey: 'talking heads::burning down the house',
  pending: false,
  sources: [source()],
  note: '',
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
})

describe('mergeSources', () => {
  it('ajoute une playlist sans écraser la précédente', () => {
    const result = mergeSources([source()], [source({ playlistId: 'PL_B', playlistName: 'VOYAGER' })])
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.playlistId)).toEqual(['PL_A', 'PL_B'])
  })

  it('met à jour une source existante sans la dupliquer', () => {
    const result = mergeSources([source()], [source({ url: 'https://nouveau' })])
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://nouveau')
  })

  it('distingue deux plateformes ayant le même playlistId', () => {
    const result = mergeSources([source()], [source({ platform: 'deezer' })])
    expect(result).toHaveLength(2)
  })

  it('traite playlistId null (titres likés) comme une source à part entière', () => {
    const result = mergeSources([source()], [source({ playlistId: null, playlistName: 'Titres likés' })])
    expect(result).toHaveLength(2)
  })
})

describe('mergeTrackDoc', () => {
  it('crée le document quand il n’existe pas', () => {
    expect(mergeTrackDoc(null, doc(), LATER)).toEqual(doc())
  })

  it('N’ÉCRASE JAMAIS la note ni les tags', () => {
    const existing = doc({ note: 'vu au Petit Bain', tags: ['à écouter'], _rev: '1-abc' })
    const merged = mergeTrackDoc(existing, doc({ title: 'Nouveau titre' }), LATER)
    expect(merged.note).toBe('vu au Petit Bain')
    expect(merged.tags).toEqual(['à écouter'])
    expect(merged.title).toBe('Nouveau titre')
  })

  it('conserve _rev et createdAt', () => {
    const existing = doc({ _rev: '1-abc' })
    const merged = mergeTrackDoc(existing, doc({ album: 'Autre album' }), LATER)
    expect(merged._rev).toBe('1-abc')
    expect(merged.createdAt).toBe(NOW)
    expect(merged.updatedAt).toBe(LATER)
  })

  it('fusionne les provenances', () => {
    const existing = doc({ _rev: '1-abc' })
    const incoming = doc({ sources: [source({ playlistId: 'PL_B', playlistName: 'VOYAGER' })] })
    expect(mergeTrackDoc(existing, incoming, LATER).sources).toHaveLength(2)
  })

  it('sort une entrée de l’état « en attente » quand l’import l’enrichit', () => {
    const existing = doc({ _rev: '1-abc', title: '', artist: '', matchKey: '', pending: true })
    const merged = mergeTrackDoc(existing, doc(), LATER)
    expect(merged.pending).toBe(false)
    expect(merged.title).toBe('Burning Down the House')
  })

  it('n’écrase pas un champ renseigné par une valeur vide', () => {
    const existing = doc({ _rev: '1-abc' })
    const merged = mergeTrackDoc(existing, doc({ title: '', artist: '' }), LATER)
    expect(merged.title).toBe('Burning Down the House')
    expect(merged.artist).toBe('Talking Heads')
  })

  it('est idempotent : rien ne change, l’objet existant est renvoyé tel quel', () => {
    const existing = doc({ _rev: '1-abc' })
    expect(mergeTrackDoc(existing, doc(), LATER)).toBe(existing)
  })

  it('rejouer deux fois le même import donne le même état', () => {
    const once = mergeTrackDoc(doc({ _rev: '1-abc' }), doc({ sources: [source({ playlistId: 'PL_B' })] }), LATER)
    const twice = mergeTrackDoc(once, doc({ sources: [source({ playlistId: 'PL_B' })] }), LATER)
    expect(twice).toEqual(once)
  })
})
