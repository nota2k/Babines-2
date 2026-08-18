export const EXPORT_VERSION = 1

/**
 * `_rev` est un numéro de révision CouchDB, dénué de sens hors de Babines.
 * `_id` devient `id` : il porte la plateforme et l'identifiant d'origine,
 * et rendrait un import de fichier possible si la décision 5 était révisée.
 */
export function toExportEntry(doc) {
  const { _id, _rev, ...rest } = doc
  return { id: _id, ...rest }
}

export function buildExport(entries, scope = 'library', exportedAt = new Date().toISOString()) {
  const exported = entries.map(toExportEntry)
  const tracks = exported.filter((e) => e.type === 'track')
  const artists = exported.filter((e) => e.type === 'artist')
  // Tout ce qui n'entre dans aucune catégorie connue est conservé ici plutôt que
  // perdu : la migration laisse volontairement en base les anciens documents
  // qu'elle ne sait pas classer, et un export censé contenir toute la musique ne
  // doit pas les faire disparaître en silence.
  const others = exported.filter((e) => e.type !== 'track' && e.type !== 'artist')

  return { version: EXPORT_VERSION, exportedAt, scope, tracks, artists, others }
}

/** Décrit la portée de l'export à partir des filtres actifs, pour le champ `scope`. */
export function exportScope({ query = '', platform = '', playlist = '', tag = '', entryType = '' } = {}) {
  const parts = []
  if (playlist) parts.push(`playlist:${playlist}`)
  if (platform) parts.push(`plateforme:${platform}`)
  if (tag) parts.push(`tag:${tag}`)
  if (entryType) parts.push(`type:${entryType}`)
  if (query.trim()) parts.push(`recherche:${query.trim()}`)
  return parts.length ? parts.join('+') : 'library'
}

const slug = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function exportFilename(scope = 'library', exportedAt = new Date().toISOString()) {
  const day = exportedAt.slice(0, 10)
  if (!scope || scope === 'library') return `babines-${day}.json`
  return `babines-${day}-${slug(scope)}.json`
}

/**
 * Sur téléphone, `<a download>` est capricieux dans une PWA iOS :
 * on passe par le partage système quand il est disponible.
 */
export async function shareOrDownload(payload, filename) {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
