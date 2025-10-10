/**
 * Service API pour communiquer avec le backend MySQL
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Sauvegarder une playlist dans la BDD
 */
export async function savePlaylistToDB(playlist) {
  try {
    const response = await fetch(`${API_URL}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(playlist)
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde de la playlist')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur savePlaylistToDB:', error)
    throw error
  }
}

/**
 * Sauvegarder les tracks d'une playlist dans la BDD
 * @param {string} playlistSpotifyId - ID Spotify de la playlist (ex: "37i9dQZF1DXcBWIGoYBM5M")
 * @param {Array} tracks - Array de tracks depuis n8n
 * @param {Object} playlistInfo - (Optionnel) Infos de la playlist pour la créer si elle n'existe pas
 */
export async function savePlaylistTracksToDB(playlistSpotifyId, tracks, playlistInfo = null) {
  try {
    const body = { items: tracks }

    // Si on a les infos de la playlist, les inclure
    if (playlistInfo) {
      body.playlist_info = playlistInfo
    }

    const response = await fetch(`${API_URL}/playlists/${playlistSpotifyId}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde des tracks')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur savePlaylistTracksToDB:', error)
    throw error
  }
}

/**
 * Vérifier si une playlist a besoin d'être synchronisée (via snapshot_id)
 * @param {string} playlistSpotifyId - ID Spotify de la playlist
 * @param {string} currentSnapshotId - snapshot_id actuel depuis n8n
 */
export async function checkPlaylistNeedsSync(playlistSpotifyId, currentSnapshotId) {
  try {
    const response = await fetch(
      `${API_URL}/playlists/${playlistSpotifyId}/needs-sync?current_snapshot_id=${currentSnapshotId}`
    )

    if (!response.ok) {
      throw new Error('Erreur lors de la vérification du snapshot')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur checkPlaylistNeedsSync:', error)
    return { needs_sync: true, reason: 'error_checking' }
  }
}

/**
 * Récupérer toutes les playlists depuis la BDD
 */
export async function getPlaylistsFromDB() {
  try {
    const response = await fetch(`${API_URL}/playlists`)

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des playlists')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur getPlaylistsFromDB:', error)
    return []
  }
}

/**
 * Récupérer une playlist avec ses tracks depuis la BDD
 */
export async function getPlaylistFromDB(spotifyId) {
  try {
    const response = await fetch(`${API_URL}/playlists/${spotifyId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null // Playlist non trouvée, pas d'erreur
      }
      throw new Error('Erreur lors de la récupération de la playlist')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur getPlaylistFromDB:', error)
    return null
  }
}

/**
 * Sauvegarder les liked tracks dans la BDD (avec synchronisation incrémentielle)
 */
export async function saveLikedTracksToDB(userSpotifyId, likedTracks, incremental = false) {
  try {
    const response = await fetch(`${API_URL}/liked/${userSpotifyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: likedTracks,
        incremental: incremental
      })
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde des liked tracks')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur saveLikedTracksToDB:', error)
    throw error
  }
}

/**
 * Récupérer les liked tracks depuis la BDD
 */
export async function getLikedTracksFromDB(userSpotifyId = 'default_user') {
  try {
    const response = await fetch(`${API_URL}/liked/${userSpotifyId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return [] // Aucun liked track trouvé, pas d'erreur
      }
      throw new Error('Erreur lors de la récupération des liked tracks')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur getLikedTracksFromDB:', error)
    return []
  }
}

/**
 * Récupérer le dernier added_at pour la synchronisation incrémentielle
 */
export async function getLastLikedTrackSync(userSpotifyId = 'default_user') {
  try {
    const response = await fetch(`${API_URL}/liked/${userSpotifyId}/last-sync`)

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération du dernier sync')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur getLastLikedTrackSync:', error)
    return { last_added_at: null, has_data: false }
  }
}

/**
 * Créer un log de synchronisation
 */
export async function createSyncLog(syncType, status, itemsProcessed = 0, errorMessage = null, details = null) {
  try {
    const response = await fetch(`${API_URL}/sync-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sync_type: syncType,
        status: status,
        items_processed: itemsProcessed,
        error_message: errorMessage,
        details: details
      })
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la création du log')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur createSyncLog:', error)
    throw error
  }
}

/**
 * Mettre à jour un log de synchronisation
 */
export async function updateSyncLog(logId, status, itemsProcessed = 0, errorMessage = null, details = null) {
  try {
    const response = await fetch(`${API_URL}/sync-logs/${logId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: status,
        items_processed: itemsProcessed,
        error_message: errorMessage,
        details: details
      })
    })

    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour du log')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur updateSyncLog:', error)
    throw error
  }
}

/**
 * Récupérer les logs de synchronisation
 */
export async function getSyncLogs(syncType = null, limit = 50) {
  try {
    const url = syncType
      ? `${API_URL}/sync-logs?type=${syncType}&limit=${limit}`
      : `${API_URL}/sync-logs?limit=${limit}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des logs')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur getSyncLogs:', error)
    return []
  }
}

export default {
  savePlaylistToDB,
  savePlaylistTracksToDB,
  getPlaylistsFromDB,
  getPlaylistFromDB,
  checkPlaylistNeedsSync,
  saveLikedTracksToDB,
  getLikedTracksFromDB,
  getLastLikedTrackSync,
  createSyncLog,
  updateSyncLog,
  getSyncLogs
}

