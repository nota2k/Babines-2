import { describe, it, expect, beforeEach } from 'vitest'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import {
  createDb,
  ensureIndexes,
  classifyReplicationError,
  startReplication,
} from '@/services/db.js'

PouchDB.plugin(memoryAdapter)

let db
let counter = 0

beforeEach(() => {
  db = createDb(`test-db-${counter++}`, { adapter: 'memory' })
})

describe('ensureIndexes', () => {
  it('crée les index nécessaires à la recherche', async () => {
    await ensureIndexes(db)
    const { indexes } = await db.getIndexes()
    const names = indexes.map((i) => i.name)
    expect(names).toContain('idx-type')
    expect(names).toContain('idx-artist')
    expect(names).toContain('idx-matchKey')
  })

  it('rend db.find() utilisable — ce qui n’était pas le cas avant', async () => {
    await ensureIndexes(db)
    await db.put({ _id: 'track:spotify:X1', type: 'track', artist: 'Talking Heads', matchKey: 'a::b' })
    const result = await db.find({ selector: { type: 'track' } })
    expect(result.docs).toHaveLength(1)
  })

  it('est rejouable sans erreur', async () => {
    await ensureIndexes(db)
    await expect(ensureIndexes(db)).resolves.toBeUndefined()
  })
})

describe('classifyReplicationError', () => {
  it('distingue une erreur d’authentification', () => {
    expect(classifyReplicationError({ status: 401 })).toBe('auth-error')
    expect(classifyReplicationError({ status: 403 })).toBe('auth-error')
  })

  it('reconnaît une absence de réseau', () => {
    expect(classifyReplicationError({ status: 0 })).toBe('offline')
    expect(classifyReplicationError({ message: 'Failed to fetch' })).toBe('offline')
    expect(classifyReplicationError({ name: 'TypeError', message: 'NetworkError' })).toBe('offline')
  })

  it('range le reste dans « erreur »', () => {
    expect(classifyReplicationError({ status: 500 })).toBe('error')
  })
})

describe('startReplication', () => {
  it('ne réplique pas et signale « local-only » quand aucune URL n’est configurée', () => {
    const statuses = []
    const handler = startReplication(db, { url: '', dbName: 'babines', onStatus: (s) => statuses.push(s) })
    expect(handler).toBeNull()
    expect(statuses).toEqual(['local-only'])
  })
})
