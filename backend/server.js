/**
 * Serveur Backend Express pour Babines
 * API REST pour gérer les données Spotify avec MySQL
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection, query } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}))
app.use(express.json())

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// =====================================================
// Routes - Santé et infos
// =====================================================

app.get('/', (req, res) => {
  res.json({
    name: 'Babines API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      playlists: '/api/playlists',
      playlist: '/api/playlists/:spotify_id',
      tracks: '/api/tracks',
      artists: '/api/artists',
      liked: '/api/liked/:user_spotify_id'
    }
  })
})

app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection()
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

// =====================================================
// Routes - Playlists
// =====================================================

// Récupérer toutes les playlists
app.get('/api/playlists', async (req, res) => {
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
    const playlists = await query(sql)
    res.json(playlists)
  } catch (error) {
    console.error('Erreur /api/playlists:', error)
    res.status(500).json({ error: error.message })
  }
})

// Récupérer une playlist avec ses tracks
app.get('/api/playlists/:spotify_id', async (req, res) => {
  try {
    const { spotify_id } = req.params

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

    const results = await query(sql, [spotify_id])

    if (results.length === 0) {
      return res.status(404).json({ error: 'Playlist non trouvée' })
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
      snapshot_id: results[0].snapshot_id,
      synced_at: results[0].synced_at,
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

    res.json(playlist)
  } catch (error) {
    console.error('Erreur /api/playlists/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// Vérifier si une playlist a besoin d'être synchronisée (via snapshot_id)
app.get('/api/playlists/:spotify_id/needs-sync', async (req, res) => {
  try {
    const { spotify_id } = req.params
    const { current_snapshot_id } = req.query

    if (!current_snapshot_id) {
      return res.json({ needs_sync: true, reason: 'no_snapshot_provided' })
    }

    const sql = 'SELECT snapshot_id, synced_at FROM playlists WHERE spotify_id = ?'
    const result = await query(sql, [spotify_id])

    if (result.length === 0) {
      return res.json({ needs_sync: true, reason: 'playlist_not_found' })
    }

    const dbSnapshot = result[0].snapshot_id
    const needsSync = dbSnapshot !== current_snapshot_id

    res.json({
      needs_sync: needsSync,
      reason: needsSync ? 'snapshot_changed' : 'up_to_date',
      db_snapshot_id: dbSnapshot,
      current_snapshot_id: current_snapshot_id,
      last_synced: result[0].synced_at
    })
  } catch (error) {
    console.error('Erreur /api/playlists/needs-sync:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Routes - Tracks
// =====================================================

// Récupérer tous les tracks
app.get('/api/tracks', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50

    const sql = `
      SELECT
        t.*,
        al.name as album_name,
        al.image_url as album_image,
        GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') as artists
      FROM tracks t
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      GROUP BY t.id
      ORDER BY t.popularity DESC
      LIMIT ?
    `

    const tracks = await query(sql, [limit])
    res.json(tracks)
  } catch (error) {
    console.error('Erreur /api/tracks:', error)
    res.status(500).json({ error: error.message })
  }
})

// Rechercher des tracks
app.get('/api/tracks/search', async (req, res) => {
  try {
    const searchTerm = req.query.q || ''
    const limit = req.query.limit ? parseInt(req.query.limit) : 20

    const sql = `
      SELECT
        t.*,
        al.name as album_name,
        al.image_url as album_image,
        GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') as artists
      FROM tracks t
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      WHERE t.name LIKE ? OR ar.name LIKE ?
      GROUP BY t.id
      LIMIT ?
    `

    const searchPattern = `%${searchTerm}%`
    const tracks = await query(sql, [searchPattern, searchPattern, limit])
    res.json(tracks)
  } catch (error) {
    console.error('Erreur /api/tracks/search:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Routes - Artists
// =====================================================

app.get('/api/artists', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50

    const sql = `SELECT * FROM artists ORDER BY popularity DESC LIMIT ?`
    const artists = await query(sql, [limit])
    res.json(artists)
  } catch (error) {
    console.error('Erreur /api/artists:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Routes - POST (Sauvegarde de données)
// =====================================================

// Sauvegarder une playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const playlist = req.body

    // Vérifier si la playlist existe déjà
    const existing = await query(
      'SELECT id FROM playlists WHERE spotify_id = ?',
      [playlist.id]
    )

    let playlistId

    const data = {
      spotify_id: playlist.id,
      name: playlist.name || '',
      description: playlist.description || null,
      owner_spotify_id: playlist.owner?.id || null,
      owner_display_name: playlist.owner?.display_name || null,
      collaborative: playlist.collaborative || false,
      public: playlist.public !== false,
      total_tracks: playlist.tracks?.total || 0,
      snapshot_id: playlist.snapshot_id || null,
      image_url: playlist.images?.[0]?.url || null,
      spotify_url: playlist.external_urls?.spotify || null,
      synced_at: new Date()
    }

    if (existing.length > 0) {
      // Mettre à jour
      await query(
        'UPDATE playlists SET name=?, description=?, total_tracks=?, image_url=?, synced_at=? WHERE id=?',
        [data.name, data.description, data.total_tracks, data.image_url, data.synced_at, existing[0].id]
      )
      playlistId = existing[0].id
    } else {
      // Insérer
      const result = await query(
        'INSERT INTO playlists (spotify_id, name, description, owner_spotify_id, owner_display_name, collaborative, public, total_tracks, snapshot_id, image_url, spotify_url, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.spotify_id, data.name, data.description, data.owner_spotify_id, data.owner_display_name, data.collaborative, data.public, data.total_tracks, data.snapshot_id, data.image_url, data.spotify_url, data.synced_at]
      )
      playlistId = result.insertId
    }

    res.json({ success: true, id: playlistId })
  } catch (error) {
    console.error('Erreur sauvegarde playlist:', error)
    res.status(500).json({ error: error.message })
  }
})

// Sauvegarder les tracks d'une playlist avec relations album_artists
app.post('/api/playlists/:spotify_id/tracks', async (req, res) => {
  try {
    const { spotify_id } = req.params
    const tracks = req.body.items || req.body
    const playlistInfo = req.body.playlist_info // Info optionnelle de la playlist

    // Récupérer ou créer la playlist
    let playlist = await query('SELECT id FROM playlists WHERE spotify_id = ?', [spotify_id])
    let playlistId

    if (playlist.length === 0) {
      // La playlist n'existe pas, la créer
      if (playlistInfo) {
        console.log(`📝 Création de la playlist "${playlistInfo.name}" en BDD`)
        const createResult = await query(
          'INSERT INTO playlists (spotify_id, name, description, owner_display_name, image_url, spotify_url, snapshot_id, total_tracks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            spotify_id,
            playlistInfo.name || 'Playlist sans nom',
            playlistInfo.description || null,
            playlistInfo.owner?.display_name || null,
            playlistInfo.images?.[0]?.url || null,
            playlistInfo.external_urls?.spotify || null,
            playlistInfo.snapshot_id || null,
            tracks.length
          ]
        )
        playlistId = createResult.insertId
      } else {
        // Créer une playlist minimale
        console.log(`📝 Création d'une playlist minimale pour ${spotify_id}`)
        const createResult = await query(
          'INSERT INTO playlists (spotify_id, name, total_tracks) VALUES (?, ?, ?)',
          [spotify_id, `Playlist ${spotify_id}`, tracks.length]
        )
        playlistId = createResult.insertId
      }
    } else {
      playlistId = playlist[0].id
    }
    let savedCount = 0
    let skippedCount = 0

    // Supprimer les anciens tracks de la playlist
    await query('DELETE FROM playlist_tracks WHERE playlist_id = ?', [playlistId])

    // Sauvegarder chaque track
    for (let i = 0; i < tracks.length; i++) {
      const item = tracks[i]
      const track = item.track

      if (!track || !track.id) {
        skippedCount++
        continue
      }

      // Sauvegarder l'album et ses artistes
      let albumId = null
      if (track.album) {
        const album = track.album
        const existingAlbum = await query('SELECT id FROM albums WHERE spotify_id = ?', [album.id])

        if (existingAlbum.length > 0) {
          albumId = existingAlbum[0].id
        } else {
          const albumResult = await query(
            'INSERT INTO albums (spotify_id, name, album_type, release_date, image_url, spotify_url) VALUES (?, ?, ?, ?, ?, ?)',
            [
              album.id,
              album.name || '',
              album.album_type || null,
              album.release_date || null,
              album.images?.[0]?.url || null,
              album.external_urls?.spotify || null
            ]
          )
          albumId = albumResult.insertId

          // Sauvegarder les artistes de l'album et créer les relations album_artists
          if (album.artists && album.artists.length > 0) {
            for (let k = 0; k < album.artists.length; k++) {
              const albumArtist = album.artists[k]

              // Vérifier si l'artiste existe
              let artistId
              const existingArtist = await query('SELECT id FROM artists WHERE spotify_id = ?', [albumArtist.id])

              if (existingArtist.length > 0) {
                artistId = existingArtist[0].id
              } else {
                const artistResult = await query(
                  'INSERT INTO artists (spotify_id, name, spotify_url) VALUES (?, ?, ?)',
                  [albumArtist.id, albumArtist.name || '', albumArtist.external_urls?.spotify || null]
                )
                artistId = artistResult.insertId
              }

              // Créer la relation album_artists
              await query(
                'INSERT IGNORE INTO album_artists (album_id, artist_id, position) VALUES (?, ?, ?)',
                [albumId, artistId, k]
              )
            }
          }
        }
      }

      // Sauvegarder le track
      const existingTrack = await query('SELECT id FROM tracks WHERE spotify_id = ?', [track.id])
      let trackId

      if (existingTrack.length > 0) {
        trackId = existingTrack[0].id

        // Mettre à jour les infos du track si nécessaire
        await query(
          'UPDATE tracks SET name=?, album_id=?, duration_ms=?, popularity=?, preview_url=?, spotify_url=? WHERE id=?',
          [track.name || '', albumId, track.duration_ms || 0, track.popularity || 0, track.preview_url || null, track.external_urls?.spotify || null, trackId]
        )
      } else {
        const trackResult = await query(
          'INSERT INTO tracks (spotify_id, name, album_id, duration_ms, explicit, popularity, preview_url, spotify_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            track.id,
            track.name || '',
            albumId,
            track.duration_ms || 0,
            track.explicit || false,
            track.popularity || 0,
            track.preview_url || null,
            track.external_urls?.spotify || null
          ]
        )
        trackId = trackResult.insertId

        // Sauvegarder les artistes du track et créer les relations track_artists
        if (track.artists && track.artists.length > 0) {
          for (let j = 0; j < track.artists.length; j++) {
            const artist = track.artists[j]

            // Vérifier si l'artiste existe
            let artistId
            const existingArtist = await query('SELECT id FROM artists WHERE spotify_id = ?', [artist.id])

            if (existingArtist.length > 0) {
              artistId = existingArtist[0].id
            } else {
              const artistResult = await query(
                'INSERT INTO artists (spotify_id, name, spotify_url) VALUES (?, ?, ?)',
                [artist.id, artist.name || '', artist.external_urls?.spotify || null]
              )
              artistId = artistResult.insertId
            }

            // Créer la relation track_artists
            await query(
              'INSERT IGNORE INTO track_artists (track_id, artist_id, position) VALUES (?, ?, ?)',
              [trackId, artistId, j]
            )
          }
        }
      }

      // Ajouter le track à la playlist
      await query(
        'INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
        [playlistId, trackId, i, item.added_at ? new Date(item.added_at) : new Date()]
      )
      savedCount++
    }

    // Mettre à jour le synced_at de la playlist
    await query('UPDATE playlists SET synced_at = NOW() WHERE id = ?', [playlistId])

    res.json({
      success: true,
      saved: savedCount,
      skipped: skippedCount,
      total: tracks.length
    })
  } catch (error) {
    console.error('Erreur sauvegarde tracks:', error)
    res.status(500).json({ error: error.message })
  }
})

// Sauvegarder les liked tracks d'un utilisateur (avec synchronisation incrémentielle)
app.post('/api/liked/:user_spotify_id', async (req, res) => {
  try {
    const { user_spotify_id } = req.params
    const likedTracks = req.body.items || req.body
    const incrementalSync = req.body.incremental || false

    // Récupérer ou créer l'utilisateur
    let user = await query('SELECT id FROM users WHERE spotify_id = ?', [user_spotify_id])
    let userId

    if (user.length === 0) {
      const userResult = await query(
        'INSERT INTO users (spotify_id, display_name) VALUES (?, ?)',
        [user_spotify_id, user_spotify_id]
      )
      userId = userResult.insertId
    } else {
      userId = user[0].id
    }

    // Si sync incrémentiel, récupérer le dernier added_at
    let lastAddedAt = null
    if (incrementalSync) {
      const lastSync = await query(
        'SELECT MAX(added_at) as last_added_at FROM liked_tracks WHERE user_id = ?',
        [userId]
      )
      lastAddedAt = lastSync[0]?.last_added_at
    }

    let savedCount = 0
    let skippedCount = 0
    let duplicateCount = 0

    // Sauvegarder chaque track liké
    for (const item of likedTracks) {
      const track = item.track

      if (!track || !track.track_id) continue

      // Récupérer la date d'ajout (peut être dans track ou item)
      const addedAt = track.added_at || item.added_at || new Date()

      // Si sync incrémentiel et que le track est plus ancien que le dernier, on arrête
      if (incrementalSync && lastAddedAt && new Date(addedAt) <= new Date(lastAddedAt)) {
        skippedCount++
        continue
      }

      // Sauvegarder l'album (peut être une string ou un objet)
      let albumId = null
      if (track.album) {
        if (typeof track.album === 'string') {
          // Album est juste un nom (string)
          const albumResult = await query(
            'INSERT INTO albums (spotify_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
            [track.track_id + '_album', track.album]
          )
          albumId = albumResult.insertId || (await query('SELECT id FROM albums WHERE spotify_id = ?', [track.track_id + '_album']))[0].id
        } else if (track.album.id) {
          // Album est un objet avec id
          const existingAlbum = await query('SELECT id FROM albums WHERE spotify_id = ?', [track.album.id])

          if (existingAlbum.length > 0) {
            albumId = existingAlbum[0].id
          } else {
            const albumResult = await query(
              'INSERT INTO albums (spotify_id, name, release_date, image_url, spotify_url) VALUES (?, ?, ?, ?, ?)',
              [track.album.id, track.album.name || '', track.album.release_date || null, track.album.images?.[0]?.url || null, track.album.external_urls?.spotify || null]
            )
            albumId = albumResult.insertId
          }
        }
      }

      // Sauvegarder le track
      const existingTrack = await query('SELECT id FROM tracks WHERE spotify_id = ?', [track.track_id])
      let trackId

      if (existingTrack.length > 0) {
        trackId = existingTrack[0].id
      } else {
        const trackResult = await query(
          'INSERT INTO tracks (spotify_id, name, album_id, duration_ms, popularity, preview_url, spotify_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [track.track_id, track.title || '', albumId, track.duration_ms || 0, track.popularity || 0, track.preview_url || null, track.external_urls?.spotify || null]
        )
        trackId = trackResult.insertId

        // Sauvegarder les artistes du track
        if (track.artist) {
          let artistId

          if (typeof track.artist === 'string') {
            // Artist est juste un nom (string)
            const artistResult = await query(
              'INSERT INTO artists (spotify_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
              [track.track_id + '_artist', track.artist]
            )
            artistId = artistResult.insertId || (await query('SELECT id FROM artists WHERE spotify_id = ?', [track.track_id + '_artist']))[0].id
          } else if (track.artist.id) {
            // Artist est un objet avec id
            const existingArtist = await query('SELECT id FROM artists WHERE spotify_id = ?', [track.artist.id])

            if (existingArtist.length > 0) {
              artistId = existingArtist[0].id
            } else {
              const artistResult = await query(
                'INSERT INTO artists (spotify_id, name, spotify_url) VALUES (?, ?, ?)',
                [track.artist.id, track.artist.name || '', track.artist.external_urls?.spotify || null]
              )
              artistId = artistResult.insertId
            }
          }

          if (artistId) {
            // Lier l'artiste au track
            await query(
              'INSERT IGNORE INTO track_artists (track_id, artist_id, position) VALUES (?, ?, ?)',
              [trackId, artistId, 0]
            )
          }
        }
      }

      // Vérifier si déjà liké
      const existingLiked = await query(
        'SELECT id FROM liked_tracks WHERE user_id = ? AND track_id = ?',
        [userId, trackId]
      )

      if (existingLiked.length === 0) {
        await query(
          'INSERT INTO liked_tracks (user_id, track_id, added_at) VALUES (?, ?, ?)',
          [userId, trackId, new Date(addedAt)]
        )
        savedCount++
      } else {
        duplicateCount++
      }
    }

    res.json({
      success: true,
      saved: savedCount,
      skipped: skippedCount,
      duplicates: duplicateCount,
      total: likedTracks.length
    })
  } catch (error) {
    console.error('Erreur sauvegarde liked tracks:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Routes - Liked Tracks
// =====================================================

app.get('/api/liked/:user_spotify_id', async (req, res) => {
  try {
    const { user_spotify_id } = req.params

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

    const tracks = await query(sql, [user_spotify_id])
    res.json(tracks)
  } catch (error) {
    console.error('Erreur /api/liked:', error)
    res.status(500).json({ error: error.message })
  }
})

// Récupérer le dernier added_at pour la synchronisation incrémentielle
app.get('/api/liked/:user_spotify_id/last-sync', async (req, res) => {
  try {
    const { user_spotify_id } = req.params

    const sql = `
      SELECT MAX(lt.added_at) as last_added_at
      FROM liked_tracks lt
      JOIN users u ON lt.user_id = u.id
      WHERE u.spotify_id = ?
    `

    const result = await query(sql, [user_spotify_id])
    const lastAddedAt = result[0]?.last_added_at || null

    res.json({
      last_added_at: lastAddedAt,
      has_data: lastAddedAt !== null
    })
  } catch (error) {
    console.error('Erreur /api/liked/last-sync:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Routes - Sync Logs
// =====================================================

// Créer un log de synchronisation
app.post('/api/sync-logs', async (req, res) => {
  try {
    const { sync_type, status, items_processed, error_message, details } = req.body

    // Déterminer la valeur de completed_at
    const completedAt = (status === 'success' || status === 'error') ? new Date() : null

    const sql = `
      INSERT INTO sync_logs (sync_type, status, items_processed, error_message, details, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `

    const result = await query(sql, [
      sync_type,
      status,
      items_processed || 0,
      error_message || null,
      details ? JSON.stringify(details) : null,
      completedAt
    ])

    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Erreur création sync log:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mettre à jour un log de synchronisation
app.put('/api/sync-logs/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, items_processed, error_message, details } = req.body

    const sql = `
      UPDATE sync_logs
      SET status = ?,
          items_processed = ?,
          error_message = ?,
          details = ?,
          completed_at = NOW()
      WHERE id = ?
    `

    await query(sql, [
      status,
      items_processed || 0,
      error_message || null,
      details ? JSON.stringify(details) : null,
      id
    ])

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur mise à jour sync log:', error)
    res.status(500).json({ error: error.message })
  }
})

// Récupérer les logs de synchronisation
app.get('/api/sync-logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50
    const sync_type = req.query.type

    let sql = `
      SELECT * FROM sync_logs
      ${sync_type ? 'WHERE sync_type = ?' : ''}
      ORDER BY started_at DESC
      LIMIT ?
    `

    const params = sync_type ? [sync_type, limit] : [limit]
    const logs = await query(sql, params)

    res.json(logs)
  } catch (error) {
    console.error('Erreur récupération sync logs:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// Gestion des erreurs 404
// =====================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

// =====================================================
// Démarrage du serveur
// =====================================================

const startServer = async () => {
  try {
    // Tester la connexion DB
    const dbConnected = await testConnection()

    if (!dbConnected) {
      console.error('⚠️  Impossible de se connecter à la base de données')
      console.error('   Vérifiez votre fichier .env et que MySQL est démarré')
    }

    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`🚀 Serveur Babines Backend démarré`)
      console.log(`📡 http://localhost:${PORT}`)
      console.log(`🗄️  Base de données: ${dbConnected ? '✅ Connectée' : '❌ Déconnectée'}`)
      console.log(`🌐 Frontend autorisé: ${FRONTEND_URL}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    })
  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error)
    process.exit(1)
  }
}

startServer()

