# Synchronisation Incrémentielle - Babines

## 🎯 Objectif

Ce système permet de synchroniser les données Spotify (liked tracks, playlists) depuis n8n vers MySQL de manière intelligente, en ne récupérant que les **nouvelles données** depuis la dernière synchronisation.

## 📊 Avantages

- ⚡ **Performance optimisée** : ne traite que les nouveaux tracks
- 💾 **Moins de requêtes** : évite de recharger l'intégralité des données
- 📝 **Traçabilité** : logs de synchronisation dans `sync_logs`
- 🔄 **Automatique** : synchronisation en arrière-plan lors du chargement
- 🎯 **Arrêt intelligent** : s'arrête au dernier résultat déjà en BDD

## 🏗️ Architecture

### Backend (`backend/server.js`)

#### Nouveaux endpoints

1. **`GET /api/liked/:user_spotify_id/last-sync`**
   - Récupère la date du dernier track liké en BDD
   - Retourne : `{ last_added_at: Date, has_data: boolean }`

2. **`POST /api/liked/:user_spotify_id`** (modifié)
   - Accepte maintenant un paramètre `incremental: boolean`
   - Si `incremental = true`, compare avec le dernier `added_at` et ignore les tracks plus anciens
   - Retourne : `{ success, saved, skipped, duplicates, total }`

3. **`POST /api/sync-logs`**
   - Crée un log de synchronisation
   - Types : `liked_tracks`, `liked_tracks_full`, `playlists`, etc.

4. **`PUT /api/sync-logs/:id`**
   - Met à jour un log existant avec le résultat de la synchronisation

5. **`GET /api/sync-logs`**
   - Récupère l'historique des synchronisations
   - Paramètres : `?type=liked_tracks&limit=50`

### Frontend (`src/services/api.js`)

#### Nouvelles fonctions

```javascript
// Récupérer le dernier sync
getLastLikedTrackSync(userSpotifyId)

// Sauvegarder avec mode incrémentiel
saveLikedTracksToDB(userSpotifyId, tracks, incremental = false)

// Gestion des logs
createSyncLog(syncType, status, itemsProcessed, errorMessage, details)
updateSyncLog(logId, status, itemsProcessed, errorMessage, details)
getSyncLogs(syncType, limit)
```

### Store Spotify (`src/stores/spotify.js`)

#### Flux de synchronisation

```
1. fetchLikedTracks()
   ├─ Charge depuis MySQL
   ├─ Si des données existent → Lance syncNewLikedTracks() en arrière-plan
   └─ Si aucune donnée → Synchronisation complète depuis n8n

2. syncNewLikedTracks() [NOUVEAU]
   ├─ Récupère le dernier added_at depuis MySQL
   ├─ Appelle n8n pour tous les liked tracks
   ├─ Filtre uniquement les nouveaux (added_at > dernier)
   ├─ Sauvegarde uniquement les nouveaux en BDD
   ├─ Enregistre un log dans sync_logs
   └─ Recharge les tracks depuis MySQL

3. syncLikedTracksFromAPI() [MODIFIÉ]
   ├─ Force une synchronisation COMPLÈTE
   ├─ Remplace toutes les données
   └─ À utiliser pour réinitialisation
```

## 💡 Fonctionnement détaillé

### Exemple : Liked Tracks

#### Première utilisation

```
1. L'utilisateur ouvre l'application
2. fetchLikedTracks() est appelé
3. MySQL est vide → appel n8n pour TOUS les tracks
4. Sauvegarde de tous les tracks en BDD (incremental = false)
5. L'utilisateur voit ses tracks immédiatement
```

#### Utilisations suivantes

```
1. L'utilisateur ouvre l'application
2. fetchLikedTracks() charge depuis MySQL (instantané)
3. En arrière-plan : syncNewLikedTracks() vérifie les nouveaux tracks
4. Récupère le dernier added_at = "2025-04-07T14:34:51Z"
5. Appelle n8n et filtre les tracks avec added_at > "2025-04-07T14:34:51Z"
6. Sauvegarde UNIQUEMENT les nouveaux tracks (incremental = true)
7. L'utilisateur voit les nouveaux tracks apparaître automatiquement
```

### Comparaison added_at

Le backend compare les dates pour déterminer si un track est nouveau :

```javascript
// Backend : server.js ligne 432-436
if (incrementalSync && lastAddedAt && new Date(addedAt) <= new Date(lastAddedAt)) {
  skippedCount++
  continue // Skip ce track, il est déjà en BDD
}
```

## 📈 Logs de synchronisation

Chaque synchronisation est enregistrée dans la table `sync_logs` :

```sql
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;
```

### Exemple de log

```json
{
  "id": 123,
  "sync_type": "liked_tracks",
  "status": "success",
  "started_at": "2025-10-10T14:30:00Z",
  "completed_at": "2025-10-10T14:30:15Z",
  "items_processed": 5,
  "details": {
    "new_tracks": 5,
    "saved": 5,
    "skipped": 0,
    "duplicates": 0
  }
}
```

## 🎛️ Utilisation dans l'application

### Chargement automatique (recommandé)

```javascript
// Dans un composant Vue
import { userSpotifyStore } from '@/stores/spotify'

const spotifyStore = userSpotifyStore()

// Lors du montage
await spotifyStore.fetchLikedTracks()
// ✅ Charge depuis BDD + sync incrémentiel en arrière-plan
```

### Synchronisation forcée complète

```javascript
// Force une synchronisation complète depuis n8n
await spotifyStore.syncLikedTracksFromAPI()
// ⚠️ À utiliser uniquement pour réinitialisation
```

### Afficher les logs

```javascript
import { getSyncLogs } from '@/services/api'

// Récupérer les 10 derniers logs de liked_tracks
const logs = await getSyncLogs('liked_tracks', 10)
console.log(logs)
```

## 🔧 Configuration

### Variables d'environnement

```env
# Backend .env
VITE_API_URL=http://localhost:3000/api

# Webhooks n8n
LIKED_TRACKS_WEBHOOK=https://tentacules.pantagruweb.club/webhook/likedtracks
PLAYLISTS_WEBHOOK=https://tentacules.pantagruweb.club/webhook/getplaylist
```

## 🚀 Évolutions futures

### Playlists incrémentielle

Le système peut être étendu aux playlists en utilisant le `snapshot_id` :

```javascript
// Vérifier si une playlist a changé
if (playlist.snapshot_id !== dbPlaylist.snapshot_id) {
  // La playlist a été modifiée, re-synchroniser
  await syncPlaylistTracks(playlist.id)
}
```

### Albums incrémentielle

Même logique pour les albums avec les artistes :

```javascript
// Utiliser album_artists pour les relations
const albumArtists = await query(
  'SELECT * FROM album_artists WHERE album_id = ?',
  [albumId]
)
```

## 📋 Résumé des tables BDD

| Table | Description | Relation |
|-------|-------------|----------|
| `users` | Utilisateurs Spotify | - |
| `tracks` | Morceaux | → `album_id` |
| `albums` | Albums | - |
| `artists` | Artistes | - |
| `album_artists` | Albums ↔ Artistes | M-N |
| `track_artists` | Tracks ↔ Artistes | M-N |
| `playlists` | Playlists | → `owner_id` |
| `playlist_tracks` | Playlists ↔ Tracks | M-N |
| `liked_tracks` | Tracks likés | → `user_id`, `track_id` |
| `sync_logs` | Historique sync | - |

## ✅ Avantages du système

1. **Performance** : Ne charge que les nouveaux tracks
2. **Expérience utilisateur** : Affichage immédiat depuis BDD + mise à jour en arrière-plan
3. **Économie de bande passante** : Pas de rechargement complet
4. **Fiabilité** : Logs pour tracer toutes les synchronisations
5. **Flexibilité** : Sync complète toujours disponible si nécessaire

## 🎯 Points clés

- ✅ Pas besoin de `user_id` (géré par n8n avec credentials)
- ✅ Arrêt automatique au dernier résultat similaire (par `added_at`)
- ✅ Tables relationnelles : `album_artists`, `track_artists`, `playlist_tracks`
- ✅ Association par ID Spotify unique
- ✅ Logs de synchronisation pour traçabilité
- ✅ Mode incrémentiel ET complet disponibles

## 📝 Notes importantes

- Le champ `added_at` est crucial pour la synchronisation incrémentielle
- Les tracks peuvent apparaître dans plusieurs playlists (relation M-N via `playlist_tracks`)
- Les artistes peuvent avoir plusieurs albums (relation M-N via `album_artists`)
- Les tracks peuvent avoir plusieurs artistes (relation M-N via `track_artists`)

