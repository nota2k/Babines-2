/**
 * Service pour gérer les données Spotify avec MySQL
 *
 * ⚠️ IMPORTANT : Ce fichier est conçu pour un backend Node.js
 * Il ne peut PAS être utilisé directement depuis le navigateur !
 *
 * Ce fichier doit être utilisé dans un backend Express/Node.js
 * Pour l'utiliser dans votre frontend, appelez votre API backend
 */

// ⚠️ Désactivé côté client
// import { query, insert, update, select } from './db.js'

console.warn('⚠️ spotifyService.js est désactivé côté client. Créez un backend API pour l\'utiliser.')

/**
 * Sauvegarder ou mettre à jour un artiste
 * @param {Object} artistData - Données de l'artiste depuis l'API Spotify
 * @returns {Promise<number>} ID de l'artiste dans la BD
 */
export async function saveArtist(artistData) {
  try {
    // Vérifier si l'artiste existe déjà
    const existing = await query(
      'SELECT id FROM artists WHERE spotify_id = ?',
      [artistData.id]
    )

    const data = {
      spotify_id: artistData.id,
      name: artistData.name,
      spotify_uri: artistData.uri,
      spotify_url: artistData.external_urls?.spotify,
      image_url: artistData.images?.[0]?.url,
      popularity: artistData.popularity || 0,
      followers: artistData.followers?.total || 0,
      genres: JSON.stringify(artistData.genres || [])
    }

    if (existing.length > 0) {
      // Mettre à jour
      await update('artists', data, { id: existing[0].id })
      return existing[0].id
    } else {
      // Insérer
      return await insert('artists', data)
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'artiste:', error)
    throw error
  }
}

/**
 * Sauvegarder ou mettre à jour un album
 * @param {Object} albumData - Données de l'album depuis l'API Spotify
 * @returns {Promise<number>} ID de l'album dans la BD
 */
export async function saveAlbum(albumData) {
  try {
    const existing = await query(
      'SELECT id FROM albums WHERE spotify_id = ?',
      [albumData.id]
    )

    const data = {
      spotify_id: albumData.id,
      name: albumData.name,
      album_type: albumData.album_type,
      release_date: albumData.release_date,
      release_date_precision: albumData.release_date_precision,
      total_tracks: albumData.total_tracks || 0,
      image_url: albumData.images?.[0]?.url,
      spotify_uri: albumData.uri,
      spotify_url: albumData.external_urls?.spotify
    }

    let albumId

    if (existing.length > 0) {
      await update('albums', data, { id: existing[0].id })
      albumId = existing[0].id
    } else {
      albumId = await insert('albums', data)
    }

    // Sauvegarder les artistes de l'album
    if (albumData.artists && albumData.artists.length > 0) {
      // Supprimer les anciennes relations
      await query('DELETE FROM album_artists WHERE album_id = ?', [albumId])

      // Ajouter les nouvelles relations
      for (let i = 0; i < albumData.artists.length; i++) {
        const artistId = await saveArtist(albumData.artists[i])
        await insert('album_artists', {
          album_id: albumId,
          artist_id: artistId,
          position: i
        })
      }
    }

    return albumId
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'album:', error)
    throw error
  }
}

/**
 * Sauvegarder ou mettre à jour un track
 * @param {Object} trackData - Données du track depuis l'API Spotify
 * @returns {Promise<number>} ID du track dans la BD
 */
export async function saveTrack(trackData) {
  try {
    const existing = await query(
      'SELECT id FROM tracks WHERE spotify_id = ?',
      [trackData.id]
    )

    // Sauvegarder l'album d'abord
    let albumId = null
    if (trackData.album) {
      albumId = await saveAlbum(trackData.album)
    }

    const data = {
      spotify_id: trackData.id,
      name: trackData.name,
      album_id: albumId,
      duration_ms: trackData.duration_ms,
      track_number: trackData.track_number,
      disc_number: trackData.disc_number || 1,
      explicit: trackData.explicit || false,
      popularity: trackData.popularity || 0,
      preview_url: trackData.preview_url,
      isrc: trackData.external_ids?.isrc,
      spotify_uri: trackData.uri,
      spotify_url: trackData.external_urls?.spotify
    }

    let trackId

    if (existing.length > 0) {
      await update('tracks', data, { id: existing[0].id })
      trackId = existing[0].id
    } else {
      trackId = await insert('tracks', data)
    }

    // Sauvegarder les artistes du track
    if (trackData.artists && trackData.artists.length > 0) {
      // Supprimer les anciennes relations
      await query('DELETE FROM track_artists WHERE track_id = ?', [trackId])

      // Ajouter les nouvelles relations
      for (let i = 0; i < trackData.artists.length; i++) {
        const artistId = await saveArtist(trackData.artists[i])
        await insert('track_artists', {
          track_id: trackId,
          artist_id: artistId,
          position: i
        })
      }
    }

    return trackId
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du track:', error)
    throw error
  }
}

/**
 * Sauvegarder ou mettre à jour une playlist
 * @param {Object} playlistData - Données de la playlist depuis l'API Spotify
 * @returns {Promise<number>} ID de la playlist dans la BD
 */
export async function savePlaylist(playlistData) {
  try {
    const existing = await query(
      'SELECT id FROM playlists WHERE spotify_id = ?',
      [playlistData.id]
    )

    const data = {
      spotify_id: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      owner_spotify_id: playlistData.owner?.id,
      owner_display_name: playlistData.owner?.display_name,
      collaborative: playlistData.collaborative || false,
      public: playlistData.public !== false,
      total_tracks: playlistData.tracks?.total || 0,
      snapshot_id: playlistData.snapshot_id,
      image_url: playlistData.images?.[0]?.url,
      spotify_url: playlistData.external_urls?.spotify,
      synced_at: new Date()
    }

    if (existing.length > 0) {
      await update('playlists', data, { id: existing[0].id })
      return existing[0].id
    } else {
      return await insert('playlists', data)
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la playlist:', error)
    throw error
  }
}

/**
 * Ajouter un track à une playlist
 * @param {number} playlistId - ID de la playlist dans la BD
 * @param {Object} trackItem - Item de track depuis l'API Spotify
 * @param {number} position - Position dans la playlist
 */
export async function addTrackToPlaylist(playlistId, trackItem, position) {
  try {
    const trackId = await saveTrack(trackItem.track)

    // Vérifier si la relation existe déjà
    const existing = await query(
      'SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_id = ? AND position = ?',
      [playlistId, trackId, position]
    )

    if (existing.length === 0) {
      await insert('playlist_tracks', {
        playlist_id: playlistId,
        track_id: trackId,
        position: position,
        added_by_spotify_id: trackItem.added_by?.id,
        added_at: trackItem.added_at ? new Date(trackItem.added_at) : new Date()
      })
    }

    return trackId
  } catch (error) {
    console.error('Erreur lors de l\'ajout du track à la playlist:', error)
    throw error
  }
}

/**
 * Récupérer une playlist complète avec ses tracks
 * @param {string} spotifyId - ID Spotify de la playlist
 * @returns {Promise<Object>} Playlist avec tracks
 */
export async function getPlaylistWithTracks(spotifyId) {
  try {
    const sql = `
      SELECT
        p.*,
        t.id as track_id,
        t.spotify_id as track_spotify_id,
        t.name as track_name,
        t.duration_ms,
        t.popularity,
        t.preview_url,
        t.spotify_url as track_url,
        al.name as album_name,
        al.image_url as album_image,
        al.release_date,
        GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') as artists,
        pt.position as playlist_position,
        pt.added_at
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      LEFT JOIN tracks t ON pt.track_id = t.id
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      WHERE p.spotify_id = ?
      GROUP BY t.id, pt.position, pt.added_at
      ORDER BY pt.position
    `

    const results = await query(sql, [spotifyId])

    if (results.length === 0) {
      return null
    }

    // Structurer les données
    const playlist = {
      id: results[0].id,
      spotify_id: results[0].spotify_id,
      name: results[0].name,
      description: results[0].description,
      owner_display_name: results[0].owner_display_name,
      image_url: results[0].image_url,
      spotify_url: results[0].spotify_url,
      tracks: results
        .filter(r => r.track_id)
        .map(r => ({
          id: r.track_id,
          spotify_id: r.track_spotify_id,
          name: r.track_name,
          duration_ms: r.duration_ms,
          popularity: r.popularity,
          preview_url: r.preview_url,
          track_url: r.track_url,
          album: {
            name: r.album_name,
            image_url: r.album_image,
            release_date: r.release_date
          },
          artists: r.artists,
          position: r.playlist_position,
          added_at: r.added_at
        }))
    }

    return playlist
  } catch (error) {
    console.error('Erreur lors de la récupération de la playlist:', error)
    throw error
  }
}

/**
 * Récupérer toutes les playlists
 * @returns {Promise<Array>} Liste des playlists
 */
export async function getAllPlaylists() {
  try {
    const sql = `
      SELECT
        p.*,
        COUNT(pt.track_id) as tracks_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `

    return await query(sql)
  } catch (error) {
    console.error('Erreur lors de la récupération des playlists:', error)
    throw error
  }
}

/**
 * Sauvegarder les liked tracks d'un utilisateur
 * @param {string} userSpotifyId - ID Spotify de l'utilisateur
 * @param {Array} tracks - Liste des tracks likés
 */
export async function saveLikedTracks(userSpotifyId, tracks) {
  try {
    // Récupérer ou créer l'utilisateur
    let user = await query(
      'SELECT id FROM users WHERE spotify_id = ?',
      [userSpotifyId]
    )

    let userId
    if (user.length === 0) {
      userId = await insert('users', {
        spotify_id: userSpotifyId,
        display_name: userSpotifyId
      })
    } else {
      userId = user[0].id
    }

    // Sauvegarder chaque track liké
    for (const trackItem of tracks) {
      const trackId = await saveTrack(trackItem.track)

      // Vérifier si déjà liké
      const existing = await query(
        'SELECT id FROM liked_tracks WHERE user_id = ? AND track_id = ?',
        [userId, trackId]
      )

      if (existing.length === 0) {
        await insert('liked_tracks', {
          user_id: userId,
          track_id: trackId,
          added_at: trackItem.added_at ? new Date(trackItem.added_at) : new Date()
        })
      }
    }

    return true
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des liked tracks:', error)
    throw error
  }
}

/**
 * Récupérer les liked tracks d'un utilisateur
 * @param {string} userSpotifyId - ID Spotify de l'utilisateur
 * @returns {Promise<Array>} Liste des tracks likés
 */
export async function getLikedTracks(userSpotifyId) {
  try {
    const sql = `
      SELECT
        t.*,
        al.name as album_name,
        al.image_url as album_image,
        al.release_date,
        GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') as artists,
        lt.added_at
      FROM liked_tracks lt
      JOIN users u ON lt.user_id = u.id
      JOIN tracks t ON lt.track_id = t.id
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      WHERE u.spotify_id = ?
      GROUP BY t.id, lt.added_at
      ORDER BY lt.added_at DESC
    `

    return await query(sql, [userSpotifyId])
  } catch (error) {
    console.error('Erreur lors de la récupération des liked tracks:', error)
    throw error
  }
}

export default {
  saveArtist,
  saveAlbum,
  saveTrack,
  savePlaylist,
  addTrackToPlaylist,
  getPlaylistWithTracks,
  getAllPlaylists,
  saveLikedTracks,
  getLikedTracks
}

