import { defineStore } from 'pinia'
import allPlaylistsData from '../data/allPlaylist.js' // Import du fichier JSON
import likedTracksData from '../data/likedTracks.js' // Import du fichier JSON
import {
  savePlaylistToDB,
  savePlaylistTracksToDB,
  getPlaylistsFromDB,
  getPlaylistFromDB,
  checkPlaylistNeedsSync,
  saveLikedTracksToDB,
  getLikedTracksFromDB,
  getLastLikedTrackSync,
  createSyncLog,
  updateSyncLog
} from '../services/api.js'

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
    /**
     * Récupérer toutes les playlists
     * 1. Essaie de charger depuis MySQL
     * 2. Si vide, synchronise depuis n8n et sauvegarde en MySQL
     */
    async fetchAllPlaylists() {
      try {
        this.loading = true

        // 1. Essayer de charger depuis MySQL
        const playlistsFromDB = await getPlaylistsFromDB()

        if (playlistsFromDB && playlistsFromDB.length > 0) {
          console.log(`📊 ${playlistsFromDB.length} playlists chargées depuis MySQL`)
          this.playlists = playlistsFromDB
          this.loading = false
          return playlistsFromDB
        }

        // 2. Si aucune donnée en BDD, synchroniser depuis n8n
        console.log('🔄 Synchronisation depuis n8n...')
        const response = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
        const data = await response.json()
        this.playlists = data

        // 3. Sauvegarder dans MySQL pour la prochaine fois
        console.log('💾 Sauvegarde des playlists dans MySQL...')
        for (const playlist of data) {
          try {
            await savePlaylistToDB(playlist)
          } catch (error) {
            console.warn(`⚠️ Erreur sauvegarde playlist ${playlist.name}:`, error)
          }
        }
        console.log(`✅ ${data.length} playlists sauvegardées`)

        this.loading = false
        return data
      } catch (error) {
        console.error('Error fetching playlists:', error)
        this.error = error.message
        this.loading = false
        return []
      }
    },

    /**
     * Synchroniser manuellement depuis n8n
     * Force la mise à jour depuis l'API
     */
    async syncPlaylistsFromAPI() {
      try {
        this.loading = true
        console.log('🔄 Synchronisation forcée depuis n8n...')

        const response = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
        const data = await response.json()
        this.playlists = data

        // Sauvegarder dans MySQL
        console.log('💾 Sauvegarde dans MySQL...')
        for (const playlist of data) {
          try {
            await savePlaylistToDB(playlist)
          } catch (error) {
            console.warn(`⚠️ Erreur sauvegarde:`, error)
          }
        }

        console.log(`✅ ${data.length} playlists synchronisées`)
        this.loading = false
        return data
      } catch (error) {
        console.error('Error syncing playlists:', error)
        this.error = error.message
        this.loading = false
        throw error
      }
    },

    /**
     * Récupérer une playlist par ID
     */
    async fetchPlaylistById(id) {
      if (!id) {
        return this.likedTracks
      }
      try {
        // Essayer de charger depuis MySQL
        const playlistFromDB = await getPlaylistFromDB(id)

        if (playlistFromDB) {
          console.log(`📊 Playlist "${playlistFromDB.name}" chargée depuis MySQL`)
          this.currentPlaylist = playlistFromDB
          return playlistFromDB
        }

        // Sinon, chercher dans les données locales
        const data = await allPlaylistsData.find(playlist => playlist.id === id)
        this.currentPlaylist = data
        return this.currentPlaylist
      } catch (error) {
        console.error('Error fetching playlist:', error)
        return null
      }
    },

    /**
     * Récupérer les tracks d'une playlist avec synchronisation intelligente
     * 1. Charge depuis MySQL
     * 2. Vérifie le snapshot_id pour détecter les changements
     * 3. Re-synchronise uniquement si nécessaire
     */
    async fetchTracksByPlaylist(id) {
      if (!id) {
        console.log('Pas d\'ID fourni, retour des liked tracks')
        return this.likedTracks
      }

      try {
        // 1. Essayer de charger depuis MySQL
        const playlistFromDB = await getPlaylistFromDB(id)

        if (playlistFromDB && playlistFromDB.tracks && playlistFromDB.tracks.length > 0) {
          console.log(`📊 ${playlistFromDB.tracks.length} tracks chargés depuis MySQL`)
          this.tracksByPlaylist = playlistFromDB.tracks

          // Vérifier en arrière-plan si la playlist a changé (via snapshot_id)
          this.checkAndSyncPlaylistIfNeeded(id)

          return playlistFromDB.tracks
        }

        // 2. Si aucune donnée en BDD, synchroniser depuis n8n
        console.log('🔄 Première synchronisation des tracks depuis n8n...')

        // D'abord, récupérer les infos de la playlist
        let playlistInfo = null
        try {
          const playlistsResponse = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
          const allPlaylists = await playlistsResponse.json()
          playlistInfo = allPlaylists.find(p => p.id === id)

          // Sauvegarder les infos de la playlist si trouvées
          if (playlistInfo) {
            console.log(`📝 Sauvegarde des infos de la playlist "${playlistInfo.name}"`)
            await savePlaylistToDB(playlistInfo)
          }
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer les infos de la playlist:', error)
        }

        // Ensuite, récupérer les tracks
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/playlist?id=${id}`
        )
        const data = await response.json()
        this.tracksByPlaylist = data
        console.log('data', data);

        // 3. Sauvegarder dans MySQL avec les infos de la playlist
        try {
          console.log('💾 Sauvegarde des tracks dans MySQL...')
          const result = await savePlaylistTracksToDB(id, data, playlistInfo)
          console.log(`✅ ${result.saved} tracks sauvegardés`)
        } catch (error) {
          console.warn('⚠️ Erreur sauvegarde tracks:', error)
        }

        return this.tracksByPlaylist
      } catch (error) {
        console.error('Error fetching tracks by playlist:', error)
        return []
      }
    },

    /**
     * Vérifier si une playlist a besoin d'être re-synchronisée (via snapshot_id)
     * Compare le snapshot_id de la BDD avec celui de n8n
     */
    async checkAndSyncPlaylistIfNeeded(playlistId) {
      try {
        // Récupérer les infos actuelles de la playlist depuis n8n (metadata uniquement)
        const response = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
        const allPlaylists = await response.json()

        // Trouver la playlist dans la liste
        const currentPlaylist = allPlaylists.find(p => p.id === playlistId)

        if (!currentPlaylist) {
          console.log('⚠️ Playlist non trouvée dans n8n')
          return
        }

        // Vérifier si le snapshot_id a changé
        const needsSync = await checkPlaylistNeedsSync(playlistId, currentPlaylist.snapshot_id)

        if (!needsSync.needs_sync) {
          console.log('✨ Playlist à jour (snapshot_id identique)')
          return
        }

        console.log('🔄 Playlist modifiée, re-synchronisation...')
        console.log(`   Ancien snapshot: ${needsSync.db_snapshot_id}`)
        console.log(`   Nouveau snapshot: ${needsSync.current_snapshot_id}`)

        // Créer un log de synchronisation
        const syncLog = await createSyncLog('playlist_tracks', 'in_progress', 0, null, {
          playlist_id: playlistId,
          old_snapshot: needsSync.db_snapshot_id,
          new_snapshot: needsSync.current_snapshot_id
        })

        try {
          // Re-synchroniser les tracks depuis n8n
          const tracksResponse = await fetch(
            `https://tentacules.pantagruweb.club/webhook/playlist?id=${playlistId}`
          )
          const tracks = await tracksResponse.json()

          // Sauvegarder dans MySQL (écrase les anciens) avec les infos de la playlist
          const result = await savePlaylistTracksToDB(playlistId, tracks, currentPlaylist)
          console.log(`✅ ${result.saved} tracks mis à jour`)

          // Mettre à jour le snapshot_id de la playlist
          await savePlaylistToDB({
            ...currentPlaylist,
            snapshot_id: currentPlaylist.snapshot_id
          })

          // Mettre à jour le log
          await updateSyncLog(syncLog.id, 'success', result.saved, null, {
            playlist_id: playlistId,
            tracks_updated: result.saved,
            new_snapshot: needsSync.current_snapshot_id
          })

          // Recharger les tracks dans le store
          const updatedPlaylist = await getPlaylistFromDB(playlistId)
          if (updatedPlaylist && updatedPlaylist.tracks) {
            this.tracksByPlaylist = updatedPlaylist.tracks
          }

        } catch (error) {
          console.error('❌ Erreur sync playlist:', error)
          await updateSyncLog(syncLog.id, 'error', 0, error.message)
        }

      } catch (error) {
        console.error('Error checking playlist sync:', error)
      }
    },

    /**
     * Synchroniser manuellement les tracks d'une playlist depuis n8n
     */
    async syncTracksFromAPI(id) {
      try {
        console.log('🔄 Synchronisation forcée des tracks depuis n8n...')

        // Récupérer les infos de la playlist
        let playlistInfo = null
        try {
          const playlistsResponse = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
          const allPlaylists = await playlistsResponse.json()
          playlistInfo = allPlaylists.find(p => p.id === id)
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer les infos de la playlist:', error)
        }

        // Récupérer les tracks
        const response = await fetch(
          `https://tentacules.pantagruweb.club/webhook/playlist?id=${id}`
        )
        const data = await response.json()
        this.tracksByPlaylist = data

        // Sauvegarder dans MySQL avec les infos de la playlist
        console.log('💾 Sauvegarde dans MySQL...')
        const result = await savePlaylistTracksToDB(id, data, playlistInfo)
        console.log(`✅ ${result.saved} tracks synchronisés`)

        return data
      } catch (error) {
        console.error('Error syncing tracks:', error)
        throw error
      }
    },

    /**
     * Récupérer les liked tracks avec synchronisation incrémentielle
     * 1. Charge depuis MySQL
     * 2. Vérifie s'il y a de nouveaux tracks depuis n8n
     * 3. Sauvegarde uniquement les nouveaux tracks
     */
    async fetchLikedTracks() {
      try {
        this.loading = true

        // 1. Essayer de charger depuis MySQL
        const likedFromDB = await getLikedTracksFromDB('default_user')

        if (likedFromDB && likedFromDB.length > 0) {
          console.log(`📊 ${likedFromDB.length} liked tracks chargés depuis MySQL`)
          this.likedTracks = likedFromDB

          // Synchronisation incrémentielle en arrière-plan
          this.syncNewLikedTracks()

          this.loading = false
          return likedFromDB
        }

        // 2. Si aucune donnée en BDD, synchroniser tout depuis n8n
        console.log('🔄 Première synchronisation des liked tracks depuis n8n...')
        const response = await fetch('https://tentacules.pantagruweb.club/webhook/likedtracks')
        const data = await response.json()
        this.likedTracks = data

        // 3. Sauvegarder dans MySQL pour la prochaine fois
        console.log('💾 Sauvegarde des liked tracks dans MySQL...')
        try {
          const result = await saveLikedTracksToDB('default_user', data, false)
          console.log(`✅ ${result.saved} liked tracks sauvegardés`)
        } catch (error) {
          console.warn('⚠️ Erreur sauvegarde liked tracks:', error)
        }

        this.loading = false
        return data
      } catch (error) {
        console.error('Error fetching liked tracks:', error)
        this.error = error.message
        this.loading = false
        return this.likedTracks
      }
    },

    /**
     * Synchroniser uniquement les nouveaux liked tracks (incrémentiel)
     * Récupère uniquement les tracks ajoutés depuis le dernier sync
     */
    async syncNewLikedTracks() {
      try {
        console.log('🔍 Vérification des nouveaux liked tracks...')

        // Récupérer le dernier added_at depuis la BDD
        const lastSync = await getLastLikedTrackSync('default_user')

        if (!lastSync.has_data) {
          console.log('ℹ️ Pas de données en BDD, sync complète nécessaire')
          return await this.syncLikedTracksFromAPI()
        }

        // Créer un log de synchronisation
        const syncLog = await createSyncLog('liked_tracks', 'in_progress')

        try {
          // Récupérer tous les liked tracks depuis n8n
          const response = await fetch('https://tentacules.pantagruweb.club/webhook/likedtracks')
          const data = await response.json()

          // Filtrer uniquement les nouveaux (après le dernier added_at)
          const lastAddedAt = new Date(lastSync.last_added_at)
          const newTracks = data.filter(item => {
            const trackAddedAt = new Date(item.track?.added_at || item.added_at)
            return trackAddedAt > lastAddedAt
          })

          if (newTracks.length === 0) {
            console.log('✨ Aucun nouveau liked track')
            await updateSyncLog(syncLog.id, 'success', 0, null, {
              message: 'Aucun nouveau track',
              last_sync: lastSync.last_added_at
            })
            return
          }

          console.log(`🆕 ${newTracks.length} nouveaux liked tracks trouvés`)

          // Sauvegarder uniquement les nouveaux tracks
          const result = await saveLikedTracksToDB('default_user', newTracks, true)
          console.log(`✅ ${result.saved} nouveaux tracks sauvegardés`)

          // Mettre à jour le log
          await updateSyncLog(syncLog.id, 'success', result.saved, null, {
            new_tracks: newTracks.length,
            saved: result.saved,
            skipped: result.skipped,
            duplicates: result.duplicates
          })

          // Recharger les liked tracks depuis la BDD
          const updatedTracks = await getLikedTracksFromDB('default_user')
          this.likedTracks = updatedTracks

        } catch (error) {
          console.error('❌ Erreur sync incrémentiel:', error)
          await updateSyncLog(syncLog.id, 'error', 0, error.message)
          throw error
        }

      } catch (error) {
        console.error('Error syncing new liked tracks:', error)
      }
    },

    /**
     * Sauvegarder les liked tracks dans MySQL
     */
    async saveLikedTracks(userSpotifyId, likedTracksData, incremental = false) {
      try {
        console.log('💾 Sauvegarde des liked tracks dans MySQL...')
        const result = await saveLikedTracksToDB(userSpotifyId, likedTracksData, incremental)
        console.log(`✅ ${result.saved} liked tracks sauvegardés`)
        return result
      } catch (error) {
        console.error('Error saving liked tracks:', error)
        throw error
      }
    },

    /**
     * Synchroniser les liked tracks depuis n8n (force la mise à jour complète)
     * Remplace toutes les données existantes
     */
    async syncLikedTracksFromAPI() {
      try {
        this.loading = true
        console.log('🔄 Synchronisation forcée complète des liked tracks depuis n8n...')

        // Créer un log de synchronisation
        const syncLog = await createSyncLog('liked_tracks_full', 'in_progress')

        try {
          // Récupérer les données fraîches depuis n8n
          const response = await fetch('https://tentacules.pantagruweb.club/webhook/likedtracks')
          const data = await response.json()
          this.likedTracks = data

          // Sauvegarder dans MySQL (pas incrémentiel)
          console.log('💾 Sauvegarde complète dans MySQL...')
          const result = await this.saveLikedTracks('default_user', data, false)
          console.log(`✅ ${result.saved} liked tracks synchronisés`)

          // Mettre à jour le log
          await updateSyncLog(syncLog.id, 'success', result.saved, null, {
            total: data.length,
            saved: result.saved,
            duplicates: result.duplicates
          })

          this.loading = false
          return data
        } catch (error) {
          await updateSyncLog(syncLog.id, 'error', 0, error.message)
          throw error
        }
      } catch (error) {
        console.error('Error syncing liked tracks:', error)
        this.error = error.message
        this.loading = false
        throw error
      }
    }
  }
})
