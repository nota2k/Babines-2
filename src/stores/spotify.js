import { defineStore } from 'pinia'
import allPlaylistsData from '../data/allPlaylist.js'; // Import du fichier JSON
import likedTracksData from '../data/likedTracks.js'; // Import du fichier JSON

export const userSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    likedTracks: likedTracksData,
    tracksByPlaylist: [],
    currentPlaylist: [],
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

    async fetchPlaylistById(id) {
      if(!id) {
        return this.likedTracks;
      }
      try {
        const data = await allPlaylistsData.find(playlist => playlist.id === id);
        this.currentPlaylist = data;
        // console.log(this.currentPlaylist);
        return this.currentPlaylist; // Retourne les playlists
      } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
      }
    },

    async fetchTracksByPlaylist(id) {
      if(!id) {
        console.log(id)
        return this.likedTracks;
      }
      try {
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/playlist?id=${id}`
        );
        const data = await response.json();
        this.tracksByPlaylist = data;
        return this.tracksByPlaylist; // Retourne les morceaux de la playlist
      } catch (error) {
        console.error('Error fetching tracks by playlist:', error);
        return [];
      }
    }
  }
})
