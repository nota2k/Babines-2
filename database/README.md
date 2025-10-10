# Base de données Babines - MySQL

Ce dossier contient la structure et les scripts SQL pour la base de données Babines.

## 📋 Structure de la base de données

La base de données `bane2718_babines` contient les tables suivantes :

### Tables principales

- **users** - Utilisateurs Spotify
- **artists** - Artistes
- **albums** - Albums
- **tracks** - Morceaux/Chansons
- **playlists** - Playlists Spotify
- **liked_tracks** - Morceaux likés par les utilisateurs
- **youtube_videos** - Correspondances YouTube

### Tables de relation

- **album_artists** - Relation entre albums et artistes
- **track_artists** - Relation entre tracks et artistes
- **playlist_tracks** - Relation entre playlists et tracks

### Tables système

- **sync_logs** - Logs de synchronisation avec Spotify

## 🚀 Installation

### 1. Prérequis

- MySQL 8.0 ou supérieur
- Node.js et npm

### 2. Installer le client MySQL pour Node.js

```bash
npm install mysql2
```

### 3. Créer la base de données

Ouvrez MySQL et exécutez le script `schema.sql` :

```bash
mysql -u root -p < database/schema.sql
```

Ou depuis MySQL :

```sql
source /chemin/vers/database/schema.sql;
```

### 4. (Optionnel) Peupler avec des données de test

```bash
mysql -u root -p bane2718_babines < database/seed.sql
```

### 5. Configuration

Créez un fichier `.env` à la racine du projet :

```env
VITE_DB_HOST=localhost
VITE_DB_PORT=3306
VITE_DB_NAME=bane2718_babines
VITE_DB_USER=root
VITE_DB_PASSWORD=votre_mot_de_passe
```

## 📊 Vues disponibles

### `v_tracks_complete`

Vue complète des tracks avec artistes et album :

```sql
SELECT * FROM v_tracks_complete;
```

### `v_playlists_summary`

Vue des playlists avec le nombre de tracks :

```sql
SELECT * FROM v_playlists_summary;
```

## 🔧 Procédures stockées

### `get_playlist_tracks(playlist_spotify_id)`

Obtenir tous les tracks d'une playlist :

```sql
CALL get_playlist_tracks('37i9dQZF1DXcBWIGoYBM5M');
```

### `get_user_liked_tracks(user_spotify_id)`

Obtenir les tracks likés d'un utilisateur :

```sql
CALL get_user_liked_tracks('user123');
```

## 💡 Exemples d'utilisation

### Insérer une playlist

```sql
INSERT INTO playlists (spotify_id, name, description, owner_display_name, public, image_url)
VALUES (
  '37i9dQZF1DXcBWIGoYBM5M',
  'Top 50 France',
  'Les 50 titres les plus écoutés en France',
  'Spotify',
  TRUE,
  'https://example.com/image.jpg'
);
```

### Insérer un track avec ses artistes

```sql
-- 1. Insérer l'artiste
INSERT INTO artists (spotify_id, name, spotify_uri)
VALUES ('artist123', 'Daft Punk', 'spotify:artist:4tZwfgrHOc3mvqYlEYSvVi');

-- 2. Insérer l'album
INSERT INTO albums (spotify_id, name, release_date)
VALUES ('album123', 'Random Access Memories', '2013-05-17');

-- 3. Insérer le track
INSERT INTO tracks (spotify_id, name, album_id, duration_ms, popularity)
VALUES (
  'track123',
  'Get Lucky',
  LAST_INSERT_ID(),
  248213,
  85
);

-- 4. Lier le track à l'artiste
INSERT INTO track_artists (track_id, artist_id, position)
VALUES (LAST_INSERT_ID(), 1, 0);
```

### Ajouter un track à une playlist

```sql
INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
VALUES (1, 1, 0, NOW());
```

### Rechercher des tracks

```sql
-- Recherche par nom
SELECT * FROM v_tracks_complete 
WHERE track_name LIKE '%love%';

-- Recherche full-text
SELECT * FROM tracks 
WHERE MATCH(name) AGAINST('love song' IN NATURAL LANGUAGE MODE);

-- Recherche par artiste
SELECT t.* FROM tracks t
JOIN track_artists ta ON t.id = ta.track_id
JOIN artists a ON ta.artist_id = a.id
WHERE a.name LIKE '%Daft Punk%';
```

### Obtenir les playlists d'un utilisateur

```sql
SELECT * FROM v_playlists_summary
WHERE owner_display_name = 'Nelly Babillon'
ORDER BY updated_at DESC;
```

### Obtenir les tracks populaires

```sql
SELECT * FROM v_tracks_complete
WHERE popularity > 80
ORDER BY popularity DESC
LIMIT 50;
```

## 🔍 Index et Performance

Le schéma inclut des index sur :

- Tous les `spotify_id` (clés uniques)
- Les noms (artists, albums, tracks, playlists)
- Les dates (release_date, added_at)
- Les clés étrangères
- Recherche full-text sur les noms

## 🔄 Synchronisation avec Spotify

Les triggers automatiques maintiennent :

- Le compteur `total_tracks` dans les playlists
- Les timestamps `updated_at`

## 🛡️ Sécurité

- Utilisez toujours des requêtes préparées (paramétrisées)
- Ne stockez jamais de tokens d'accès dans la base
- Utilisez des connexions SSL en production
- Limitez les privilèges de l'utilisateur MySQL

## 📝 Maintenance

### Sauvegarder la base de données

```bash
mysqldump -u root -p bane2718_babines > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde

```bash
mysql -u root -p bane2718_babines < backup_20231010.sql
```

### Optimiser les tables

```sql
OPTIMIZE TABLE tracks, playlists, artists, albums;
```

## 🐛 Dépannage

### Erreur de connexion

Vérifiez que MySQL est démarré :

```bash
# macOS
brew services list

# Démarrer MySQL
brew services start mysql
```

### Droits insuffisants

Créez un utilisateur dédié :

```sql
CREATE USER 'babines_user'@'localhost' IDENTIFIED BY 'mot_de_passe';
GRANT ALL PRIVILEGES ON bane2718_babines.* TO 'babines_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📚 Ressources

- [Documentation MySQL](https://dev.mysql.com/doc/)
- [mysql2 pour Node.js](https://github.com/sidorares/node-mysql2)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)

