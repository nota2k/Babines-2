/**
 * Configuration de la base de données MySQL
 * Copiez ce fichier en 'config.js' et remplissez vos informations
 */

export const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'bane2718_babines',
  user: 'root',
  password: '', // Votre mot de passe MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}

export const spotifyConfig = {
  clientId: '', // Votre Client ID Spotify
  clientSecret: '', // Votre Client Secret Spotify
  redirectUri: 'http://localhost:5173/callback'
}

export const youtubeConfig = {
  apiKey: '' // Votre clé API YouTube
}

