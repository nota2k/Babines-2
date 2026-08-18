// Fragments d'expression régulière décrivant les mentions parasites d'un titre.
const NOISE_PATTERNS = [
  'remaster(?:ed)?',
  'live',
  'official\\s+(?:music\\s+)?(?:video|audio)',
  'lyrics?(?:\\s+video)?',
  'clip\\s+officiel',
  'audio',
  'video',
  'hd',
  'hq',
  'radio\\s+edit',
  'single\\s+version',
  'album\\s+version',
  'mono',
  'stereo',
  'deluxe',
  'bonus\\s+track',
  'feat\\.?',
  'ft\\.?',
  'featuring',
]

const NOISE_RE = new RegExp(`^(?:${NOISE_PATTERNS.join('|')})(?![a-zA-Z])`, 'i')

function isNoise(text) {
  return NOISE_RE.test(String(text).trim())
}

/**
 * Retire d'un titre les mentions qui ne l'identifient pas :
 * parenthèses parasites, suffixes de remaster ou de live, mentions « feat. ».
 * Ce qui n'est pas reconnu comme parasite est conservé tel quel.
 */
export function stripNoise(text = '') {
  let out = String(text)
  out = out.replace(/\s*[([]([^)\]]*)[)\]]/g, (match, inner) => (isNoise(inner) ? '' : match))
  out = out.replace(/\s+[-–—]\s+(.*)$/, (match, tail) => (isNoise(tail) ? '' : match))
  out = out.replace(/\s*\b(?:feat\.?|ft\.?|featuring)\b.*$/i, '')
  return out.trim()
}

function canonical(value) {
  return stripNoise(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Clé normalisée servant uniquement à *suggérer* des doublons.
 * Elle ne fusionne jamais rien automatiquement (décision 7 de la spec).
 */
export function matchKey(artist = '', title = '') {
  const a = canonical(artist)
  const t = canonical(title)
  return t ? `${a}::${t}` : a
}

/**
 * Une vidéo n'est pas un morceau : son titre est du texte libre.
 * Heuristique volontairement simple, faillible et assumée (§6.5 de la spec) —
 * le titre brut est toujours conservé dans la source pour correction manuelle.
 */
export function splitYoutubeTitle(rawTitle = '') {
  const text = String(rawTitle).trim()
  const match = text.match(/^(.+?)\s+[-–—]\s+(.+)$/)
  if (!match) return { artist: '', title: stripNoise(text) }
  return { artist: match[1].trim(), title: stripNoise(match[2]) }
}

/**
 * Traduit un élément renvoyé par n8n vers le document unique de Babines.
 * C'est le seul endroit où vivent les particularités de chaque plateforme.
 */
export function toTrackDoc(raw, source, now = new Date().toISOString()) {
  const isYoutube = source.platform === 'youtube'
  const parsed = isYoutube
    ? splitYoutubeTitle(raw.title)
    : { artist: raw.artist || '', title: raw.title || '' }

  return {
    _id: `track:${source.platform}:${raw.externalId}`,
    type: 'track',
    title: parsed.title,
    artist: parsed.artist,
    album: raw.album || '',
    matchKey: matchKey(parsed.artist, parsed.title),
    pending: false,
    sources: [
      {
        platform: source.platform,
        playlistId: source.playlistId ?? null,
        playlistName: source.playlistName ?? null,
        externalId: raw.externalId,
        addedAt: raw.addedAt || null,
        url: raw.url || null,
        rawTitle: isYoutube ? raw.title : null,
      },
    ],
    note: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}
