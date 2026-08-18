import { describe, it, expect, beforeEach } from 'vitest'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import {
  createDb,
  ensureIndexes,
  classifyReplicationError,
  startReplication,
  resolveRemoteUrl,
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
    await db.put({
      _id: 'track:spotify:X1',
      type: 'track',
      artist: 'Talking Heads',
      matchKey: 'a::b',
    })
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
    expect(classifyReplicationError({ status: 0 }, false)).toBe('offline')
    expect(classifyReplicationError({ message: 'Failed to fetch' }, false)).toBe('offline')
    expect(classifyReplicationError({ name: 'TypeError', message: 'NetworkError' }, false)).toBe(
      'offline',
    )
  })

  it('range le reste dans « erreur »', () => {
    expect(classifyReplicationError({ status: 500 })).toBe('error')
  })

  it('range un échec réseau en hors-ligne quand le navigateur est hors ligne', () => {
    expect(classifyReplicationError({ message: 'Failed to fetch' }, false)).toBe('offline')
    expect(classifyReplicationError({ status: 0 }, false)).toBe('offline')
  })

  it('n’enterre pas un CORS cassé en hors-ligne quand le navigateur est en ligne', () => {
    expect(classifyReplicationError({ message: 'Failed to fetch' }, true)).toBe('error')
  })

  it('signale l’authentification quel que soit l’état du réseau', () => {
    expect(classifyReplicationError({ status: 401 }, false)).toBe('auth-error')
    expect(classifyReplicationError({ status: 403 }, true)).toBe('auth-error')
  })
})

describe('startReplication', () => {
  it('ne réplique pas et signale « local-only » quand aucune URL n’est configurée', () => {
    const statuses = []
    const handler = startReplication(db, {
      url: '',
      dbName: 'babines',
      onStatus: (s) => statuses.push(s),
    })
    expect(handler).toBeNull()
    expect(statuses).toEqual(['local-only'])
  })
})
describe('resolveRemoteUrl', () => {
  const ORIGINE = 'https://babines.test'

  it('rend absolue une URL relative, en la rattachant à l’origine', () => {
    expect(resolveRemoteUrl('/db', ORIGINE)).toBe('https://babines.test/db')
  })

  it('laisse intacte une URL déjà absolue', () => {
    expect(resolveRemoteUrl('https://ailleurs.test/db', ORIGINE)).toBe('https://ailleurs.test/db')
    expect(resolveRemoteUrl('http://ailleurs.test/db', ORIGINE)).toBe('http://ailleurs.test/db')
  })

  it('produit une URL que PouchDB traite comme distante, non comme une base locale', () => {
    // C'est l'assertion qui compte. PouchDB choisit son adaptateur d'apres la
    // forme du nom : un chemin relatif donne « leveldb », donc une base LOCALE,
    // et la replication devient un aller-retour entre deux bases du navigateur
    // sans que rien ne le signale.
    //
    // Le cas relatif n'est volontairement PAS instancie ici : l'adaptateur
    // leveldb tenterait de creer /db a la racine du systeme de fichiers et
    // ferait echouer le test par « OpenError: /db/babines/LOCK ».
    const distante = new PouchDB(`${resolveRemoteUrl('/db', ORIGINE)}/babines`)
    expect(distante.adapter).toBe('https')
  })
})
