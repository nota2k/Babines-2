# 🔄 Liked Tracks - Données Fraîches depuis n8n

## ✅ Problème Résolu !

Maintenant les **liked tracks** sont récupérés directement depuis votre API n8n, pas depuis les fichiers statiques !

## 🎯 Comment ça fonctionne maintenant

### Flux de données mis à jour

```
┌─────────────────────────────┐
│     API n8n (tentacules)    │
│  /webhook/likedtracks       │
└──────────────┬──────────────┘
               │ (données fraîches)
               ↓
┌─────────────────────────────┐
│       Store Spotify         │
│   fetchLikedTracks()        │
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
│   • liked_tracks            │
│   • tracks, artists, albums │
└─────────────────────────────┘
```

## 🚀 Utilisation

### 1. Charger les liked tracks (automatique)

```javascript
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()

// Charge depuis MySQL OU récupère depuis n8n si vide
await store.fetchLikedTracks('votre_user_id')
```

### 2. Forcer la synchronisation (données fraîches)

```javascript
// Force la récupération depuis n8n (données à jour)
await store.syncLikedTracksFromAPI('votre_user_id')
```

### 3. Dans un composant Vue

```vue
<template>
  <div>
    <h2>Mes morceaux likés</h2>
    <button @click="loadLikedTracks" :disabled="loading">
      {{ loading ? 'Chargement...' : '🔄 Charger' }}
    </button>
    <button @click="syncLikedTracks" :disabled="loading">
      {{ loading ? 'Synchronisation...' : '🔄 Synchroniser' }}
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <div v-if="likedTracks.length > 0">
      <p>{{ likedTracks.length }} morceaux likés</p>
      <div v-for="track in likedTracks.slice(0, 10)" :key="track.track_id">
        {{ track.title }} - {{ track.artist }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()
const likedTracks = ref([])
const loading = ref(false)
const error = ref(null)

async function loadLikedTracks() {
  loading.value = true
  error.value = null
  
  try {
    const tracks = await store.fetchLikedTracks('votre_user_id')
    likedTracks.value = tracks
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function syncLikedTracks() {
  loading.value = true
  error.value = null
  
  try {
    const tracks = await store.syncLikedTracksFromAPI('votre_user_id')
    likedTracks.value = tracks
    alert('✅ Liked tracks synchronisés !')
  } catch (err) {
    error.value = err.message
    alert('❌ Erreur de synchronisation')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLikedTracks()
})
</script>
```

## 📊 Console - Ce que vous verrez

### Première utilisation (MySQL vide)
```
🔄 Synchronisation des liked tracks depuis n8n...
💾 Sauvegarde des liked tracks dans MySQL...
✅ 454 liked tracks sauvegardés
```

### Utilisations suivantes (MySQL rempli)
```
📊 454 liked tracks chargés depuis MySQL
```

### Synchronisation forcée
```
🔄 Synchronisation forcée des liked tracks depuis n8n...
💾 Sauvegarde dans MySQL...
✅ 454 liked tracks synchronisés
```

## 🔧 API n8n requise

Assurez-vous que votre API n8n a un endpoint pour les liked tracks :

```
GET https://tentacules.pantagruweb.club/webhook/likedtracks
```

**Réponse attendue :**
```json
[
  {
    "track": {
      "artist": "Alex Rossi",
      "title": "Tutto va bene quando facciamo l'amore",
      "added_at": "2025-10-10T00:06:09Z",
      "album": "Album Name",
      "track_id": "1uTHByd6XPYK89i7cAH6gP"
    }
  }
]
```

## 🧪 Test rapide

### Dans la console du navigateur

```javascript
// Test 1: Charger les liked tracks
async function testLoad() {
  const { userSpotifyStore } = await import('./src/stores/spotify.js')
  const store = userSpotifyStore()
  
  console.log('🔄 Chargement des liked tracks...')
  const tracks = await store.fetchLikedTracks('test_user')
  console.log('📊 Résultat:', tracks.length, 'tracks')
  return tracks
}

// Test 2: Synchroniser depuis n8n
async function testSync() {
  const { userSpotifyStore } = await import('./src/stores/spotify.js')
  const store = userSpotifyStore()
  
  console.log('🔄 Synchronisation depuis n8n...')
  const tracks = await store.syncLikedTracksFromAPI('test_user')
  console.log('📊 Résultat:', tracks.length, 'tracks')
  return tracks
}

// Exécuter les tests
testLoad().then(() => testSync())
```

### Test direct de l'API n8n

```bash
# Tester si l'endpoint existe
curl https://tentacules.pantagruweb.club/webhook/likedtracks
```

## ⚙️ Configuration

### Changer l'endpoint n8n

Si votre endpoint est différent, modifiez dans `src/stores/spotify.js` :

```javascript
// Ligne 222 et 269
const response = await fetch('https://tentacules.pantagruweb.club/webhook/VOTRE_ENDPOINT')
```

### Changer l'ID utilisateur

```javascript
// Utilisez votre vrai ID Spotify
const userId = 'votre_spotify_user_id'
await store.fetchLikedTracks(userId)
```

## 🔄 Comparaison Avant/Après

### Avant (données statiques)
```javascript
// Toujours les mêmes données du fichier
this.likedTracks = likedTracksData // Fichier statique
```

### Après (données fraîches)
```javascript
// Récupère depuis n8n
const response = await fetch('https://tentacules.pantagruweb.club/webhook/likedtracks')
const data = await response.json()
this.likedTracks = data // Données fraîches !
```

## 🎯 Avantages

✅ **Données à jour** - Récupère depuis n8n
✅ **Cache intelligent** - MySQL pour la performance
✅ **Synchronisation** - Force la mise à jour
✅ **Flexible** - Charge ou synchronise selon besoin
✅ **Gestion d'erreurs** - Fallback sur données locales

## 🆘 Dépannage

### "Failed to fetch"

**Cause :** L'endpoint n8n n'existe pas ou n'est pas accessible

**Solution :**
1. Vérifiez l'URL : `https://tentacules.pantagruweb.club/webhook/likedtracks`
2. Testez dans le navigateur
3. Vérifiez votre workflow n8n

### "0 liked tracks"

**Cause :** L'API n8n retourne un tableau vide

**Solution :**
1. Vérifiez votre workflow n8n
2. Testez l'endpoint directement
3. Vérifiez les permissions Spotify

### Données pas à jour

**Solution :** Utilisez `syncLikedTracksFromAPI()` au lieu de `fetchLikedTracks()`

## 📈 Prochaines étapes

### Court terme
- [x] Récupération depuis n8n
- [x] Sauvegarde MySQL
- [ ] Interface de gestion
- [ ] Indicateur de dernière sync

### Moyen terme
- [ ] Synchronisation automatique
- [ ] Comparaison avec données précédentes
- [ ] Notifications de nouveaux likes
- [ ] Statistiques d'écoute

---

**🎉 Vos liked tracks sont maintenant toujours à jour !**

**Pour tester :** Utilisez `store.syncLikedTracksFromAPI('votre_user_id')` dans votre application.
