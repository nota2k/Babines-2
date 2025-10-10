# 💖 Liked Tracks - Sauvegarde MySQL

## ✅ Fonctionnalité Ajoutée !

Les **liked tracks** (morceaux likés) peuvent maintenant être sauvegardés dans votre base de données MySQL !

## 🎯 Structure des données

D'après votre exemple, les liked tracks ont cette structure :

```javascript
{
  track: {
    artist: "Alex Rossi",
    title: "Tutto va bene quando facciamo l'amore - Plaisir de France Remix",
    album: "Tutto va bene quando facciamo l'amore (Remixes)",
    track_id: "1uTHByd6XPYK89i7cAH6gP",
    // ... autres propriétés
  },
  added_at: "2025-10-10T00:06:09Z"
}
```

## 🚀 Comment utiliser

### 1. Sauvegarder les liked tracks

```javascript
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()

// Sauvegarder les liked tracks actuels
await store.saveLikedTracks('votre_user_id', store.likedTracks)
```

### 2. Charger depuis MySQL

```javascript
// Charger les liked tracks depuis MySQL
const likedTracks = await store.fetchLikedTracks('votre_user_id')
```

### 3. Synchroniser depuis n8n

```javascript
// Synchroniser les liked tracks (utilise les données locales)
await store.syncLikedTracksFromAPI('votre_user_id')
```

## 📊 API Endpoints

### Sauvegarder liked tracks
```http
POST /api/liked/:user_spotify_id
Content-Type: application/json

{
  "items": [
    {
      "track": {
        "artist": "Alex Rossi",
        "title": "Tutto va bene quando facciamo l'amore",
        "album": "Album Name",
        "track_id": "1uTHByd6XPYK89i7cAH6gP"
      },
      "added_at": "2025-10-10T00:06:09Z"
    }
  ]
}
```

### Récupérer liked tracks
```http
GET /api/liked/:user_spotify_id
```

## 🗄️ Tables MySQL utilisées

### `users`
- Créé automatiquement si n'existe pas
- `spotify_id` = user_spotify_id
- `display_name` = user_spotify_id

### `artists`
- Sauvegardé automatiquement
- `spotify_id` = track.artist.id
- `name` = track.artist.name

### `albums`
- Sauvegardé automatiquement
- `spotify_id` = track.album.id
- `name` = track.album.name

### `tracks`
- Sauvegardé automatiquement
- `spotify_id` = track.track_id
- `name` = track.title

### `liked_tracks`
- Table principale pour les liked tracks
- `user_id` → `users.id`
- `track_id` → `tracks.id`
- `added_at` = date d'ajout

## 💡 Exemple d'utilisation complète

### Dans un composant Vue

```vue
<template>
  <div>
    <h2>Mes morceaux likés</h2>
    <button @click="syncLikedTracks">🔄 Synchroniser</button>
    <button @click="loadFromDB">📊 Charger depuis MySQL</button>
    
    <div v-if="loading">Chargement...</div>
    <div v-else>
      <div v-for="track in likedTracks" :key="track.track_id">
        {{ track.title }} - {{ track.artist }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()
const loading = ref(false)
const likedTracks = ref([])

async function syncLikedTracks() {
  loading.value = true
  try {
    await store.syncLikedTracksFromAPI('votre_user_id')
    likedTracks.value = store.likedTracks
    alert('✅ Liked tracks synchronisés !')
  } catch (error) {
    alert('❌ Erreur de synchronisation')
  } finally {
    loading.value = false
  }
}

async function loadFromDB() {
  loading.value = true
  try {
    const tracks = await store.fetchLikedTracks('votre_user_id')
    likedTracks.value = tracks
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFromDB()
})
</script>
```

## 🔄 Flux de données

```
┌─────────────────────────────┐
│     Données locales         │
│  (src/data/likedTracks.js)  │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│       Store Spotify         │
│   syncLikedTracksFromAPI()  │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│    Backend API Express      │
│   POST /api/liked/:user_id  │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│      MySQL Database         │
│   • users                   │
│   • artists                 │
│   • albums                  │
│   • tracks                  │
│   • liked_tracks            │
└─────────────────────────────┘
```

## 📈 Avantages

✅ **Persistance** - Données sauvegardées en base
✅ **Recherche** - Requêtes SQL sur les liked tracks
✅ **Relations** - Liens avec artistes, albums, tracks
✅ **Historique** - Date d'ajout conservée
✅ **Pas de doublons** - Vérification automatique

## 🧪 Test

### 1. Démarrer le backend
```bash
cd backend
npm run dev
```

### 2. Tester l'API
```bash
# Sauvegarder des liked tracks
curl -X POST http://localhost:3000/api/liked/test_user \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "track": {
          "artist": "Alex Rossi",
          "title": "Test Song",
          "track_id": "test123"
        },
        "added_at": "2025-10-10T00:06:09Z"
      }
    ]
  }'
```

### 3. Vérifier en base
```sql
-- Voir les liked tracks
SELECT 
  u.spotify_id as user,
  t.name as track_name,
  a.name as artist_name,
  lt.added_at
FROM liked_tracks lt
JOIN users u ON lt.user_id = u.id
JOIN tracks t ON lt.track_id = t.id
JOIN track_artists ta ON t.id = ta.track_id
JOIN artists a ON ta.artist_id = a.id
ORDER BY lt.added_at DESC;
```

## 🔧 Personnalisation

### Changer l'ID utilisateur

```javascript
// Au lieu de 'default_user', utilisez l'ID Spotify réel
const userId = 'votre_spotify_user_id'
await store.syncLikedTracksFromAPI(userId)
```

### Ajouter des métadonnées

```javascript
// Ajouter des infos supplémentaires
const likedTracksWithMeta = store.likedTracks.map(track => ({
  ...track,
  synced_at: new Date(),
  source: 'spotify'
}))
await store.saveLikedTracks(userId, likedTracksWithMeta)
```

## 🆘 Dépannage

### "No liked tracks found"

**Cause :** Aucune donnée dans `src/data/likedTracks.js`

**Solution :** Vérifiez que le fichier contient des données

### "User not found"

**Cause :** L'utilisateur n'existe pas en base

**Solution :** L'utilisateur sera créé automatiquement

### Erreur de sauvegarde

**Vérifiez :**
1. Backend démarré
2. Base MySQL accessible
3. Structure des données correcte

## 📚 Prochaines étapes

### Court terme
- [x] Sauvegarde liked tracks
- [x] Chargement depuis MySQL
- [ ] Interface de gestion
- [ ] Statistiques liked tracks

### Moyen terme
- [ ] Synchronisation automatique
- [ ] Recherche dans liked tracks
- [ ] Export liked tracks
- [ ] Comparaison avec playlists

### Long terme
- [ ] Recommandations basées sur liked tracks
- [ ] Analytics d'écoute
- [ ] Partage de liked tracks
- [ ] Mode offline complet

---

**🎉 Vos liked tracks sont maintenant sauvegardés dans MySQL !**

**Pour tester :** Utilisez `store.syncLikedTracksFromAPI('votre_user_id')` dans votre application.
