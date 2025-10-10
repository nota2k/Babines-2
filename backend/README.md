# Backend Babines - API MySQL

Backend Express pour gérer les données Spotify avec MySQL.

## 🚀 Installation rapide

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dépendances
npm install

# 3. Créer le fichier .env
cp env.txt .env

# 4. Vérifier/modifier les identifiants dans .env

# 5. Démarrer le serveur
npm run dev
```

Le serveur sera disponible sur http://localhost:3000

## 📋 Endpoints disponibles

### Santé
- `GET /` - Informations sur l'API
- `GET /api/health` - État de santé du serveur et de la DB

### Playlists
- `GET /api/playlists` - Liste toutes les playlists
- `GET /api/playlists/:spotify_id` - Détails d'une playlist avec ses tracks

### Tracks
- `GET /api/tracks` - Liste les tracks populaires (limit: 50 par défaut)
- `GET /api/tracks/search?q=term` - Rechercher des tracks

### Artists
- `GET /api/artists` - Liste les artistes populaires

### Liked
- `GET /api/liked/:user_spotify_id` - Tracks likés d'un utilisateur

## 🔧 Configuration

Le fichier `.env` contient :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bane2718_babines
DB_USER=bane2718_bane2718
DB_PASSWORD=9HR3-8NfK-D7P#

PORT=3000
FRONTEND_URL=http://localhost:5173
```

## 🧪 Test

```bash
# Tester que le serveur fonctionne
curl http://localhost:3000

# Tester la santé
curl http://localhost:3000/api/health

# Tester les playlists
curl http://localhost:3000/api/playlists
```

## 🔄 Utiliser l'API depuis le frontend

Dans votre store Pinia :

```javascript
// src/stores/spotify.js
export const userSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      this.loading = true
      try {
        const response = await fetch('http://localhost:3000/api/playlists')
        this.playlists = await response.json()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchPlaylistById(spotifyId) {
      try {
        const response = await fetch(`http://localhost:3000/api/playlists/${spotifyId}`)
        return await response.json()
      } catch (error) {
        console.error('Erreur:', error)
        return null
      }
    }
  }
})
```

## 📝 Scripts disponibles

- `npm run dev` - Démarrage en mode développement avec auto-reload
- `npm start` - Démarrage en production
- `npm test` - Lancer les tests

## 🛡️ Sécurité

⚠️ **Important pour la production :**

1. Ne commitez jamais le fichier `.env`
2. Utilisez des variables d'environnement sécurisées
3. Ajoutez une authentification JWT si nécessaire
4. Configurez CORS correctement
5. Utilisez HTTPS

## 📚 Dépendances

- `express` - Framework web
- `cors` - Gestion CORS
- `mysql2` - Client MySQL
- `dotenv` - Variables d'environnement

