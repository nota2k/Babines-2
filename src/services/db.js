import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'

PouchDB.plugin(PouchDBFind)

// Index volontairement limités aux champs scalaires : pouchdb-find n'indexe pas
// utilement les tableaux d'objets. Le filtrage par plateforme et par playlist se
// fait en mémoire dans le store library — la bibliothèque d'un utilisateur unique
// tient sans peine en mémoire.
const INDEXES = [
  { name: 'idx-type', fields: ['type'] },
  { name: 'idx-artist', fields: ['artist'] },
  { name: 'idx-matchKey', fields: ['matchKey'] },
  { name: 'idx-updatedAt', fields: ['updatedAt'] },
]

export function createDb(name, options = {}) {
  return new PouchDB(name, options)
}

export async function ensureIndexes(db) {
  for (const index of INDEXES) {
    await db.createIndex({ index })
  }
}

export function classifyReplicationError(err = {}) {
  if (err.status === 401 || err.status === 403) return 'auth-error'
  if (err.status === 0) return 'offline'
  const message = String(err.message || '')
  if (/failed to fetch|networkerror|network error|offline/i.test(message)) return 'offline'
  return 'error'
}

/**
 * Réplication bidirectionnelle et continue vers le CouchDB hébergé.
 * Le hors-ligne est un état normal, pas une erreur : c'est le mode de
 * fonctionnement prévu (§9 de la spec).
 */
export function startReplication(local, { url, dbName, onStatus = () => {} }) {
  if (!url) {
    onStatus('local-only')
    return null
  }
  const remote = new PouchDB(`${url.replace(/\/+$/, '')}/${dbName}`)
  return local
    .sync(remote, { live: true, retry: true })
    .on('change', () => onStatus('pending'))
    .on('paused', (err) => onStatus(err ? classifyReplicationError(err) : 'idle'))
    .on('active', () => onStatus('pending'))
    .on('denied', (err) => onStatus(classifyReplicationError(err)))
    .on('error', (err) => onStatus(classifyReplicationError(err)))
}

let instance = null

export function getDb() {
  if (!instance) {
    instance = createDb(import.meta.env.VITE_COUCHDB_DB || 'babines')
  }
  return instance
}

/** Injection d'une base en mémoire, réservée aux tests. */
export function setDb(db) {
  instance = db
}
