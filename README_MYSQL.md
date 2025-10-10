# 🎵 Babines - Configuration MySQL

## 🎯 Votre Situation

✅ Vous avez une **base de données MySQL distante**  
✅ La base s'appelle `bane2718_babines`  
✅ Vous avez les identifiants d'accès  
✅ Votre application Vue.js fonctionne  

## 🚀 Que faire maintenant ?

### Option 1 : Continuer sans MySQL (Immédiat)

**Rien à faire !** Votre app fonctionne déjà avec l'API `tentacules.pantagruweb.club`.

**Avantages :** Aucune configuration
**Inconvénient :** Pas de contrôle sur les données

### Option 2 : Utiliser MySQL (5-10 minutes)

Stockez vos données Spotify dans votre propre base MySQL.

**Avantages :**
- ✅ Contrôle total sur vos données
- ✅ Recherche avancée avec SQL
- ✅ Pas de dépendance à une API externe
- ✅ Offline après synchronisation
- ✅ Analyses et statistiques personnalisées

**Comment faire :** 

👉 **Suivez le guide : `SETUP_RAPIDE_BDD_DISTANTE.md`**

## 📂 Fichiers créés pour vous

### Configuration MySQL
- `database/schema.sql` - Structure complète de la base
- `database/seed.sql` - Données de test (optionnel)
- `database/import-distant.sh` - Script d'import automatique
- `database/README.md` - Documentation SQL complète

### Backend API
- `backend/server.js` - API REST Express
- `backend/db.js` - Service MySQL
- `backend/package.json` - Dépendances
- `backend/env.txt` - Template de configuration
- `backend/README.md` - Documentation backend

### Services Frontend (pour backend uniquement)
- `src/services/db.js` - ⚠️ Désactivé côté client
- `src/services/spotifyService.js` - ⚠️ Pour backend uniquement

### Guides
- `SETUP_RAPIDE_BDD_DISTANTE.md` - ⭐ Setup en 5 minutes
- `CONNEXION_BDD_DISTANTE.md` - Guide détaillé
- `MIGRATION_MYSQL.md` - Migration complète
- `DEMARRAGE_RAPIDE.md` - Guide général

## 🏗️ Architecture avec MySQL

```
┌─────────────────────────────────────────┐
│      Votre Navigateur                   │
│      http://localhost:5173              │
│                                          │
│      Vue.js + Pinia + Vue Router        │
└──────────────┬──────────────────────────┘
               │ fetch()
               ↓
┌─────────────────────────────────────────┐
│      Backend Local                       │
│      http://localhost:3000              │
│                                          │
│      Express + API REST                 │
└──────────────┬──────────────────────────┘
               │ mysql2
               ↓
┌─────────────────────────────────────────┐
│      Serveur MySQL Distant              │
│      votre-serveur.com:3306             │
│                                          │
│      Base: bane2718_babines             │
│      • 13 tables                         │
│      • Vues et procédures               │
│      • Index de performance             │
└─────────────────────────────────────────┘
```

## 📊 Structure de la base de données

### Tables principales
- **users** - Utilisateurs Spotify
- **artists** - Artistes (3M+ potentiels)
- **albums** - Albums
- **tracks** - Morceaux/chansons
- **playlists** - Vos playlists
- **liked_tracks** - Morceaux likés
- **youtube_videos** - Correspondances YouTube

### Tables de relation
- **track_artists** - Tracks ↔ Artistes
- **album_artists** - Albums ↔ Artistes  
- **playlist_tracks** - Playlists ↔ Tracks

### Système
- **sync_logs** - Historique de synchronisation

### Vues et outils
- **v_tracks_complete** - Vue complète des tracks
- **v_playlists_summary** - Vue résumée des playlists
- **Procédures stockées** pour requêtes complexes
- **Triggers** pour maintenir l'intégrité
- **Index** pour performance optimale

## 🔑 API Endpoints (une fois configuré)

### Informations
- `GET /` - Infos sur l'API
- `GET /api/health` - État de santé

### Playlists
- `GET /api/playlists` - Toutes les playlists
- `GET /api/playlists/:spotify_id` - Une playlist avec tracks

### Tracks
- `GET /api/tracks` - Tracks populaires
- `GET /api/tracks/search?q=term` - Recherche

### Artists
- `GET /api/artists` - Artistes populaires

### Utilisateur
- `GET /api/liked/:user_id` - Tracks likés

## 🎨 Exemples d'utilisation

### Dans un composant Vue

```vue
<script setup>
import { ref, onMounted } from 'vue'

const playlists = ref([])
const loading = ref(false)

async function loadPlaylists() {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/playlists')
    playlists.value = await response.json()
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlaylists()
})
</script>

<template>
  <div v-if="loading">Chargement...</div>
  <div v-else>
    <div v-for="playlist in playlists" :key="playlist.id">
      {{ playlist.name }} - {{ playlist.tracks_count }} tracks
    </div>
  </div>
</template>
```

### Dans un store Pinia

```javascript
// stores/spotify.js
import { defineStore } from 'pinia'

const API_URL = 'http://localhost:3000/api'

export const useSpotifyStore = defineStore('spotify', {
  state: () => ({
    playlists: [],
    loading: false
  }),

  actions: {
    async fetchPlaylists() {
      this.loading = true
      try {
        const res = await fetch(`${API_URL}/playlists`)
        this.playlists = await res.json()
      } finally {
        this.loading = false
      }
    },

    async searchTracks(query) {
      const res = await fetch(`${API_URL}/tracks/search?q=${query}`)
      return await res.json()
    }
  }
})
```

## 🔐 Sécurité

### En développement (actuel)
- Backend local : http://localhost:3000
- Frontend local : http://localhost:5173
- Connexion directe à MySQL distant

### En production (futur)
- [ ] Héberger le backend sur un serveur
- [ ] Utiliser HTTPS (SSL/TLS)
- [ ] Configurer CORS correctement
- [ ] Ajouter authentification (JWT)
- [ ] Variables d'environnement sécurisées
- [ ] Backups automatiques de la DB

## 📈 Évolutions possibles

### Court terme
- [ ] Peupler la base avec vos playlists Spotify
- [ ] Adapter les stores pour utiliser l'API locale
- [ ] Ajouter la recherche dans l'interface

### Moyen terme
- [ ] Synchronisation auto avec Spotify
- [ ] Statistiques et analytics
- [ ] Gestion des playlists YouTube
- [ ] Export/Import de playlists

### Long terme
- [ ] Application mobile (React Native + même API)
- [ ] Recommandations personnalisées
- [ ] Partage de playlists entre utilisateurs
- [ ] Mode offline complet

## 🆘 Support

### Guides disponibles
1. **SETUP_RAPIDE_BDD_DISTANTE.md** - ⭐ Commencez ici !
2. **CONNEXION_BDD_DISTANTE.md** - Problèmes de connexion
3. **database/README.md** - Documentation SQL
4. **backend/README.md** - Documentation API

### En cas de problème

1. Vérifiez que votre app fonctionne sans MySQL : `npm run dev`
2. Testez la connexion MySQL depuis votre hébergeur
3. Consultez les logs du backend : `cd backend && npm run dev`
4. Lisez le guide de dépannage dans `CONNEXION_BDD_DISTANTE.md`

## ✨ Conclusion

Vous avez maintenant :
- ✅ Une application Vue.js fonctionnelle
- ✅ Une base MySQL distante prête
- ✅ Un backend API complet
- ✅ Toute la documentation nécessaire

**👉 Prochaine étape recommandée :**

Lisez `SETUP_RAPIDE_BDD_DISTANTE.md` et configurez votre backend en 5 minutes ! 🚀

---

*Créé avec ❤️ pour Babines - Votre gestionnaire de playlists Spotify & YouTube*

