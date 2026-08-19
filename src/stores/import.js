import { defineStore } from 'pinia'
import { getDb } from '@/services/db.js'
import { ADAPTERS, toTrackDoc, fromYoutubeSearchResults } from '@/services/normalize.js'
import { mergeTrackDoc } from '@/services/merge.js'
import { useLibraryStore } from '@/stores/library.js'

// Petit helper d'accord : « 1 morceau » mais « 2 morceaux ».
const pluriel = (n, singulier, plurielMot = singulier + 's') =>
  `${n} ${n > 1 ? plurielMot : singulier}`

export class ImportError extends Error {
  constructor(message, { status = 0, url = '' } = {}) {
    super(message)
    this.name = 'ImportError'
    this.status = status
    this.url = url
  }
}

const base = () => String(import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/+$/, '')

/** Message unique, pour que l'écran des sources dise quoi faire plutôt que « erreur ». */
const NOT_CONFIGURED = "n8n n'est pas configuré : renseignez VITE_N8N_BASE_URL dans le fichier .env"

// Les workflows n8n n'ont pas été unifiés : c'est le seul endroit du client qui
// connaît leurs chemins. Voir docs/n8n/ pour les exports correspondants.
export const ENDPOINTS = {
  spotify: {
    playlists: () => `${base()}/getplaylist`,
    tracks: (playlistId) => `${base()}/playlist?id=${playlistId}`,
    // Contourne le cache JsonDatabase du workflow : un import lit l'état réel.
    liked: () => `${base()}/babines/liked?cache=false`,
    resolve: (id) => `${base()}/resolve/spotify?id=${id}`,
  },
  youtube: {
    playlists: () => `${base()}/youtube`,
    tracks: (playlistId) => `${base()}/youtube/items?playlistId=${playlistId}`,
    liked: null,
    resolve: (id) => `${base()}/resolve/youtube?id=${id}`,
    // Seuls chemins sortants du client : la recherche de candidats et l'ajout à
    // une playlist. Ils construisent leur chaîne de requête ici, comme tracks(),
    // pour que rien de la forme des URLs n8n ne fuite dans les composants.
    search: (query) => `${base()}/searchvideos?q=${encodeURIComponent(query)}`,
    addToPlaylist: (videoId, playlistId) =>
      `${base()}/addvideotoyoutube?id=${encodeURIComponent(videoId)}&playlistId=${encodeURIComponent(playlistId)}`,
  },
  deezer: {
    playlists: () => `${base()}/deezer/playlists`,
    tracks: (playlistId) => `${base()}/deezer/tracks?playlistId=${playlistId}`,
    liked: null,
    resolve: (id) => `${base()}/resolve/deezer?id=${id}`,
  },
}

async function fetchJson(url, { method = 'GET' } = {}) {
  let response
  try {
    // On branche sur l'appel, pas sur l'argument : `fetch(url, undefined)` passe
    // deux arguments, ce qu'une assertion `toHaveBeenCalledWith(url)` rejette.
    response = method === 'GET' ? await fetch(url) : await fetch(url, { method })
  } catch (err) {
    throw new ImportError(`Réseau indisponible (${err.message})`, { status: 0, url })
  }
  if (!response.ok) {
    throw new ImportError(`Réponse ${response.status} de n8n`, { status: response.status, url })
  }
  return response.json()
}

/**
 * Écrit une volée de morceaux en fusionnant avec l'existant.
 * Renvoie { written, created, updated, skipped, failed, received } — les
 * documents réellement écrits (dont ceux qui n'existaient pas encore et ceux à
 * qui ce passage n'a fait qu'ajouter une provenance), ceux que la fusion a
 * laissés intacts, et les échecs signalés par PouchDB. Compter les intentions plutôt que les écritures ferait mentir le
 * rapport d'import, ce que ce store existe précisément pour éviter. `skipped`
 * complète l'inverse : sans lui, un réimport sans nouveauté n'a que « 0 morceau
 * importé » à dire, ce qui se lit comme une panne alors que c'est le
 * dédoublonnage qui a fait son travail.
 */
async function writeTracks(rawTracks, source, now = new Date().toISOString()) {
  const received = rawTracks.length
  if (!received) return { written: 0, created: 0, updated: 0, skipped: 0, failed: [], received: 0 }
  const db = getDb()
  const adapt = ADAPTERS[source.platform].track
  const incoming = rawTracks.map((raw) => toTrackDoc(adapt(raw), source, now))

  const existing = await db.allDocs({ keys: incoming.map((d) => d._id), include_docs: true })
  const byId = new Map(existing.rows.filter((r) => r.doc).map((r) => [r.id, r.doc]))

  // Une playlist peut contenir deux fois le même morceau : on fusionne dans la
  // volée plutôt que d'envoyer deux documents de même _id, ce qui produirait un
  // conflit silencieux.
  const toWrite = new Map()
  for (const doc of incoming) {
    const target = toWrite.get(doc._id) || byId.get(doc._id) || null
    const merged = mergeTrackDoc(target, doc, now)
    if (merged !== byId.get(doc._id)) toWrite.set(doc._id, merged)
  }

  // Compté sur les identifiants distincts, pas sur les éléments reçus : une
  // playlist qui contient deux fois le même morceau n'en a pas deux « déjà à jour ».
  const skipped = new Set(incoming.map((d) => d._id)).size - toWrite.size

  if (toWrite.size === 0)
    return { written: 0, created: 0, updated: 0, skipped, failed: [], received }

  // Retenu avant l'écriture, quand `byId` dit encore ce qui existait ; départagé
  // après, sur les seuls identifiants que PouchDB a acceptés. Compter l'intention
  // annoncerait des créations qu'un conflit de révision a refusées.
  const nouveaux = new Set([...toWrite.keys()].filter((id) => !byId.has(id)))

  const results = await db.bulkDocs([...toWrite.values()])
  const ok = results.filter((r) => r.ok)
  const created = ok.filter((r) => nouveaux.has(r.id)).length
  return {
    written: ok.length,
    created,
    updated: ok.length - created,
    skipped,
    failed: results.filter((r) => r.error).map((r) => ({ id: r.id, reason: r.message || r.name })),
    received,
  }
}

/** Récupère et écrit les morceaux d'une playlist (ou des favoris). Renvoie { written, failed, received }. */
async function importPlaylistTracks(
  platform,
  { playlistId = null, playlistName = null, liked = false } = {},
) {
  const endpoints = ENDPOINTS[platform]
  const url = liked ? endpoints.liked() : endpoints.tracks(playlistId)
  const tracks = await fetchJson(url)
  return writeTracks(tracks, { platform, playlistId, playlistName })
}

/**
 * Complète un document « en attente » à partir de sa première provenance.
 * Renvoie le document écrit, ou null quand il n'y avait rien à faire.
 * Lève si l'appel réseau échoue : c'est à l'appelant de décider quoi en dire,
 * l'entrée restant alors en attente et intacte.
 * Les deux chemins de résolution — à l'enregistrement et au retour du réseau —
 * passent par ici pour qu'ils ne puissent pas diverger.
 */
async function resolveDoc(db, doc, now) {
  const source = doc.sources?.[0]
  if (!source || !ENDPOINTS[source.platform]) return null
  const raw = await fetchJson(ENDPOINTS[source.platform].resolve(source.externalId))
  const fresh = toTrackDoc(
    ADAPTERS[source.platform].track(raw),
    { platform: source.platform, playlistId: source.playlistId, playlistName: source.playlistName },
    now,
  )
  const merged = mergeTrackDoc(doc, fresh, now)
  if (merged === doc) return null
  await db.put(merged)
  return merged
}

export const useImportStore = defineStore('import', {
  state: () => ({
    jobs: [],
    running: false,
  }),

  actions: {
    startJob(platform, label) {
      const job = {
        id: `${platform}-${this.jobs.length + 1}`,
        platform,
        label,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        imported: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        status: 'running',
        message: '',
        httpStatus: null,
        truncated: [],
      }
      this.jobs.push(job)
      this.running = true
      return job
    },

    finishJob(job, patch) {
      Object.assign(job, patch, { finishedAt: new Date().toISOString() })
      this.running = this.jobs.some((j) => j.status === 'running')
    },

    async fetchPlaylists(platform) {
      const raw = await fetchJson(ENDPOINTS[platform].playlists())
      return raw.map(ADAPTERS[platform].playlist)
    },

    /**
     * Cherche des vidéos YouTube pour une requête « artiste titre ».
     * Lève plutôt que de renvoyer une liste vide en cas de panne : une recherche
     * qui échoue et une recherche sans résultat n'appellent pas le même message.
     */
    async searchVideos(query) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      const raw = await fetchJson(ENDPOINTS.youtube.search(query))
      return fromYoutubeSearchResults(raw)
    },

    /**
     * Dit si une vidéo est déjà dans une playlist, et sur combien d'éléments.
     *
     * `checked` n'est pas décoratif : le workflow getPlaylistVideo tronque (voir
     * le commentaire d'importPlatform plus bas). Renvoyer un booléen nu laisserait
     * l'écran affirmer « absente » sur la foi d'une liste incomplète.
     */
    async playlistContains(playlistId, videoId) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      const raw = await fetchJson(ENDPOINTS.youtube.tracks(playlistId))
      const items = Array.isArray(raw) ? raw : []
      // On passe par l'adaptateur existant : il tolère déjà les trois endroits où
      // le workflow peut poser l'identifiant, et le redire ici les ferait diverger.
      const ids = items.map((item) => ADAPTERS.youtube.track(item).externalId)
      return { found: ids.includes(videoId), checked: ids.length }
    },

    /**
     * Ajoute une vidéo à une playlist YouTube. Rien n'est écrit en base : ce flux
     * part d'une entrée et n'y revient pas.
     *
     * Tout passe par la chaîne de requête, sans corps : le workflow
     * addvideotoyoutube lit $json.query.id et $json.query.playlistId, et compose
     * lui-même le corps attendu par l'API YouTube.
     */
    async addVideoToPlaylist({ videoId, playlistId }) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      await fetchJson(ENDPOINTS.youtube.addToPlaylist(videoId, playlistId), { method: 'POST' })
    },

    async importPlaylist(platform, opts = {}) {
      return importPlaylistTracks(platform, opts)
    },

    /** Importe toutes les playlists d'une plateforme, plus les favoris si la plateforme en expose. */
    async importPlatform(platform) {
      const job = this.startJob(platform, `Import ${platform}`)

      if (!base()) {
        this.finishJob(job, { status: 'error', message: NOT_CONFIGURED, httpStatus: null })
        return job
      }

      const failures = []
      const truncated = []
      let imported = 0
      let created = 0
      let updated = 0
      let skipped = 0
      let writeFailures = 0

      let playlists
      try {
        playlists = await this.fetchPlaylists(platform)
      } catch (err) {
        this.finishJob(job, { status: 'error', message: err.message, httpStatus: err.status })
        return job
      }

      for (const playlist of playlists) {
        try {
          const result = await importPlaylistTracks(platform, {
            playlistId: playlist.id,
            playlistName: playlist.name,
          })
          imported += result.written
          created += result.created
          updated += result.updated
          skipped += result.skipped
          writeFailures += result.failed.length

          // La playlist annonce son total au moment de la liste (trackCount) ; on le
          // compare à ce qu'on a réellement reçu de n8n. La limite qui tronque n'est
          // pas ici : elle est dans le workflow n8n (ex. « limit: 20 » sur
          // SPOTIFY_Babines/playlistTracks). On ne fait que la rendre visible.
          // - trackCount absent (null/undefined) : rien à comparer, on ne signale rien.
          // - reçu >= annoncé : pas une troncature (l'annoncé peut être périmé).
          if (typeof playlist.trackCount === 'number' && result.received < playlist.trackCount) {
            truncated.push({
              playlistName: playlist.name,
              received: result.received,
              announced: playlist.trackCount,
            })
          }
        } catch (err) {
          failures.push(`${playlist.name} (${err.status})`)
        }
      }

      if (ENDPOINTS[platform].liked) {
        try {
          const result = await importPlaylistTracks(platform, {
            playlistName: 'Titres likés',
            liked: true,
          })
          imported += result.written
          created += result.created
          updated += result.updated
          skipped += result.skipped
          writeFailures += result.failed.length
        } catch (err) {
          failures.push(`Titres likés (${err.status})`)
        }
      }

      await useLibraryStore().load()

      const notes = []
      if (failures.length) notes.push(`échec sur : ${failures.join(', ')}`)
      if (writeFailures)
        notes.push(`${pluriel(writeFailures, 'échec', 'échecs')} d'écriture en base`)
      if (truncated.length) {
        notes.push(
          truncated
            .map(
              (t) =>
                `${t.playlistName} : ${t.received} ${pluriel(t.received, 'morceau', 'morceaux')} reçu${t.received > 1 ? 's' : ''} sur ${t.announced} annoncé${t.announced > 1 ? 's' : ''} — la source tronque, vérifiez la limite du workflow n8n`,
            )
            .join(' ; '),
        )
      }

      // Trois comptes plutôt qu'un : « importé » recouvrait aussi bien un morceau
      // découvert qu'un morceau déjà connu à qui l'import n'a ajouté qu'une
      // provenance. Aucun des trois ne rejoint `notes` : ce ne sont pas des
      // incidents, et les y mettre ferait passer en « partiel » un import qui
      // s'est parfaitement déroulé.
      const compte =
        [
          created ? pluriel(created, 'nouveau morceau', 'nouveaux morceaux') : null,
          updated ? `${updated} mis à jour` : null,
          skipped ? `${skipped} déjà à jour` : null,
        ]
          .filter(Boolean)
          .join(', ') || 'aucun morceau'
      this.finishJob(job, {
        imported,
        created,
        updated,
        skipped,
        failed: failures.length + writeFailures,
        truncated,
        status: notes.length ? 'partial' : 'ok',
        message: notes.length ? `${compte}, ${notes.join(', ')}` : compte,
      })
      return job
    },

    /** Complète les entrées capturées hors ligne. Renvoie le nombre résolu. */
    async resolvePending() {
      const db = getDb()
      const library = useLibraryStore()
      const all = await db.allDocs({ include_docs: true })
      const pending = all.rows.map((r) => r.doc).filter((d) => d && d.pending)

      if (pending.length && !base()) {
        const job = this.startJob('resolve', 'Résolution des entrées en attente')
        this.finishJob(job, { status: 'error', message: NOT_CONFIGURED, httpStatus: null })
        return 0
      }

      let resolved = 0
      let failures = 0
      let lastStatus = null
      const now = new Date().toISOString()

      for (const doc of pending) {
        try {
          if (await resolveDoc(db, doc, now)) resolved += 1
        } catch (err) {
          // L'entrée reste « en attente » : elle sera retentée au prochain retour du réseau.
          // Rien de ce que l'utilisateur a écrit n'est touché. Le silence est voulu ici,
          // par entrée — mais le silence global (aucune trace nulle part) ne l'est pas :
          // voir le job consigné ci-dessous quand des échecs se produisent.
          failures += 1
          lastStatus = err.status ?? 0
        }
      }

      if (resolved) await library.load()

      if (failures > 0) {
        const job = this.startJob('resolve', 'Résolution des entrées en attente')
        this.finishJob(job, {
          imported: resolved,
          failed: failures,
          status: resolved > 0 ? 'partial' : 'error',
          httpStatus: lastStatus,
          message: `${pluriel(resolved, 'entrée complétée', 'entrées complétées')}, ${failures} en échec`,
        })
      }

      return resolved
    },

    /**
     * Complète une seule entrée, juste après sa capture. Renvoie true si le
     * titre a bien été récupéré. Ne consigne pas de job : l'échec est rendu à
     * l'écran de capture, et l'entrée restée en attente sera retentée au
     * prochain retour du réseau par resolvePending.
     */
    async resolveOne(id) {
      if (!base()) return false
      const db = getDb()
      const library = useLibraryStore()

      let doc
      try {
        doc = await db.get(id)
      } catch {
        // Capture puis suppression immédiate : il n'y a plus rien à compléter.
        return false
      }
      if (!doc.pending) return false

      try {
        const merged = await resolveDoc(db, doc, new Date().toISOString())
        if (!merged) return false
        library.replaceLocal(merged)
        return true
      } catch {
        return false
      }
    },
  },
})
