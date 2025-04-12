import { defineStore } from 'pinia'

export const userYoutubeStore = defineStore('youtube', {
  state: () => ({
    playlists: [],
    currentPlaylist: [],
    videos: [],
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

    async fetchVideosByPlaylist(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube?id=${id}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        this.videos = data;
        return data; // Retourne les données après traitement JSON
      } catch (error) {
        console.error('Error fetching videos:', error);
        this.error = error.message;
        return [];
      } finally {
        this.loading = false;
      }
    }
  }
})
