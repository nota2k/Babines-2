import { defineStore } from 'pinia'
import { getDb } from '@/services/db.js'
import { parseShareUrl, toPendingTrackDoc, toArtistDoc } from '@/services/normalize.js'
import { mergeSources } from '@/services/merge.js'

export function displayTitle(entry) {
  if (!entry) return ''
  if (entry.type === 'artist') return entry.name || ''
  if (entry.title) return entry.title
  return entry.sources?.[0]?.url || ''
}

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export const useLibraryStore = defineStore('library', {
  state: () => ({
    entries: [],
    isLoading: false,
    error: null,
    // Canal séparé de `error` : un avertissement (ex. migration partielle) ne
    // doit pas être effacé par la première action réussie, ni prendre la place
    // d'une vraie panne.
    notice: null,
    query: '',
    platform: '',
    playlist: '',
    tag: '',
    entryType: '',
    sortBy: 'updatedAt',
    sortAsc: false,
    syncStatus: 'local-only',
  }),

  getters: {
    filtered(state) {
      const q = state.query.trim().toLowerCase()
      const list = state.entries.filter((entry) => {
        if (state.entryType && entry.type !== state.entryType) return false
        if (state.platform && !(entry.sources || []).some((s) => s.platform === state.platform)) return false
        if (state.playlist && !(entry.sources || []).some((s) => s.playlistName === state.playlist)) return false
        if (state.tag && !(entry.tags || []).includes(state.tag)) return false
        if (q) {
          const haystack = [entry.title, entry.artist, entry.name, entry.album, entry.note]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })

      const direction = state.sortAsc ? 1 : -1
      const value = (entry) =>
        state.sortBy === 'title' ? displayTitle(entry) : String(entry[state.sortBy] || '')
      return [...list].sort((a, b) => value(a).localeCompare(value(b)) * direction)
    },

    playlists: (state) => uniqueSorted(state.entries.flatMap((e) => (e.sources || []).map((s) => s.playlistName))),

    /**
     * Décompte d'entrées par playlist, pour la colonne de navigation. Une
     * entrée présente deux fois dans la même playlist via deux provenances
     * différentes ne doit compter qu'une fois.
     */
    playlistCounts(state) {
      const counts = {}
      for (const entry of state.entries) {
        const names = new Set((entry.sources || []).map((s) => s.playlistName).filter(Boolean))
        for (const name of names) counts[name] = (counts[name] || 0) + 1
      }
      return counts
    },
    platforms: (state) => uniqueSorted(state.entries.flatMap((e) => (e.sources || []).map((s) => s.platform))),
    tags: (state) => uniqueSorted(state.entries.flatMap((e) => e.tags || [])),
    pendingEntries: (state) => state.entries.filter((e) => e.pending),

    syncLabel: (state) =>
      ({
        idle: 'à jour',
        pending: 'synchronisation…',
        offline: 'hors ligne',
        'auth-error': 'erreur d’authentification',
        error: 'erreur de synchronisation',
        'local-only': 'local uniquement',
      })[state.syncStatus] || state.syncStatus,

    /**
     * Doublons *probables*, regroupés par matchKey. Rien n'est fusionné
     * automatiquement : la décision reste manuelle (décision 7 de la spec).
     */
    duplicateGroups(state) {
      const groups = new Map()
      for (const entry of state.entries) {
        if (!entry.matchKey) continue
        const key = `${entry.type}:${entry.matchKey}`
        groups.set(key, [...(groups.get(key) || []), entry])
      }
      return [...groups.values()].filter((group) => group.length > 1)
    },
  },

  actions: {
    async load() {
      // Un second appel pendant qu'une lecture est en vol rejoindrait le premier
      // et ferait retomber isLoading trop tôt : on renvoie ce qu'on a déjà.
      if (this.isLoading) return this.entries
      this.isLoading = true
      this.error = null
      try {
        const result = await getDb().allDocs({ include_docs: true })
        this.entries = result.rows
          .map((row) => row.doc)
          .filter((doc) => doc && !doc._id.startsWith('_design/'))
      } catch (err) {
        this.error = `Impossible de lire la bibliothèque : ${err.message}`
        throw err
      } finally {
        this.isLoading = false
      }
    },

    replaceLocal(doc) {
      const index = this.entries.findIndex((e) => e._id === doc._id)
      if (index === -1) this.entries.push(doc)
      else this.entries[index] = doc
    },

    /**
     * Exécute une écriture en surfaçant l'échec dans l'état du store avant de le
     * relancer. Une erreur silencieuse est le défaut qui a rendu une panne
     * invisible pendant quatorze mois dans la version précédente.
     */
    async guard(label, run) {
      try {
        const resultat = await run()
        // Une action réussie efface le message précédent : une erreur périmée
        // affichée sous une action qui vient de marcher est aussi trompeuse
        // qu'une panne muette.
        this.error = null
        return resultat
      } catch (err) {
        this.error = `${label} : ${err.message}`
        throw err
      }
    },

    /** Capture rapide : un lien devient un morceau en attente, du texte un artiste. */
    async capture(input, now = new Date().toISOString()) {
      const text = String(input || '').trim()
      if (!text) return null

      const parsed = parseShareUrl(text)
      const doc = parsed ? toPendingTrackDoc(parsed, now) : toArtistDoc(text, now)

      const db = getDb()
      try {
        const existing = await db.get(doc._id)
        return existing
      } catch (err) {
        if (err.status !== 404) {
          this.error = `Impossible d'enregistrer la saisie : ${err.message}`
          throw err
        }
      }

      const result = await this.guard(`Impossible d’enregistrer « ${text} »`, () => db.put(doc))
      const saved = { ...doc, _rev: result.rev }
      this.replaceLocal(saved)
      return saved
    },

    async updateEntry(id, patch, now = new Date().toISOString()) {
      const db = getDb()
      return this.guard('Enregistrement impossible', async () => {
        const current = await db.get(id)
        const next = { ...current, ...patch, updatedAt: now }
        const result = await db.put(next)
        const saved = { ...next, _rev: result.rev }
        this.replaceLocal(saved)
        return saved
      })
    },

    async removeEntry(id) {
      const db = getDb()
      return this.guard('Suppression impossible', async () => {
        const doc = await db.get(id)
        await db.remove(doc)
        this.entries = this.entries.filter((e) => e._id !== id)
      })
    },

    /** Fusion manuelle de deux entrées : rien n'est perdu, le doublon disparaît. */
    async mergeEntries(keepId, dropId, now = new Date().toISOString()) {
      const db = getDb()

      const { saved, drop } = await this.guard('Fusion impossible', async () => {
        const keep = await db.get(keepId)
        const drop = await db.get(dropId)

        const notes = [keep.note, drop.note]
          .map((n) => (n || '').trim())
          .filter(Boolean)
        // Une fusion peut être reprise si la suppression du doublon a échoué :
        // sans dédoublonnage, la note déjà absorbée serait réécrite à chaque essai.
        const noteFusionnee = [...new Set(notes)].join('\n')
        const merged = {
          ...keep,
          title: keep.title || drop.title,
          artist: keep.artist || drop.artist,
          album: keep.album || drop.album,
          sources: mergeSources(keep.sources || [], drop.sources || []),
          tags: [...new Set([...(keep.tags || []), ...(drop.tags || [])])],
          note: noteFusionnee,
          pending: keep.pending && drop.pending,
          updatedAt: now,
        }

        const result = await db.put(merged)
        return { saved: { ...merged, _rev: result.rev }, drop }
      })

      // La fusion est persistée : on la reflète immédiatement, quoi qu'il advienne
      // de la suppression du doublon.
      this.replaceLocal(saved)

      try {
        await db.remove(drop)
        this.entries = this.entries.filter((e) => e._id !== dropId)
      } catch (err) {
        // Rien n'est perdu : le doublon survit et reste refusionnable.
        this.error = `Fusion enregistrée, mais le doublon n’a pas pu être supprimé : ${err.message}`
      }

      return saved
    },
  },
})
