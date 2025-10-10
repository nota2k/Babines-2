# 💾 Sauvegarde Automatique en Base de Données

## ✨ Fonctionnement

Maintenant, **toutes les données récupérées depuis Spotify sont automatiquement sauvegardées** dans votre base de données MySQL !

### Ce qui est sauvegardé automatiquement

1. **Playlists** - Quand vous appelez `fetchAllPlaylists()`
   - Nom, description, image, owner, etc.
   - Créées/mises à jour automatiquement

2. **Tracks** - Quand vous appelez `fetchTracksByPlaylist(id)`
   - Morceaux avec artistes, albums
   - Liés à la playlist

3. **Artistes & Albums** - Automatiquement avec les tracks
   - Pas de doublons (vérification par spotify_id)

## 🚀 Comment ça marche

### Architecture

```
Vue Component
     ↓
Pinia Store (spotify.js)
     ↓ [Récupère depuis API Spotify]
     ↓
     ↓ [Sauvegarde automatique]
     ↓
Backend API (localhost:3000)
     ↓
MySQL Database (O2Switch)
```

### Flux de données

```javascript
// 1. Utilisateur clique pour voir les playlists
store.fetchAllPlaylists()
  ↓
// 2. Récupération depuis API Spotify
fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
  ↓
// 3. Sauvegarde automatique en BDD (en arrière-plan)
for each playlist → savePlaylistToDB(playlist)
  ↓
// 4. Données disponibles dans this.playlists ET en BDD
```

## 🎯 Utilisation

### Démarrer le système

**Terminal 1 - Backend (obligatoire):**
```bash
cd backend
npm run dev
```

Attendez de voir : `🗄️ Base de données: ✅ Connectée`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Voir la magie opérer

1. Ouvrez http://localhost:5173
2. Naviguez vers vos playlists
3. Ouvrez la console (F12)
4. Vous verrez :

```
💾 Sauvegarde des playlists dans la BDD...
✅ Playlist sauvegardée: Ma Playlist 1
✅ Playlist sauvegardée: Ma Playlist 2
...
```

5. Cliquez sur une playlist pour voir ses tracks :

```
💾 Sauvegarde des tracks de la playlist 37i9dQZF...
✅ 50 tracks sauvegardés
```

## 📊 Vérifier les données en BDD

### Via phpMyAdmin

1. Connectez-vous à phpMyAdmin (O2Switch)
2. Sélectionnez `bane2718_babines`
3. Vérifiez les tables :

```sql
-- Voir les playlists sauvegardées
SELECT * FROM playlists ORDER BY synced_at DESC;

-- Compter les tracks
SELECT COUNT(*) as total_tracks FROM tracks;

-- Compter les artistes
SELECT COUNT(*) as total_artists FROM artists;

-- Voir une playlist complète
SELECT * FROM v_tracks_complete 
WHERE id IN (
  SELECT track_id FROM playlist_tracks 
  WHERE playlist_id = 1
);
```

### Via l'API Backend

Ouvrez dans le navigateur :

- http://localhost:3000/api/playlists
- http://localhost:3000/api/tracks
- http://localhost:3000/api/artists

## ⚙️ Configuration

### Variables d'environnement

Le fichier `backend/.env` contient déjà vos identifiants O2Switch :

```env
DB_HOST=bane2718.odns.fr
DB_NAME=bane2718_babines
DB_USER=bane2718_babines
DB_PASSWORD=Petitchien-1803
```

### Désactiver la sauvegarde automatique

Si vous voulez temporairement désactiver la sauvegarde, commentez dans `src/stores/spotify.js` :

```javascript
// Sauvegarder chaque playlist dans la BDD
// console.log('💾 Sauvegarde des playlists dans la BDD...')
// for (const playlist of data) { ... }
```

## 🔧 Personnalisation

### Sauvegarder d'autres données

Ajoutez dans votre store :

```javascript
import { savePlaylistToDB } from '../services/api.js'

// Exemple : sauvegarder manuellement
async saveToDatabase() {
  try {
    await savePlaylistToDB(this.currentPlaylist)
    console.log('✅ Sauvegardé !')
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}
```

### Ajouter un bouton de sync manuel

```vue
<template>
  <button @click="syncAll">
    🔄 Synchroniser tout
  </button>
</template>

<script setup>
import { useSpotifyStore } from '@/stores/spotify'

const store = useSpotifyStore()

async function syncAll() {
  console.log('🔄 Synchronisation...')
  await store.fetchAllPlaylists()
  console.log('✅ Synchronisation terminée')
}
</script>
```

## 💡 Avantages

✅ **Automatique** - Aucune action manuelle requise
✅ **Transparent** - L'utilisateur ne voit rien
✅ **Pas de doublons** - Vérifie avant d'insérer
✅ **Mise à jour** - Les données existantes sont mises à jour
✅ **Erreurs gérées** - Ne casse pas l'app si la BDD est hors ligne
✅ **Performance** - Sauvegarde en arrière-plan

## 🚨 Gestion des erreurs

Si le backend n'est pas démarré :

```
⚠️ Erreur sauvegarde playlist: Failed to fetch
```

**L'application continue de fonctionner normalement** ! Les données sont juste affichées sans être sauvegardées.

## 📈 Prochaines étapes

### Court terme
- [x] Sauvegarder playlists automatiquement
- [x] Sauvegarder tracks automatiquement
- [x] Sauvegarder artistes & albums
- [ ] Sauvegarder liked tracks
- [ ] Indicateur visuel de synchronisation

### Moyen terme
- [ ] Synchronisation périodique automatique
- [ ] Mode offline (lire depuis la BDD)
- [ ] Statistiques d'écoute
- [ ] Recherche avancée dans la BDD

### Long terme
- [ ] Détection des changements (delta sync)
- [ ] Historique des modifications
- [ ] Export de données
- [ ] Analytics personnalisées

## 🆘 Dépannage

### Les données ne sont pas sauvegardées

1. **Backend démarré ?**
   ```bash
   cd backend && npm run dev
   ```

2. **Base de données créée ?**
   Vérifiez dans phpMyAdmin que les tables existent

3. **Connexion OK ?**
   Ouvrez http://localhost:3000/api/health
   Doit afficher : `"database": "connected"`

4. **Console d'erreurs ?**
   Ouvrez F12 et regardez les erreurs

### Performance lente

Si la sauvegarde ralentit l'interface :

```javascript
// Sauvegarder en arrière-plan sans attendre
setTimeout(async () => {
  await savePlaylistToDB(playlist)
}, 0)
```

## 📚 Fichiers modifiés

- `src/stores/spotify.js` - Ajout sauvegarde auto
- `src/services/api.js` - Nouveau service API
- `backend/server.js` - Endpoints POST ajoutés

---

**Profitez de votre base de données automatiquement remplie ! 🎉**

