# 🚀 Démarrage Rapide - Babines avec MySQL

## ⚠️ Problème de page blanche - RÉSOLU !

**Cause :** MySQL ne peut pas être utilisé directement depuis le navigateur. Il faut un backend séparé.

**Solution :** J'ai créé un backend Express qui gère MySQL pour vous.

## 📦 Deux options pour utiliser Babines

### Option 1 : Continuer avec votre API existante (Simple)

Votre application fonctionne déjà avec `https://tentacules.pantagruweb.club/webhook/`.

**Aucun changement nécessaire** - votre store Spotify utilise déjà cette API.

### Option 2 : Utiliser MySQL via le backend local (Avancé)

Si vous voulez stocker les données localement dans MySQL :

## 🎯 Installation du Backend (Option 2)

### Étape 1 : Créer la base de données

```bash
# Se connecter à MySQL
mysql -u bane2718_bane2718 -p

# Exécuter le script
source database/schema.sql
```

Ou via npm :
```bash
npm run db:create
```

### Étape 2 : Installer le backend

```bash
# Aller dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Créer le fichier .env
cp env.txt .env

# Le fichier .env contient déjà vos identifiants :
# DB_HOST=localhost
# DB_NAME=bane2718_babines
# DB_USER=bane2718_bane2718
# DB_PASSWORD=9HR3-8NfK-D7P#
```

### Étape 3 : Démarrer le backend

```bash
# Dans le dossier backend/
npm run dev
```

Le serveur démarrera sur http://localhost:3000

Vous verrez :
```
🚀 Serveur Babines Backend démarré
📡 http://localhost:3000
🗄️  Base de données: ✅ Connectée
```

### Étape 4 : Démarrer le frontend

Dans un **nouveau terminal**, à la racine du projet :

```bash
npm run dev
```

Le frontend démarrera sur http://localhost:5173

## ✅ Vérifier que tout fonctionne

### Test 1 : Page blanche disparue

Ouvrez http://localhost:5173 - Vous devriez voir votre application !

### Test 2 : Backend fonctionne

Ouvrez http://localhost:3000 - Vous devriez voir :
```json
{
  "name": "Babines API",
  "version": "1.0.0",
  "status": "running"
}
```

### Test 3 : Base de données connectée

Ouvrez http://localhost:3000/api/health - Vous devriez voir :
```json
{
  "status": "ok",
  "database": "connected"
}
```

## 🔧 Problèmes courants

### Problème : Page blanche persiste

**Solution :**
```bash
# 1. Arrêter le serveur Vite (Ctrl+C)
# 2. Supprimer node_modules
rm -rf node_modules
# 3. Réinstaller
npm install
# 4. Redémarrer
npm run dev
```

### Problème : Backend ne démarre pas

**Vérifications :**
1. MySQL est démarré ?
   ```bash
   # macOS
   brew services list
   ```
2. Les identifiants dans `backend/.env` sont corrects ?
3. La base de données existe ?
   ```bash
   mysql -u bane2718_bane2718 -p -e "SHOW DATABASES;"
   ```

### Problème : CORS Error

Si vous voyez une erreur CORS dans la console :

**Solution :** Vérifiez que `FRONTEND_URL` dans `backend/.env` est correct :
```env
FRONTEND_URL=http://localhost:5173
```

## 📊 Architecture

```
┌─────────────────────┐
│   Vue.js Frontend   │  Port 5173
│  localhost:5173     │
└──────────┬──────────┘
           │ HTTP
           ↓
┌─────────────────────┐
│  Express Backend    │  Port 3000
│  localhost:3000     │
└──────────┬──────────┘
           │ mysql2
           ↓
┌─────────────────────┐
│      MySQL          │  Port 3306
│  bane2718_babines   │
└─────────────────────┘
```

## 🔄 Utiliser le backend dans vos stores

### Exemple : Modifier le store Spotify

```javascript
// src/stores/spotify.js
import { defineStore } from 'pinia'

const API_URL = 'http://localhost:3000/api'

export const userSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchAllPlaylists() {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_URL}/playlists`)
        
        if (!response.ok) {
          throw new Error('Erreur de récupération')
        }
        
        this.playlists = await response.json()
      } catch (error) {
        this.error = error.message
        console.error('Erreur:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchPlaylistById(spotifyId) {
      try {
        const response = await fetch(`${API_URL}/playlists/${spotifyId}`)
        
        if (!response.ok) {
          throw new Error('Playlist non trouvée')
        }
        
        return await response.json()
      } catch (error) {
        console.error('Erreur:', error)
        return null
      }
    },

    async searchTracks(query) {
      try {
        const response = await fetch(`${API_URL}/tracks/search?q=${encodeURIComponent(query)}`)
        return await response.json()
      } catch (error) {
        console.error('Erreur:', error)
        return []
      }
    }
  }
})
```

## 📚 Documentation

- **Structure MySQL** : `database/README.md`
- **Backend API** : `backend/README.md`
- **Migration** : `MIGRATION_MYSQL.md`

## 💡 Recommandation

**Pour commencer :**
- Gardez votre API existante (tentacules.pantagruweb.club)
- Votre app fonctionne déjà avec !

**Pour plus tard :**
- Utilisez le backend local pour le développement
- Peuplez MySQL avec vos données Spotify
- Profitez de la recherche et des requêtes avancées

## ✨ Prochaines étapes

1. ✅ Page blanche résolue
2. [ ] Créer la base de données MySQL (optionnel)
3. [ ] Démarrer le backend (optionnel)
4. [ ] Peupler la DB avec vos playlists Spotify
5. [ ] Modifier les stores pour utiliser le backend local

---

**Besoin d'aide ?** Consultez les fichiers README dans chaque dossier.

