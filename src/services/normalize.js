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

const URL_PATTERNS = [
  { platform: 'spotify', re: /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})(?![A-Za-z0-9])/ },
  { platform: 'spotify', re: /^spotify:track:([A-Za-z0-9]{22})$/ },
  { platform: 'deezer', re: /deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/ },
  { platform: 'youtube', re: /youtube\.com\/watch\?(?:[^\s]*&)?v=([A-Za-z0-9_-]{11})/ },
  { platform: 'youtube', re: /youtu\.be\/([A-Za-z0-9_-]{11})/ },
]

/**
 * Extrait plateforme et identifiant d'un lien collé ou partagé.
 * Lecture pure de la chaîne : fonctionne en mode avion.
 */
export function parseShareUrl(input = '') {
  const url = String(input).trim()
  if (!url) return null
  for (const { platform, re } of URL_PATTERNS) {
    const match = url.match(re)
    if (match) return { platform, externalId: match[1], url }
  }
  return null
}

/** Entrée créée à la capture, enrichie plus tard par GET /resolve. */
export function toPendingTrackDoc(parsed, now = new Date().toISOString()) {
  return {
    _id: `track:${parsed.platform}:${parsed.externalId}`,
    type: 'track',
    title: '',
    artist: '',
    album: '',
    matchKey: '',
    pending: true,
    sources: [
      {
        platform: parsed.platform,
        playlistId: null,
        playlistName: null,
        externalId: parsed.externalId,
        addedAt: now,
        url: parsed.url,
        rawTitle: null,
      },
    ],
    note: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function toArtistDoc(name, now = new Date().toISOString(), id = crypto.randomUUID()) {
  return {
    _id: `artist:${id}`,
    type: 'artist',
    name: String(name).trim(),
    matchKey: matchKey(name),
    pending: false,
    sources: [],
    note: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
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

// ---------------------------------------------------------------------------
// Adaptateurs : forme réellement émise par chaque workflow n8n → forme unique
// consommée par toTrackDoc. Les workflows ne sont pas réécrits ; c'est ici que
// vivent leurs particularités, parce que c'est ici que des tests les couvrent.
// Formes d'entrée relevées sur les exports versionnés dans docs/n8n/.
// ---------------------------------------------------------------------------

export function fromSpotifyPlaylist(raw) {
  return {
    id: raw.id,
    name: raw.name || '',
    description: raw.description || '',
    trackCount: raw.tracks?.total ?? null,
    url: raw.id ? `https://open.spotify.com/playlist/${raw.id}` : null,
  }
}

export function fromSpotifyTrack(raw) {
  const track = raw.track && typeof raw.track === 'object' ? raw.track : raw
  const externalId = track.track_id || track.id || null
  return {
    externalId,
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    addedAt: track.added_at || null,
    url: externalId ? `https://open.spotify.com/track/${externalId}` : null,
  }
}

export function fromYoutubePlaylist(raw) {
  const id = raw.id || raw.playlistId || null
  return {
    id,
    name: raw.snippet?.title ?? raw.name ?? '',
    description: raw.snippet?.description ?? raw.description ?? '',
    trackCount: raw.contentDetails?.itemCount ?? raw.trackCount ?? null,
    url: id ? `https://www.youtube.com/playlist?list=${id}` : null,
  }
}

export function fromYoutubeItem(raw) {
  const externalId = raw.videoId || raw.contentDetails?.videoId || null
  return {
    externalId,
    // Le titre reste brut : c'est splitYoutubeTitle, dans toTrackDoc, qui en
    // extrait artiste et titre, et qui conserve l'original dans rawTitle.
    title: raw.title || raw.snippet?.title || '',
    artist: '',
    album: '',
    addedAt: raw.addedAt || raw.snippet?.publishedAt || null,
    url: externalId ? `https://www.youtube.com/watch?v=${externalId}` : null,
  }
}

// Deezer n'existe pas encore côté n8n : sa forme de sortie est définie plate et
// propre (tâche 0), donc l'adaptateur est un passe-plat qui complète l'URL.
export function fromDeezerPlaylist(raw) {
  return {
    id: raw.id,
    name: raw.name || '',
    description: raw.description || '',
    trackCount: raw.trackCount ?? null,
    url: raw.url || (raw.id ? `https://www.deezer.com/playlist/${raw.id}` : null),
  }
}

export function fromDeezerTrack(raw) {
  return {
    externalId: raw.externalId,
    title: raw.title || '',
    artist: raw.artist || '',
    album: raw.album || '',
    addedAt: raw.addedAt || null,
    url: raw.url || (raw.externalId ? `https://www.deezer.com/track/${raw.externalId}` : null),
  }
}

export const ADAPTERS = {
  spotify: { playlist: fromSpotifyPlaylist, track: fromSpotifyTrack },
  youtube: { playlist: fromYoutubePlaylist, track: fromYoutubeItem },
  deezer: { playlist: fromDeezerPlaylist, track: fromDeezerTrack },
}
