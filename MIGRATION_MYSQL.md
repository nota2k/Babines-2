# 🔄 Migration de PouchDB vers MySQL

Ce guide vous accompagne dans la migration de Babines de PouchDB vers MySQL.

## 📦 Étape 1 : Installation des dépendances

```bash
npm install mysql2
```

## 🗄️ Étape 2 : Créer la base de données

### Option A : Via la ligne de commande

```bash
# Se connecter à MySQL
mysql -u root -p

# Puis exécuter
source database/schema.sql
```

### Option B : Via les scripts npm

```bash
npm run db:create
```

### Option C : Via un client MySQL (phpMyAdmin, MySQL Workbench, etc.)

Ouvrez le fichier `database/schema.sql` et exécutez-le dans votre client.

## ⚙️ Étape 3 : Configuration

### Créer un fichier `.env`

Créez un fichier `.env` à la racine du projet :

```env
VITE_DB_HOST=localhost
VITE_DB_PORT=3306
VITE_DB_NAME=bane2718_babines
VITE_DB_USER=root
VITE_DB_PASSWORD=votre_mot_de_passe_mysql

# Optionnel : API Spotify
VITE_SPOTIFY_CLIENT_ID=
VITE_SPOTIFY_CLIENT_SECRET=
```

### Ajouter `.env` au `.gitignore`

```bash
echo ".env" >> .gitignore
```

## 🔄 Étape 4 : Migrer les données existantes (optionnel)

Si vous avez des données dans PouchDB que vous souhaitez conserver :

### Script de migration manuelle

```javascript
// scripts/migrate-pouchdb-to-mysql.js
import PouchDB from 'pouchdb'
import { savePlaylist, saveTrack, addTrackToPlaylist } from '../src/services/spotifyService.js'

const oldDb = new PouchDB('babines')

async function migrate() {
  try {
    // Récupérer tous les documents
    const allDocs = await oldDb.allDocs({ include_docs: true })
    
    for (const row of allDocs.rows) {
      const doc = row.doc
      
      // Migrer selon le type de document
      if (doc.type === 'spotify_playlist') {
        await savePlaylist(doc)
        console.log(`✓ Playlist migrée: ${doc.name}`)
      }
      // Ajouter d'autres types si nécessaire
    }
    
    console.log('✅ Migration terminée !')
  } catch (error) {
    console.error('❌ Erreur de migration:', error)
  }
}

migrate()
```

Exécutez avec :

```bash
node scripts/migrate-pouchdb-to-mysql.js
```

## 🔧 Étape 5 : Mettre à jour les stores Pinia

Les stores ont été mis à jour pour utiliser MySQL. Voici les principales différences :

### Avant (PouchDB)

```javascript
import db from '@/services/db'

// Récupérer des données
const doc = await db.get('playlist_id')
```

### Après (MySQL)

```javascript
import { getPlaylistWithTracks } from '@/services/spotifyService'

// Récupérer des données
const playlist = await getPlaylistWithTracks('playlist_spotify_id')
```

## 🧪 Étape 6 : Tester la connexion

### Test rapide dans le navigateur

```javascript
import { testConnection } from '@/services/db'

// Dans votre composant Vue
onMounted(async () => {
  const isConnected = await testConnection()
  if (isConnected) {
    console.log('✅ Base de données connectée !')
  } else {
    console.error('❌ Erreur de connexion')
  }
})
```

## 📊 Étape 7 : Vérifier les données

### Via MySQL

```bash
mysql -u root -p bane2718_babines

# Afficher les tables
SHOW TABLES;

# Compter les playlists
SELECT COUNT(*) FROM playlists;

# Compter les tracks
SELECT COUNT(*) FROM tracks;

# Voir les playlists
SELECT * FROM v_playlists_summary;
```

## 🗑️ Étape 8 : Nettoyer (après vérification)

Une fois que tout fonctionne correctement avec MySQL :

### Désinstaller PouchDB

```bash
npm uninstall pouchdb
```

### Supprimer les anciennes données PouchDB

Les données PouchDB sont stockées dans le navigateur (IndexedDB). Pour les supprimer :

1. Ouvrez les DevTools (F12)
2. Application > Storage > IndexedDB
3. Supprimez la base "babines"

## 🔄 Services disponibles

### Service de base de données (`src/services/db.js`)

```javascript
import { query, insert, update, remove, select } from '@/services/db'

// Requête personnalisée
const results = await query('SELECT * FROM playlists WHERE name LIKE ?', ['%rock%'])

// Insertion simple
const id = await insert('playlists', { name: 'Ma Playlist', spotify_id: '123' })

// Mise à jour
await update('playlists', { name: 'Nouveau nom' }, { id: 1 })

// Suppression
await remove('playlists', { id: 1 })

// Sélection
const playlists = await select('playlists', { public: true }, 'name ASC', 10)
```

### Service Spotify (`src/services/spotifyService.js`)

```javascript
import {
  savePlaylist,
  saveTrack,
  getPlaylistWithTracks,
  getAllPlaylists,
  saveLikedTracks,
  getLikedTracks
} from '@/services/spotifyService'

// Sauvegarder une playlist depuis l'API Spotify
await savePlaylist(spotifyPlaylistData)

// Récupérer une playlist avec tous ses tracks
const playlist = await getPlaylistWithTracks('37i9dQZF1DXcBWIGoYBM5M')

// Récupérer toutes les playlists
const allPlaylists = await getAllPlaylists()

// Sauvegarder les liked tracks
await saveLikedTracks('user_spotify_id', likedTracksArray)

// Récupérer les liked tracks
const liked = await getLikedTracks('user_spotify_id')
```

## ⚠️ Points d'attention

### 1. Variables d'environnement

Les variables d'environnement dans Vite doivent commencer par `VITE_` pour être accessibles côté client.

### 2. Sécurité

**Important** : Ne jamais exposer vos identifiants MySQL côté client !

Pour une application en production :
- Créez une API backend (Express, Fastify, etc.)
- Le frontend fait des requêtes à l'API
- L'API communique avec MySQL
- Les identifiants restent sur le serveur

### 3. CORS en développement

Si vous créez une API backend séparée, configurez CORS :

```javascript
// backend/server.js
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({
  origin: 'http://localhost:5173' // URL de votre frontend Vite
}))
```

## 🏗️ Architecture recommandée pour la production

```
┌─────────────┐
│   Vue.js    │
│  (Frontend) │
└──────┬──────┘
       │ HTTP/REST
       ↓
┌─────────────┐
│   Express   │
│  (Backend)  │
└──────┬──────┘
       │ mysql2
       ↓
┌─────────────┐
│    MySQL    │
│  (Database) │
└─────────────┘
```

### Exemple d'API Express simple

```javascript
// backend/server.js
import express from 'express'
import cors from 'cors'
import { getPlaylistWithTracks, getAllPlaylists } from './services/spotifyService.js'

const app = express()
app.use(cors())
app.use(express.json())

// Route : récupérer toutes les playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await getAllPlaylists()
    res.json(playlists)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Route : récupérer une playlist
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await getPlaylistWithTracks(req.params.id)
    res.json(playlist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('API démarrée sur http://localhost:3000')
})
```

## 🆘 Dépannage

### Erreur : "Cannot connect to MySQL"

- Vérifiez que MySQL est démarré
- Vérifiez vos identifiants dans `.env`
- Testez la connexion : `mysql -u root -p`

### Erreur : "Table doesn't exist"

- Assurez-vous d'avoir exécuté `schema.sql`
- Vérifiez que vous êtes dans la bonne base : `USE bane2718_babines;`

### Performance lente

- Ajoutez des index sur les colonnes fréquemment recherchées
- Utilisez les vues SQL (`v_tracks_complete`, `v_playlists_summary`)
- Activez le cache de requêtes MySQL

## 📚 Ressources

- [Documentation MySQL](https://dev.mysql.com/doc/)
- [mysql2 pour Node.js](https://github.com/sidorares/node-mysql2)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Pinia Stores](https://pinia.vuejs.org/)

## ✅ Checklist de migration

- [ ] MySQL installé et démarré
- [ ] Base de données `bane2718_babines` créée
- [ ] Tables créées via `schema.sql`
- [ ] `mysql2` installé (`npm install mysql2`)
- [ ] Fichier `.env` créé et configuré
- [ ] `.env` ajouté au `.gitignore`
- [ ] Connexion testée avec `testConnection()`
- [ ] Stores mis à jour pour utiliser les nouveaux services
- [ ] Données migrées (si nécessaire)
- [ ] Application testée et fonctionnelle
- [ ] PouchDB désinstallé (optionnel)
- [ ] Documentation à jour

---

**Besoin d'aide ?** Consultez le fichier `database/README.md` pour plus de détails sur la structure de la base de données.

