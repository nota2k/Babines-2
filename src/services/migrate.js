import { matchKey } from './normalize.js'
import { mergeTrackDoc } from './merge.js'

/**
 * Traduit un document de l'ancien schéma vers le nouveau.
 * Renvoie null si le document est déjà migré, technique, ou inexploitable.
 */
export function migrateLegacyDoc(doc, now = new Date().toISOString()) {
  if (!doc || doc._id.startsWith('_design/') || doc.type) return null

  if (doc.track && typeof doc.track === 'object') {
    const { title = '', artist = '', url = null, created_at = null } = doc.track
    return {
      _id: `track:manual:${doc._id}`,
      type: 'track',
      title,
      artist,
      album: '',
      matchKey: matchKey(artist, title),
      pending: false,
      sources: [
        {
          platform: 'manual',
          playlistId: null,
          playlistName: null,
          externalId: null,
          addedAt: created_at,
          url,
          rawTitle: null,
        },
      ],
      note: '',
      tags: [],
      createdAt: created_at || now,
      updatedAt: now,
    }
  }

  const externalId = doc.track_id || doc._id
  if (!doc.title && !doc.artist) return null

  return {
    _id: `track:spotify:${externalId}`,
    type: 'track',
    title: doc.title || '',
    artist: doc.artist || '',
    album: doc.album || '',
    matchKey: matchKey(doc.artist, doc.title),
    pending: false,
    sources: [
      {
        platform: 'spotify',
        playlistId: doc.playlist?.id ?? null,
        playlistName: doc.playlist?.name ?? null,
        externalId,
        addedAt: doc.added_at || null,
        url: null,
        rawTitle: null,
      },
    ],
    note: '',
    tags: [],
    createdAt: doc.added_at || now,
    updatedAt: now,
  }
}

/**
 * Passe une fois sur toute la base. Rejouable sans dommage :
 * les documents déjà au nouveau format sont ignorés.
 */
export async function migrateAll(db, now = new Date().toISOString()) {
  const all = await db.allDocs({ include_docs: true })
  const existing = new Map()
  const legacy = []
  let skipped = 0

  for (const row of all.rows) {
    const doc = row.doc
    if (!doc || doc._id.startsWith('_design/')) continue
    if (doc.type) {
      existing.set(doc._id, doc)
      skipped += 1
      continue
    }
    legacy.push(doc)
  }

  const toWrite = new Map()
  // On retient le lien entre chaque ancien document et son remplaçant : c'est ce
  // lien qui permet de ne supprimer que les originaux effectivement remplacés.
  const replacements = []
  let ignored = 0

  for (const doc of legacy) {
    const migrated = migrateLegacyDoc(doc, now)
    if (!migrated) {
      ignored += 1
      continue
    }
    const target = toWrite.get(migrated._id) || existing.get(migrated._id) || null
    toWrite.set(migrated._id, mergeTrackDoc(target, migrated, now))
    replacements.push({ legacy: { _id: doc._id, _rev: doc._rev }, targetId: migrated._id })
  }

  if (toWrite.size === 0) return { migrated: 0, deleted: 0, skipped, ignored, failed: [] }

  // Écrire d'abord, supprimer ensuite : un original n'est effacé qu'une fois son
  // remplaçant confirmé en base. bulkDocs ne s'arrête pas au premier échec et
  // renvoie un résultat par document — c'est ce tableau qui fait foi.
  const writeResults = await db.bulkDocs([...toWrite.values()])
  const failedTargets = new Set(writeResults.filter((r) => r.error).map((r) => r.id))

  const safeDeletions = replacements
    .filter((r) => !failedTargets.has(r.targetId))
    .map((r) => ({ ...r.legacy, _deleted: true }))

  // Un échec de suppression est bénin : l'original survit et la prochaine
  // exécution le rattrapera, en le fusionnant avec sa cible déjà migrée.
  const deleteResults = safeDeletions.length ? await db.bulkDocs(safeDeletions) : []

  const failed = [
    ...writeResults.filter((r) => r.error).map((r) => ({ id: r.id, stage: 'write', reason: r.message || r.name })),
    ...deleteResults.filter((r) => r.error).map((r) => ({ id: r.id, stage: 'delete', reason: r.message || r.name })),
  ]

  return {
    migrated: writeResults.filter((r) => r.ok).length,
    deleted: deleteResults.filter((r) => r.ok).length,
    skipped,
    ignored,
    failed,
  }
}
