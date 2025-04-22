// src/stores/couchdb.js
import { defineStore } from 'pinia';
import db from '@/services/db.js';

export const useCouchDBStore = defineStore('couchdb', {
  state: () => ({
    documents: [],
    isLoading: false,
    error: null,
    currentDocument: null
  }),

  getters: {
    // Obtenir les documents triés par artiste
    sortedByArtist: (state) => {
      return [...state.documents].sort((a, b) => {
        return a.artist?.localeCompare(b.artist || '');
      });
    },

    // Obtenir la liste des artistes uniques
    uniqueArtists: (state) => {
      const artists = new Set();
      state.documents.forEach(doc => {
        if (doc.artist) artists.add(doc.artist);
      });
      return Array.from(artists).sort();
    },

    // Obtenir la liste des playlists uniques
    uniquePlaylists: (state) => {
      const playlists = new Set();
      state.documents.forEach(doc => {
        if (doc.playlist?.name) playlists.add(doc.playlist.name);
      });
      return Array.from(playlists).sort();
    }
  },

  actions: {
    // Récupérer tous les documents
    async fetchAllDocuments() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await db.allDocs({
          include_docs: true
        });

        this.documents = result.rows.map(row => row.doc);
        return this.documents;
      } catch (err) {
        console.error('Erreur lors de la récupération des documents:', err);
        this.error = err.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    // Récupérer un document par son ID
    async fetchDocumentById(id) {
      if (!id) return null;

      this.isLoading = true;
      this.error = null;

      try {
        const doc = await db.get(id);
        this.currentDocument = doc;
        return doc;
      } catch (err) {
        console.error(`Erreur lors de la récupération du document ${id}:`, err);
        this.error = err.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    // Récupérer des documents par artiste
    async fetchDocumentsByArtist(artist) {
      if (!artist) return this.fetchAllDocuments();

      this.isLoading = true;
      this.error = null;

      try {
        // Utiliser find() avec l'index sur artist
        const result = await db.find({
          selector: {
            artist: { $regex: new RegExp(artist, 'i') } // Recherche insensible à la casse
          }
        });

        this.documents = result.docs;
        return this.documents;
      } catch (err) {
        console.error(`Erreur lors de la recherche par artiste ${artist}:`, err);
        this.error = err.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    // Récupérer des documents par playlist
    async fetchDocumentsByPlaylist(playlistName) {
      if (!playlistName) return this.fetchAllDocuments();

      this.isLoading = true;
      this.error = null;

      try {
        const result = await db.find({
          selector: {
            'playlist.name': playlistName
          }
        });

        this.documents = result.docs;
        return this.documents;
      } catch (err) {
        console.error(`Erreur lors de la recherche par playlist ${playlistName}:`, err);
        this.error = err.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    // Supprimer un document
    async deleteDocument(id) {
      try {
        const doc = await db.get(id);
        await db.remove(doc);
        // Mettre à jour la liste locale
        this.documents = this.documents.filter(doc => doc._id !== id);
        return true;
      } catch (err) {
        console.error(`Erreur lors de la suppression du document ${id}:`, err);
        this.error = err.message;
        return false;
      }
    },

    // Mettre à jour un document
    async updateDocument(doc) {
      if (!doc || !doc._id) {
        this.error = 'Document invalide';
        return false;
      }

      try {
        // Récupérer la dernière version pour avoir le _rev correct
        const currentDoc = await db.get(doc._id);

        // Fusionner les changements avec la dernière version
        const updatedDoc = {
          ...currentDoc,
          ...doc,
          _rev: currentDoc._rev // Garder la révision actuelle
        };

        const result = await db.put(updatedDoc);

        // Mettre à jour dans la liste locale
        const index = this.documents.findIndex(d => d._id === doc._id);
        if (index !== -1) {
          this.documents[index] = {
            ...updatedDoc,
            _rev: result.rev // Mettre à jour avec la nouvelle révision
          };
        }

        return true;
      } catch (err) {
        console.error(`Erreur lors de la mise à jour du document ${doc._id}:`, err);
        this.error = err.message;
        return false;
      }
    },

    // Effacer les filtres et réinitialiser l'état
    clearFilters() {
      this.fetchAllDocuments();
    }
  }
});
