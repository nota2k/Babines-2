-- =====================================================
-- Base de données Babines - Schéma MySQL
-- Gestion des données Spotify
-- =====================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS bane2718_babines
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bane2718_babines;

-- =====================================================
-- Table: users (Utilisateurs Spotify)
-- =====================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255),
  country VARCHAR(10),
  product VARCHAR(50), -- 'free' ou 'premium'
  followers INT DEFAULT 0,
  profile_image_url TEXT,
  spotify_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_spotify_id (spotify_id)
) ENGINE=InnoDB;

-- =====================================================
-- Table: artists (Artistes)
-- =====================================================
CREATE TABLE artists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  spotify_uri VARCHAR(255),
  spotify_url TEXT,
  image_url TEXT,
  popularity INT DEFAULT 0,
  followers INT DEFAULT 0,
  genres JSON, -- Array de genres
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_spotify_id (spotify_id),
  INDEX idx_name (name)
) ENGINE=InnoDB;

-- =====================================================
-- Table: albums (Albums)
-- =====================================================
CREATE TABLE albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  album_type VARCHAR(50), -- 'album', 'single', 'compilation'
  release_date DATE,
  release_date_precision VARCHAR(10), -- 'year', 'month', 'day'
  total_tracks INT DEFAULT 0,
  image_url TEXT,
  spotify_uri VARCHAR(255),
  spotify_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_spotify_id (spotify_id),
  INDEX idx_name (name),
  INDEX idx_release_date (release_date)
) ENGINE=InnoDB;

-- =====================================================
-- Table: album_artists (Relation Albums-Artistes)
-- =====================================================
CREATE TABLE album_artists (
  album_id INT NOT NULL,
  artist_id INT NOT NULL,
  position INT DEFAULT 0,
  PRIMARY KEY (album_id, artist_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- Table: tracks (Morceaux/Chansons)
-- =====================================================
CREATE TABLE tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  album_id INT,
  duration_ms INT NOT NULL, -- Durée en millisecondes
  track_number INT,
  disc_number INT DEFAULT 1,
  explicit BOOLEAN DEFAULT FALSE,
  popularity INT DEFAULT 0, -- 0-100
  preview_url TEXT, -- URL de prévisualisation 30s
  isrc VARCHAR(50), -- Code ISRC international
  spotify_uri VARCHAR(255),
  spotify_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL,
  INDEX idx_spotify_id (spotify_id),
  INDEX idx_name (name),
  INDEX idx_popularity (popularity)
) ENGINE=InnoDB;

-- =====================================================
-- Table: track_artists (Relation Tracks-Artistes)
-- =====================================================
CREATE TABLE track_artists (
  track_id INT NOT NULL,
  artist_id INT NOT NULL,
  position INT DEFAULT 0, -- Ordre des artistes
  PRIMARY KEY (track_id, artist_id),
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- Table: playlists (Playlists Spotify)
-- =====================================================
CREATE TABLE playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  owner_id INT,
  owner_spotify_id VARCHAR(255),
  owner_display_name VARCHAR(255),
  collaborative BOOLEAN DEFAULT FALSE,
  public BOOLEAN DEFAULT TRUE,
  total_tracks INT DEFAULT 0,
  snapshot_id VARCHAR(255), -- Pour détecter les changements
  image_url TEXT,
  spotify_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_spotify_id (spotify_id),
  INDEX idx_name (name),
  INDEX idx_owner_id (owner_id)
) ENGINE=InnoDB;

-- =====================================================
-- Table: playlist_tracks (Relation Playlists-Tracks)
-- =====================================================
CREATE TABLE playlist_tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT NOT NULL,
  track_id INT NOT NULL,
  position INT NOT NULL, -- Position dans la playlist
  added_by_spotify_id VARCHAR(255),
  added_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_playlist_track_position (playlist_id, position),
  INDEX idx_playlist_id (playlist_id),
  INDEX idx_track_id (track_id)
) ENGINE=InnoDB;

-- =====================================================
-- Table: liked_tracks (Morceaux likés par l'utilisateur)
-- =====================================================
CREATE TABLE liked_tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  track_id INT NOT NULL,
  added_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_track (user_id, track_id),
  INDEX idx_user_id (user_id),
  INDEX idx_track_id (track_id),
  INDEX idx_added_at (added_at)
) ENGINE=InnoDB;

-- =====================================================
-- Table: sync_logs (Logs de synchronisation)
-- =====================================================
CREATE TABLE sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'playlists', 'liked_tracks', 'full'
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'in_progress'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  items_processed INT DEFAULT 0,
  error_message TEXT,
  details JSON, -- Détails additionnels
  INDEX idx_sync_type (sync_type),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB;

-- =====================================================
-- Table: youtube_videos (pour la correspondance YouTube)
-- =====================================================
CREATE TABLE youtube_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  youtube_id VARCHAR(255) UNIQUE NOT NULL,
  track_id INT,
  title VARCHAR(500) NOT NULL,
  channel_name VARCHAR(255),
  channel_id VARCHAR(255),
  duration_seconds INT,
  thumbnail_url TEXT,
  view_count BIGINT DEFAULT 0,
  published_at TIMESTAMP NULL,
  video_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL,
  INDEX idx_youtube_id (youtube_id),
  INDEX idx_track_id (track_id)
) ENGINE=InnoDB;

-- =====================================================
-- Vues utiles
-- =====================================================

-- Vue: tracks complets avec artistes et album
CREATE OR REPLACE VIEW v_tracks_complete AS
SELECT 
  t.id,
  t.spotify_id,
  t.name AS track_name,
  t.duration_ms,
  t.popularity,
  t.explicit,
  t.preview_url,
  t.spotify_url AS track_url,
  al.name AS album_name,
  al.image_url AS album_image,
  al.release_date,
  GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') AS artists,
  t.created_at,
  t.updated_at
FROM tracks t
LEFT JOIN albums al ON t.album_id = al.id
LEFT JOIN track_artists ta ON t.id = ta.track_id
LEFT JOIN artists ar ON ta.artist_id = ar.id
GROUP BY t.id, t.spotify_id, t.name, t.duration_ms, t.popularity, 
         t.explicit, t.preview_url, t.spotify_url, al.name, 
         al.image_url, al.release_date, t.created_at, t.updated_at;

-- Vue: playlists avec nombre de tracks
CREATE OR REPLACE VIEW v_playlists_summary AS
SELECT 
  p.id,
  p.spotify_id,
  p.name,
  p.description,
  p.owner_display_name,
  p.collaborative,
  p.public,
  p.image_url,
  p.spotify_url,
  COUNT(pt.track_id) AS tracks_count,
  p.synced_at,
  p.created_at,
  p.updated_at
FROM playlists p
LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
GROUP BY p.id, p.spotify_id, p.name, p.description, p.owner_display_name,
         p.collaborative, p.public, p.image_url, p.spotify_url,
         p.synced_at, p.created_at, p.updated_at;

-- =====================================================
-- Triggers pour maintenir les compteurs
-- =====================================================

-- Trigger: Mettre à jour total_tracks dans playlists
DELIMITER //
CREATE TRIGGER update_playlist_tracks_count AFTER INSERT ON playlist_tracks
FOR EACH ROW
BEGIN
  UPDATE playlists 
  SET total_tracks = (
    SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = NEW.playlist_id
  )
  WHERE id = NEW.playlist_id;
END//

CREATE TRIGGER update_playlist_tracks_count_delete AFTER DELETE ON playlist_tracks
FOR EACH ROW
BEGIN
  UPDATE playlists 
  SET total_tracks = (
    SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = OLD.playlist_id
  )
  WHERE id = OLD.playlist_id;
END//
DELIMITER ;

-- =====================================================
-- Procédures stockées utiles
-- =====================================================

-- Procédure: Obtenir tous les tracks d'une playlist
DELIMITER //
CREATE PROCEDURE get_playlist_tracks(IN playlist_spotify_id VARCHAR(255))
BEGIN
  SELECT 
    t.*,
    al.name AS album_name,
    al.image_url AS album_image,
    GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') AS artists,
    pt.position AS playlist_position,
    pt.added_at
  FROM playlist_tracks pt
  JOIN playlists p ON pt.playlist_id = p.id
  JOIN tracks t ON pt.track_id = t.id
  LEFT JOIN albums al ON t.album_id = al.id
  LEFT JOIN track_artists ta ON t.id = ta.track_id
  LEFT JOIN artists ar ON ta.artist_id = ar.id
  WHERE p.spotify_id = playlist_spotify_id
  GROUP BY t.id, pt.position, pt.added_at
  ORDER BY pt.position;
END//

-- Procédure: Obtenir les tracks likés d'un utilisateur
CREATE PROCEDURE get_user_liked_tracks(IN user_spotify_id VARCHAR(255))
BEGIN
  SELECT 
    t.*,
    al.name AS album_name,
    al.image_url AS album_image,
    GROUP_CONCAT(ar.name ORDER BY ta.position SEPARATOR ', ') AS artists,
    lt.added_at
  FROM liked_tracks lt
  JOIN users u ON lt.user_id = u.id
  JOIN tracks t ON lt.track_id = t.id
  LEFT JOIN albums al ON t.album_id = al.id
  LEFT JOIN track_artists ta ON t.id = ta.track_id
  LEFT JOIN artists ar ON ta.artist_id = ar.id
  WHERE u.spotify_id = user_spotify_id
  GROUP BY t.id, lt.added_at
  ORDER BY lt.added_at DESC;
END//
DELIMITER ;

-- =====================================================
-- Données initiales / Configuration
-- =====================================================

-- Vous pouvez ajouter des données de test ici si nécessaire

-- =====================================================
-- Index de recherche full-text (optionnel)
-- =====================================================

-- Activer la recherche full-text sur les noms de tracks
ALTER TABLE tracks ADD FULLTEXT INDEX ft_track_name (name);
ALTER TABLE artists ADD FULLTEXT INDEX ft_artist_name (name);
ALTER TABLE albums ADD FULLTEXT INDEX ft_album_name (name);
ALTER TABLE playlists ADD FULLTEXT INDEX ft_playlist_name (name);

-- =====================================================
-- Fin du script
-- =====================================================

