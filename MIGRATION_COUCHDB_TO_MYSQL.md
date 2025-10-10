# 🔄 Migration CouchDB → MySQL

## ✅ Migration Terminée !

Votre application Babines utilise maintenant **MySQL** au lieu de CouchDB pour le stockage.

## 🎯 Comment ça fonctionne maintenant

### Architecture

```
┌─────────────────────────────┐
│     API n8n (tentacules)    │
│  Source de données Spotify  │
└──────────────┬──────────────┘
               │ (1ère fois uniquement)
               ↓
┌─────────────────────────────┐
│       Store Spotify         │
│    (src/stores/spotify.js)  │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│    Backend API Express      │
│     (localhost:3000)        │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│      MySQL Database         │
│    (O2Switch distant)       │
└─────────────────────────────┘
```

### Flux de données

**Première utilisation :**
1. Vous chargez les playlists
2. Store vérifie MySQL → **vide**
3. Récupère depuis n8n
4. Sauvegarde dans MySQL
5. Affiche les données

**Utilisations suivantes :**
1. Vous chargez les playlists
2. Store vérifie MySQL → **données présentes** ✅
3. Charge depuis MySQL (rapide !)
4. Affiche les données

## 🚀 Avantages

✅ **Plus rapide** - Lecture depuis MySQL local/distant
✅ **Offline possible** - Données en cache
✅ **Recherche puissante** - SQL queries
✅ **Pas de CouchDB** - Une base de moins à gérer
✅ **n8n toujours utilisé** - Pour récupérer les mises à jour Spotify

## 📝 Changements effectués

### 1. Store Spotify (`src/stores/spotify.js`)

**Avant (CouchDB) :**
```javascript
// Toujours récupérer depuis n8n
await fetch('tentacules.../getplaylist')
```

**Après (MySQL) :**
```javascript
// 1. Essaie MySQL d'abord
const data = await getPlaylistsFromDB()
if (data.length > 0) return data

// 2. Sinon, récupère depuis n8n ET sauvegarde
const fresh = await fetch('tentacules.../getplaylist')
await savePlaylistToDB(fresh)
```

### 2. Composants mis à jour

**Fichiers modifiés :**
- ✅ `src/components/playlists/Tracklist.vue`
- ✅ `src/views/DataView.vue`

**Changement :**
```javascript
// Avant
import { useCouchDBStore } from '@/stores/couchdb'
const store = useCouchDBStore()

// Après
import { userSpotifyStore } from '@/stores/spotify'
const store = userSpotifyStore()
```

### 3. Nouvelles méthodes disponibles

```javascript
// Charger depuis MySQL (ou sync depuis n8n si vide)
await store.fetchAllPlaylists()
await store.fetchTracksByPlaylist(id)

// Forcer la synchronisation depuis n8n
await store.syncPlaylistsFromAPI()
await store.syncTracksFromAPI(id)
```

## 🎮 Utilisation

### Démarrage

**Backend obligatoire :**
```bash
cd backend
npm run dev
```

**Frontend :**
```bash
npm run dev
```

### Navigation normale

1. Ouvrez http://localhost:5173
2. Cliquez sur "Playlists" ou naviguez
3. **Automatiquement** : charge depuis MySQL
4. Si MySQL est vide : synchronise depuis n8n

### Console (F12)

Vous verrez :
```
📊 12 playlists chargées depuis MySQL
```

Ou si première fois :
```
🔄 Synchronisation depuis n8n...
💾 Sauvegarde des playlists dans MySQL...
✅ 12 playlists sauvegardées
```

## 🔄 Synchronisation manuelle

### Ajouter un bouton de sync

Dans un composant Vue :

```vue
<template>
  <button @click="syncFromSpotify">
    🔄 Mettre à jour depuis Spotify
  </button>
</template>

<script setup>
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()

async function syncFromSpotify() {
  try {
    await store.syncPlaylistsFromAPI()
    alert('✅ Synchronisation réussie !')
  } catch (error) {
    alert('❌ Erreur de synchronisation')
  }
}
</script>
```

## 📊 Vérifier les données

### Via phpMyAdmin (O2Switch)

```sql
-- Voir les playlists
SELECT * FROM playlists ORDER BY synced_at DESC;

-- Compter les tracks
SELECT COUNT(*) FROM tracks;

-- Voir une playlist complète
SELECT p.name, COUNT(pt.track_id) as nb_tracks
FROM playlists p
LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
GROUP BY p.id;
```

### Via API Backend

```bash
# Toutes les playlists
curl http://localhost:3000/api/playlists

# Une playlist spécifique
curl http://localhost:3000/api/playlists/SPOTIFY_ID

# Tracks populaires
curl http://localhost:3000/api/tracks

# Recherche
curl "http://localhost:3000/api/tracks/search?q=love"
```

## 🆚 Comparaison CouchDB vs MySQL

| Fonctionnalité | CouchDB | MySQL |
|----------------|---------|-------|
| Stockage local | ✅ | ❌ (distant) |
| Sync auto | ✅ | ⚠️ Manuel |
| Performance lecture | 🟡 | 🟢 |
| Recherche complexe | 🟡 | 🟢 |
| Relations | ❌ | ✅ |
| SQL queries | ❌ | ✅ |
| Infrastructure | Simple | Backend requis |

## 🐛 Dépannage

### "Database: disconnected"

**Cause :** Backend pas démarré ou BDD pas accessible

**Solution :**
```bash
cd backend
npm run dev
```

### Pas de données affichées

**Vérifiez dans la console (F12) :**
- `📊 X playlists chargées` → OK
- `🔄 Synchronisation...` → En cours
- Erreur ? Vérifiez que n8n répond

**Solution :**
```javascript
// Forcer la synchronisation
const store = userSpotifyStore()
await store.syncPlaylistsFromAPI()
```

### Données obsolètes

Si vos playlists Spotify ont changé :

```javascript
// Re-synchroniser depuis n8n
await store.syncPlaylistsFromAPI()
await store.syncTracksFromAPI(playlistId)
```

## ⚙️ Configuration avancée

### Activer le mode "toujours depuis n8n"

Si vous voulez toujours récupérer depuis n8n (pas de cache MySQL) :

```javascript
// Dans src/stores/spotify.js
async fetchAllPlaylists() {
  // Commentez la partie MySQL
  // const playlistsFromDB = await getPlaylistsFromDB()
  // if (playlistsFromDB.length > 0) return playlistsFromDB
  
  // Toujours depuis n8n
  const response = await fetch('tentacules...')
  // ...
}
```

### Synchronisation automatique périodique

```javascript
// Dans App.vue ou main.js
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore()

// Sync toutes les 30 minutes
setInterval(async () => {
  console.log('🔄 Synchronisation automatique...')
  await store.syncPlaylistsFromAPI()
}, 30 * 60 * 1000)
```

## 📈 Prochaines étapes

### Court terme
- [x] Migration CouchDB → MySQL
- [x] Lecture depuis MySQL
- [ ] Interface de synchronisation manuelle
- [ ] Indicateur de dernière sync

### Moyen terme
- [ ] Sync auto en arrière-plan
- [ ] Détection des changements
- [ ] Mode 100% offline
- [ ] Import/Export playlists

### Long terme
- [ ] Synchronisation bidirectionnelle
- [ ] Gestion des conflits
- [ ] Historique des versions
- [ ] Analytics avancées

## 🗑️ Nettoyer CouchDB (optionnel)

Si vous n'utilisez plus CouchDB du tout :

1. **Supprimer le store (si existe) :**
   ```bash
   rm src/stores/couchdb.js
   ```

2. **Désinstaller PouchDB :**
   ```bash
   npm uninstall pouchdb
   ```

3. **Nettoyer le navigateur :**
   - F12 → Application → IndexedDB
   - Supprimer "babines" ou "pouchdb"

## ✅ Checklist de migration

- [x] Store Spotify utilise MySQL
- [x] Composants utilisent userSpotifyStore
- [x] Backend API fonctionnel
- [x] Base MySQL créée et connectée
- [x] Tests : chargement playlists OK
- [x] Tests : chargement tracks OK
- [ ] Synchronisation manuelle testée
- [ ] CouchDB désinstallé (optionnel)

---

**🎉 Migration terminée ! Votre app utilise maintenant MySQL comme base de données principale.**

**Questions ?** Consultez `SAUVEGARDE_AUTO_BDD.md` pour plus de détails sur le fonctionnement.

