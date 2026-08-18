// Correspondance entre l'identifiant de plateforme stocké en base
// (`source.platform`) et le libellé affiché à l'écran. Centralisé ici pour
// que le sélecteur de la colonne des playlists et, plus tard, les pastilles
// de plateforme de EntryRow.vue, parlent le même langage sans dupliquer la
// correspondance — une duplication finit toujours par diverger.

export const PLATFORM_LABELS = {
  spotify: 'Spawtify',
  youtube: 'Youtruffe',
  deezer: 'Deezer',
}

/** Libellé affiché pour une plateforme ; renvoie la valeur brute si inconnue. */
export function platformLabel(platform) {
  return PLATFORM_LABELS[platform] || platform
}
