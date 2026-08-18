import { describe, it, expect, beforeEach } from 'vitest'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import { createDb } from '@/services/db.js'
import { migrateLegacyDoc, migrateAll } from '@/services/migrate.js'

PouchDB.plugin(memoryAdapter)

const NOW = '2026-08-18T14:00:00Z'

const legacyFlat = {
  _id: '2VNfJpwdEQBLyXajaa6LWT',
  _rev: '1-abc',
  track_id: '2VNfJpwdEQBLyXajaa6LWT',
  title: 'Burning Down the House',
  artist: 'Talking Heads',
  album: 'Survival',
  added_at: '2025-04-07T14:34:51Z',
  playlist: { id: 'PL_A', name: 'BAT BEAT', href: 'https://api.spotify.com/v1/playlists/PL_A' },
  last_updated: '2025-04-08T10:00:00Z',
}

const legacyNested = {
  _id: 'f1e2d3c4',
  _rev: '1-def',
  track: {
    title: 'Rhythm Method',
    artist: 'Pulsallama',
    url: 'https://example.org/rhythm',
    created_at: '2025-05-01T08:00:00Z',
  },
}

describe('migrateLegacyDoc', () => {
  it('préfixe l’identifiant et transforme playlist en sources[]', () => {
    const doc = migrateLegacyDoc(legacyFlat, NOW)
    expect(doc._id).toBe('track:spotify:2VNfJpwdEQBLyXajaa6LWT')
    expect(doc.type).toBe('track')
    expect(doc.matchKey).toBe('talking heads::burning down the house')
    expect(doc.sources).toEqual([
      {
        platform: 'spotify',
        playlistId: 'PL_A',
        playlistName: 'BAT BEAT',
        externalId: '2VNfJpwdEQBLyXajaa6LWT',
        addedAt: '2025-04-07T14:34:51Z',
        url: null,
        rawTitle: null,
      },
    ])
    expect(doc.note).toBe('')
    expect(doc.tags).toEqual([])
    expect(doc._rev).toBeUndefined()
  })

  it('aplatit une entrée manuelle imbriquée, aujourd’hui invisible', () => {
    const doc = migrateLegacyDoc(legacyNested, NOW)
    expect(doc._id).toBe('track:manual:f1e2d3c4')
    expect(doc.title).toBe('Rhythm Method')
    expect(doc.artist).toBe('Pulsallama')
    expect(doc.sources[0]).toMatchObject({ platform: 'manual', url: 'https://example.org/rhythm' })
    expect(doc.createdAt).toBe('2025-05-01T08:00:00Z')
  })

  it('ignore un document déjà migré', () => {
    expect(migrateLegacyDoc({ _id: 'track:spotify:X', type: 'track' }, NOW)).toBeNull()
  })

  it('ignore les documents de conception', () => {
    expect(migrateLegacyDoc({ _id: '_design/idx' }, NOW)).toBeNull()
  })
})

describe('migrateAll', () => {
  let db
  let counter = 0

  beforeEach(async () => {
    db = createDb(`migrate-db-${counter++}`, { adapter: 'memory' })
    await db.put({ ...legacyFlat, _rev: undefined })
    await db.put({ ...legacyNested, _rev: undefined })
  })

  it('réécrit tous les documents et supprime les anciens', async () => {
    const report = await migrateAll(db, NOW)
    expect(report).toEqual({ migrated: 2, deleted: 2, skipped: 0 })

    const all = await db.allDocs({ include_docs: true })
    const ids = all.rows.map((r) => r.id).sort()
    expect(ids).toEqual(['track:manual:f1e2d3c4', 'track:spotify:2VNfJpwdEQBLyXajaa6LWT'])
  })

  it('est rejouable : une seconde exécution ne fait rien', async () => {
    await migrateAll(db, NOW)
    const report = await migrateAll(db, NOW)
    expect(report).toEqual({ migrated: 0, deleted: 0, skipped: 2 })
  })

  it('fusionne deux anciens documents visant le même identifiant', async () => {
    const other = createDb(`migrate-dup-${counter++}`, { adapter: 'memory' })
    await other.put({ ...legacyFlat, _id: '2VNfJpwdEQBLyXajaa6LWT', _rev: undefined })
    await other.put({
      ...legacyFlat,
      _id: 'doublon-ancien',
      _rev: undefined,
      playlist: { id: 'PL_B', name: 'VOYAGER' },
    })
    await migrateAll(other, NOW)
    const doc = await other.get('track:spotify:2VNfJpwdEQBLyXajaa6LWT')
    expect(doc.sources).toHaveLength(2)
  })
})
