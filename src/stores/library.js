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
    platforms: (state) => uniqueSorted(state.entries.flatMap((e) => (e.sources || []).map((s) => s.platform))),
    tags: (state) => uniqueSorted(state.entries.flatMap((e) => e.tags || [])),
    pendingEntries: (state) => state.entries.filter((e) => e.pending),

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

      const result = await db.put(doc)
      const saved = { ...doc, _rev: result.rev }
      this.replaceLocal(saved)
      return saved
    },

    async updateEntry(id, patch, now = new Date().toISOString()) {
      const db = getDb()
      const current = await db.get(id)
      const next = { ...current, ...patch, updatedAt: now }
      const result = await db.put(next)
      const saved = { ...next, _rev: result.rev }
      this.replaceLocal(saved)
      return saved
    },

    async removeEntry(id) {
      const db = getDb()
      const doc = await db.get(id)
      await db.remove(doc)
      this.entries = this.entries.filter((e) => e._id !== id)
    },

    /** Fusion manuelle de deux entrées : rien n'est perdu, le doublon disparaît. */
    async mergeEntries(keepId, dropId, now = new Date().toISOString()) {
      const db = getDb()
      const keep = await db.get(keepId)
      const drop = await db.get(dropId)

      const notes = [keep.note, drop.note].map((n) => (n || '').trim()).filter(Boolean)
      const merged = {
        ...keep,
        title: keep.title || drop.title,
        artist: keep.artist || drop.artist,
        album: keep.album || drop.album,
        sources: mergeSources(keep.sources || [], drop.sources || []),
        tags: [...new Set([...(keep.tags || []), ...(drop.tags || [])])],
        note: notes.join('\n'),
        pending: keep.pending && drop.pending,
        updatedAt: now,
      }

      const result = await db.put(merged)
      await db.remove(drop)
      this.replaceLocal({ ...merged, _rev: result.rev })
      this.entries = this.entries.filter((e) => e._id !== dropId)
      return { ...merged, _rev: result.rev }
    },
  },
})
