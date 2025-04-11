import { defineStore } from 'pinia'
import allPlaylistsData from '@/data/allPlaylist.json'; // Import du fichier JSON
import likedTracksData from '@/data/likedTracks.json'; // Import du fichier JSON

export const userSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    likedTracks: [],
    tracksByPlaylist: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      try {
        this.playlists = allPlaylistsData
        // loading = true
      } catch (error) {
        console.error('Error fetching listes:', error)
      }
    },

    async fetchLikedTracks() {
      try {
        // const response = await fetch(`https://pantagruweb.club/tentacules/webhook/babines/liked`)
        // const data = await response.json()
        this.likedTracks = likedTracksData
        // loading = true
      } catch (error) {
        console.error('Error fetching playlist:', error)
      }
    },
    async fetchTracksByPlaylist(id) {
      // this.loading = true
      // this.error = null
      try {
        const response = await fetch(
          `https://pantagruweb.club/tentacules/webhook/b469b78f-40ba-437a-937d-48ba00985774?id=${id}`
        )
        const data = await response.json()
        this.tracksByPlaylist = data.tracks
        this.error = 'Error fetching tracks by playlist'
        console.error('Error fetching tracks by playlist:', error)
      } finally {
        // this.loading = false
      }
    }
  },

})
