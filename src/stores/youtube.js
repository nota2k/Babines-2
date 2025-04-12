import { defineStore } from 'pinia'

export const userYoutubeStore = defineStore('youtube', {
  state: () => ({
    playlists: [],
    currentPlaylist: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      try {
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube`
        );
        const data = await response.json();
        this.playlists = data;
        // loading = true
        return this.playlists; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching listes:', error)
      }
    },

    async fetchPlaylistById(playlistId) {
      try {
        const data = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube?id=${playlistId}`
        ).find(playlist => playlist.playlistId === playlistId);;
        this.playlists = data;
        return this.playlists; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
      }
    },

    async fetchAllVideoById(id) {

      try {
        const data = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube?id=${id}`
        );
        this.currentPlaylist = data;
        return this.currentPlaylist; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
      }
    }
  }
})
