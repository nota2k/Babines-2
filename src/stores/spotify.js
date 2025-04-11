import { defineStore } from 'pinia'
import allPlaylistsData from '@/data/allPlaylist.json'; // Import du fichier JSON

export const userSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    // likedTracks: [],
    // tracksByPlaylist: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      try {
        this.playlists = allPlaylistsData
      } catch (error) {
        console.error('Error fetching listes:', error)
      }
    }
    }

    // const getPlaylistById = (id) => {
    //   const currentPlaylist = playlists.value.find(playlist => playlist.id === id)
    //   if (playlist) {
    //     currentPlaylist.value = playlist
    //   } else {
    //     console.error(`Playlist with id ${id} not found`)
    //   }
    // }

    // return { playlists, loading, error, fetchAllPlaylists, getPlaylistById }

  })
