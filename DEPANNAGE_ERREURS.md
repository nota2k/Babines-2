# 🛠️ Dépannage - Erreurs Courantes

## ✅ Erreurs Corrigées

### 1. "Playlist non trouvée dans la BDD"

**Problème :** L'erreur était lancée même quand c'était normal (première utilisation)

**Solution :** ✅ Corrigé
- `getPlaylistFromDB()` retourne maintenant `null` au lieu de lancer une erreur
- Le code gère correctement le cas "playlist non trouvée"

### 2. "Liked tracks ne s'ajoutent pas"

**Problème :** Structure des données différente entre le backend et les données réelles

**Solution :** ✅ Corrigé
- Backend adapté à la structure réelle des liked tracks
- Gestion des artistes/albums comme strings ou objets
- Gestion de `added_at` dans `track` ou `item`

## 🔧 Erreurs Courantes et Solutions

### Erreur : "Failed to fetch"

**Cause :** Backend pas démarré ou API n8n inaccessible

**Solutions :**
```bash
# 1. Vérifier que le backend est démarré
curl http://localhost:3000/api/health

# 2. Démarrer le backend si nécessaire
cd backend
npm run dev

# 3. Vérifier l'API n8n
curl https://tentacules.pantagruweb.club/webhook/getplaylist
```

### Erreur : "Database: disconnected"

**Cause :** Problème de connexion MySQL

**Solutions :**
1. Vérifier les identifiants dans `backend/.env`
2. Vérifier que MySQL est accessible
3. Tester la connexion :
```bash
mysql -h bane2718.odns.fr -u bane2718_babines -p
```

### Erreur : "Bind parameters must not contain undefined"

**Cause :** Valeurs `undefined` dans les requêtes SQL

**Solution :** ✅ Déjà corrigé
- Toutes les valeurs `undefined` sont remplacées par `null` ou valeurs par défaut

### Erreur : "0 liked tracks sauvegardés"

**Cause :** Données déjà présentes ou structure incorrecte

**Solutions :**
1. Vérifier la structure des données :
```javascript
console.log(store.likedTracks[0]) // Voir la structure
```

2. Forcer la synchronisation :
```javascript
await store.syncLikedTracksFromAPI()
```

### Erreur : "Playlist non trouvée"

**Cause :** Première utilisation ou playlist pas encore synchronisée

**Solution :** ✅ Déjà corrigé
- Le système récupère automatiquement depuis n8n si pas en base

## 🧪 Tests de Vérification

### Test 1 : Backend fonctionnel

```bash
# Test de santé
curl http://localhost:3000/api/health

# Doit retourner :
# {"status":"ok","database":"connected"}
```

### Test 2 : API n8n accessible

```bash
# Test playlists
curl https://tentacules.pantagruweb.club/webhook/getplaylist

# Test liked tracks (si l'endpoint existe)
curl https://tentacules.pantagruweb.club/webhook/likedtracks
```

### Test 3 : Base de données

```sql
-- Voir les tables créées
SHOW TABLES;

-- Voir les playlists
SELECT COUNT(*) FROM playlists;

-- Voir les liked tracks
SELECT COUNT(*) FROM liked_tracks;
```

### Test 4 : Frontend

```javascript
// Dans la console du navigateur
const { userSpotifyStore } = await import('./src/stores/spotify.js')
const store = userSpotifyStore()

// Test playlists
await store.fetchAllPlaylists()

// Test liked tracks
await store.fetchLikedTracks()
```

## 🔄 Flux de Dépannage

### 1. Vérifier les prérequis

```bash
# Backend démarré ?
curl http://localhost:3000/api/health

# Base MySQL accessible ?
mysql -h bane2718.odns.fr -u bane2718_babines -p

# API n8n accessible ?
curl https://tentacules.pantagruweb.club/webhook/getplaylist
```

### 2. Vérifier les logs

**Backend :** Regarder les logs dans le terminal
**Frontend :** Ouvrir F12 → Console

### 3. Tester étape par étape

```javascript
// Test 1: Store
const store = userSpotifyStore()
console.log('Store OK')

// Test 2: API
const response = await fetch('http://localhost:3000/api/playlists')
console.log('API OK:', response.ok)

// Test 3: Données
const playlists = await store.fetchAllPlaylists()
console.log('Données OK:', playlists.length)
```

## 📊 Messages de Console Normaux

### Première utilisation (MySQL vide)
```
🔄 Synchronisation depuis n8n...
💾 Sauvegarde des playlists dans MySQL...
✅ 12 playlists sauvegardées
```

### Utilisations suivantes (MySQL rempli)
```
📊 12 playlists chargées depuis MySQL
```

### Erreurs normales (à ignorer)
```
⚠️ Erreur sauvegarde playlist: [nom] - Normal si déjà en base
```

## 🆘 Si Rien Ne Marche

### Reset complet

```bash
# 1. Arrêter tout
# Ctrl+C dans tous les terminaux

# 2. Nettoyer
rm -rf node_modules
rm -rf backend/node_modules

# 3. Réinstaller
npm install
cd backend && npm install

# 4. Redémarrer
cd backend && npm run dev
# Dans un autre terminal :
npm run dev
```

### Mode debug

```javascript
// Activer les logs détaillés
localStorage.setItem('debug', 'true')

// Puis recharger la page
```

## 📞 Support

### Informations à fournir

1. **Message d'erreur exact**
2. **Console du navigateur (F12)**
3. **Logs du backend**
4. **Résultat de** `curl http://localhost:3000/api/health`

### Commandes de diagnostic

```bash
# État du système
echo "=== Backend ==="
curl -s http://localhost:3000/api/health | jq .

echo "=== API n8n ==="
curl -s https://tentacules.pantagruweb.club/webhook/getplaylist | jq 'length'

echo "=== MySQL ==="
mysql -h bane2718.odns.fr -u bane2718_babines -p -e "SELECT COUNT(*) as playlists FROM playlists;"
```

---

**🎯 La plupart des erreurs sont maintenant corrigées !**

**Si vous avez encore des problèmes, copiez-collez le message d'erreur exact.**
