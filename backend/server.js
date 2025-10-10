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

