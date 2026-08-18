const sourceKey = (s) => `${s.platform}::${s.playlistId ?? ''}`

/**
 * Fusionne les provenances par couple (platform, playlistId).
 * L'ordre existant est préservé ; les nouvelles sources sont ajoutées à la fin.
 */
export function mergeSources(existing = [], incoming = []) {
  const merged = [...existing]
  const index = new Map(merged.map((s, i) => [sourceKey(s), i]))
  for (const source of incoming) {
    const key = sourceKey(source)
    if (index.has(key)) merged[index.get(key)] = { ...merged[index.get(key)], ...source }
    else {
      index.set(key, merged.length)
      merged.push(source)
    }
  }
  return merged
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Règle non négociable : un réimport met à jour les métadonnées de la plateforme
 * et fusionne les provenances, mais ne touche JAMAIS `note` ni `tags`.
 * Si rien ne change, l'objet existant est renvoyé tel quel — pas de révision inutile.
 */
export function mergeTrackDoc(existing, incoming, now = new Date().toISOString()) {
  if (!existing) return incoming

  const sources = mergeSources(existing.sources, incoming.sources)
  const next = {
    ...existing,
    title: incoming.title || existing.title,
    artist: incoming.artist || existing.artist,
    album: incoming.album || existing.album,
    matchKey: incoming.matchKey || existing.matchKey,
    pending: incoming.pending === false ? false : existing.pending,
    sources,
    note: existing.note,
    tags: existing.tags,
    createdAt: existing.createdAt,
    updatedAt: now,
  }

  const unchanged =
    next.title === existing.title &&
    next.artist === existing.artist &&
    next.album === existing.album &&
    next.matchKey === existing.matchKey &&
    next.pending === existing.pending &&
    same(next.sources, existing.sources)

  return unchanged ? existing : next
}
