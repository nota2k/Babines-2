import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import {
  createDb,
  ensureIndexes,
  classifyReplicationError,
  startReplication,
  stopReplication,
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

// Le handle réel (local.sync(...)) est simulé : il ne faut pas qu'un test
// déclenche une vraie tentative réseau vers un hôte inexistant.
function fauxHandleSync() {
  const handlers = {}
  const handle = {
    on(event, cb) {
      handlers[event] = cb
      return handle
    },
    cancel: vi.fn(),
    emettre(event, ...args) {
      handlers[event]?.(...args)
    },
  }
  return handle
}

describe('startReplication — une seule réplication à la fois', () => {
  afterEach(() => {
    // Le handle actif vit dans un singleton du module : sans ce nettoyage,
    // un test laisserait un cancel() en attente pour le suivant.
    stopReplication()
  })

  it('annule la réplication précédente avant d’en démarrer une nouvelle', () => {
    const handleA = fauxHandleSync()
    const handleB = fauxHandleSync()
    const local = { sync: vi.fn().mockReturnValueOnce(handleA).mockReturnValueOnce(handleB) }

    startReplication(local, { url: 'https://exemple.test', dbName: 'babines' })
    expect(handleA.cancel).not.toHaveBeenCalled()

    startReplication(local, { url: 'https://exemple.test', dbName: 'babines' })
    expect(handleA.cancel).toHaveBeenCalledTimes(1)
    expect(handleB.cancel).not.toHaveBeenCalled()
  })

  it('stopReplication annule le handle en cours et est rejouable sans erreur', () => {
    const handle = fauxHandleSync()
    const local = { sync: vi.fn().mockReturnValue(handle) }

    startReplication(local, { url: 'https://exemple.test', dbName: 'babines' })
    stopReplication()
    expect(handle.cancel).toHaveBeenCalledTimes(1)

    expect(() => stopReplication()).not.toThrow()
    expect(handle.cancel).toHaveBeenCalledTimes(1)
  })

  it('arrête la réplication elle-même quand le statut devient une erreur d’authentification', () => {
    const handle = fauxHandleSync()
    const local = { sync: vi.fn().mockReturnValue(handle) }
    const statuts = []

    startReplication(local, {
      url: 'https://exemple.test',
      dbName: 'babines',
      onStatus: (s) => statuts.push(s),
    })

    handle.emettre('error', { status: 401 })

    expect(statuts).toEqual(['auth-error'])
    expect(handle.cancel).toHaveBeenCalledTimes(1)
  })

  it('une reconnexion après un 401 ne laisse jamais deux réplications actives', () => {
    const handleA = fauxHandleSync()
    const handleB = fauxHandleSync()
    const local = { sync: vi.fn().mockReturnValueOnce(handleA).mockReturnValueOnce(handleB) }

    startReplication(local, { url: 'https://exemple.test', dbName: 'babines' })
    handleA.emettre('error', { status: 401 })
    expect(handleA.cancel).toHaveBeenCalledTimes(1)

    // Reconnexion : un deuxième appel ne doit pas retenter d'annuler le
    // premier handle une seconde fois (déjà arrêté par le 401 lui-même).
    startReplication(local, { url: 'https://exemple.test', dbName: 'babines' })
    expect(handleA.cancel).toHaveBeenCalledTimes(1)
    expect(handleB.cancel).not.toHaveBeenCalled()
  })
})
