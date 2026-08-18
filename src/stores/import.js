import { defineStore } from 'pinia'
import { getDb } from '@/services/db.js'
import { ADAPTERS, toTrackDoc } from '@/services/normalize.js'
import { mergeTrackDoc } from '@/services/merge.js'
import { useLibraryStore } from '@/stores/library.js'

export class ImportError extends Error {
  constructor(message, { status = 0, url = '' } = {}) {
    super(message)
    this.name = 'ImportError'
    this.status = status
    this.url = url
  }
}

const base = () => String(import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/+$/, '')

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
  },
  deezer: {
    playlists: () => `${base()}/deezer/playlists`,
    tracks: (playlistId) => `${base()}/deezer/tracks?playlistId=${playlistId}`,
    liked: null,
    resolve: (id) => `${base()}/resolve/deezer?id=${id}`,
  },
}

async function fetchJson(url) {
  let response
  try {
    response = await fetch(url)
  } catch (err) {
    throw new ImportError(`Réseau indisponible (${err.message})`, { status: 0, url })
  }
  if (!response.ok) {
    throw new ImportError(`Réponse ${response.status} de n8n`, { status: response.status, url })
  }
  return response.json()
}

/** Écrit une volée de morceaux en fusionnant avec l'existant. Renvoie le nombre traité. */
async function writeTracks(rawTracks, source, now = new Date().toISOString()) {
  if (!rawTracks.length) return 0
  const db = getDb()
  const adapt = ADAPTERS[source.platform].track
  const incoming = rawTracks.map((raw) => toTrackDoc(adapt(raw), source, now))

  const existing = await db.allDocs({ keys: incoming.map((d) => d._id), include_docs: true })
  const byId = new Map(existing.rows.filter((r) => r.doc).map((r) => [r.id, r.doc]))

  const toWrite = []
  for (const doc of incoming) {
    const merged = mergeTrackDoc(byId.get(doc._id) || null, doc, now)
    if (merged !== byId.get(doc._id)) toWrite.push(merged)
  }

  if (toWrite.length) await db.bulkDocs(toWrite)
  return incoming.length
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
        failed: 0,
        status: 'running',
        message: '',
        httpStatus: null,
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

    async importPlaylist(platform, { playlistId = null, playlistName = null, liked = false } = {}) {
      const endpoints = ENDPOINTS[platform]
      const url = liked ? endpoints.liked() : endpoints.tracks(playlistId)
      const tracks = await fetchJson(url)
      return writeTracks(tracks, { platform, playlistId, playlistName })
    },

    /** Importe toutes les playlists d'une plateforme, plus les favoris si la plateforme en expose. */
    async importPlatform(platform) {
      const job = this.startJob(platform, `Import ${platform}`)
      const failures = []
      let imported = 0

      let playlists
      try {
        playlists = await this.fetchPlaylists(platform)
      } catch (err) {
        this.finishJob(job, { status: 'error', message: err.message, httpStatus: err.status })
        return job
      }

      for (const playlist of playlists) {
        try {
          imported += await this.importPlaylist(platform, {
            playlistId: playlist.id,
            playlistName: playlist.name,
          })
        } catch (err) {
          failures.push(`${playlist.name} (${err.status})`)
        }
      }

      if (ENDPOINTS[platform].liked) {
        try {
          imported += await this.importPlaylist(platform, { playlistName: 'Titres likés', liked: true })
        } catch (err) {
          failures.push(`Titres likés (${err.status})`)
        }
      }

      await useLibraryStore().load()

      this.finishJob(job, {
        imported,
        failed: failures.length,
        status: failures.length ? 'partial' : 'ok',
        message: failures.length
          ? `${imported} morceaux importés, échec sur : ${failures.join(', ')}`
          : `${imported} morceaux importés`,
      })
      return job
    },

    /** Complète les entrées capturées hors ligne. Renvoie le nombre résolu. */
    async resolvePending() {
      const db = getDb()
      const library = useLibraryStore()
      const all = await db.allDocs({ include_docs: true })
      const pending = all.rows.map((r) => r.doc).filter((d) => d && d.pending)

      let resolved = 0
      const now = new Date().toISOString()

      for (const doc of pending) {
        const source = doc.sources?.[0]
        if (!source || !ENDPOINTS[source.platform]) continue
        try {
          const raw = await fetchJson(ENDPOINTS[source.platform].resolve(source.externalId))
          const fresh = toTrackDoc(
            ADAPTERS[source.platform].track(raw),
            { platform: source.platform, playlistId: source.playlistId, playlistName: source.playlistName },
            now,
          )
          const merged = mergeTrackDoc(doc, fresh, now)
          if (merged !== doc) {
            await db.put(merged)
            resolved += 1
          }
        } catch {
          // L'entrée reste « en attente » : elle sera retentée au prochain retour du réseau.
          // Rien de ce que l'utilisateur a écrit n'est touché.
        }
      }

      if (resolved) await library.load()
      return resolved
    },
  },
})
