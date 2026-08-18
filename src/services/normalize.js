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
