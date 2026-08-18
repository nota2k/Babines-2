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

const SOURCE_FIELDS = ['platform', 'playlistId', 'playlistName', 'externalId', 'addedAt', 'url', 'rawTitle']

const sameSource = (a, b) => SOURCE_FIELDS.every((field) => (a[field] ?? null) === (b[field] ?? null))

// Comparaison structurelle plutôt que textuelle : deux sources logiquement identiques
// sérialisées dans un ordre de clés différent ne doivent pas passer pour un changement,
// sans quoi un réimport fabriquerait une révision CouchDB pour rien.
const sameSources = (a, b) => a.length === b.length && a.every((source, i) => sameSource(source, b[i]))

/**
 * Règle non négociable : un réimport met à jour les métadonnées de la plateforme
 * et fusionne les provenances, mais ne touche JAMAIS `note` ni `tags`.
 * Si rien ne change, l'objet existant est renvoyé tel quel — pas de révision inutile.
 */
export function mergeTrackDoc(existing, incoming, now = new Date().toISOString()) {
  // Document neuf : il conserve les dates que toTrackDoc lui a déjà posées à la
  // construction ; `now` ne concerne que la mise à jour d'un document existant.
  if (!existing) return incoming

  const sources = mergeSources(existing.sources, incoming.sources)
  // Une correction manuelle depuis /entree/:id est marquée par titleEditedAt
  // (posé par EntryDetail.vue). splitYoutubeTitle redonne systématiquement le
  // même mauvais découpage à partir du même rawTitle : sans cette protection,
  // un réimport effacerait la correction de l'utilisatrice à chaque fois, sans
  // trace. `album` n'est pas concerné : l'écran de détail ne permet pas de le
  // corriger, donc rien ne protège ce champ d'un réimport.
  const titleProtege = Boolean(existing.titleEditedAt)
  const next = {
    ...existing,
    title: titleProtege ? existing.title : incoming.title || existing.title,
    artist: titleProtege ? existing.artist : incoming.artist || existing.artist,
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
    sameSources(next.sources, existing.sources)

  return unchanged ? existing : next
}
