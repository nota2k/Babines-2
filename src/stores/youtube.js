import { defineStore } from 'pinia'

export const userYoutubeStore = defineStore('youtube', {
  state: () => ({
    playlists: [],
    currentPlaylist: [],
    videosByPlaylist: [],
    // loading: false,
    // error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      try {
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube`
        );
        const data = await response.json();
        this.playlists = data;
        // console.log('Playlists:', data)
        return this.playlists; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching listes:', error)
      }
    },

    async fetchPlaylistById(playlistId) {
      try {
        const data = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube?playlistId=${playlistId}`
        ).find(playlist => playlist.playlistId === playlistId);;
        this.playlists = data;
        return this.playlists; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
      }
    },

    async fetchVideosByPlaylist(playlistId) {
      if (!playlistId) {
        return
      }
      try {
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/youtube/items?playlistId=${playlistId}`
        );
        const data = await response.json();
        // console.log(data);
        this.playlists = data;
        return this.playlists; // Retourne les données après traitement JSON
      } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
      }
    }

  }
})
