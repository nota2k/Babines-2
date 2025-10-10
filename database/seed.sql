-- =====================================================
-- Script de peuplement initial (exemples)
-- Base de données Babines
-- =====================================================

USE bane2718_babines;

-- Exemple d'utilisateur
INSERT INTO users (spotify_id, display_name, email, country, product, followers) 
VALUES 
  ('user123', 'Nelly Babillon', 'nelly@example.com', 'FR', 'premium', 150);

-- Exemples d'artistes
INSERT INTO artists (spotify_id, name, spotify_uri, genres, popularity) 
VALUES 
  ('artist1', 'The Beatles', 'spotify:artist:3WrFJ7ztbogyGnTHbHJFl2', '["rock", "classic rock"]', 95),
  ('artist2', 'Daft Punk', 'spotify:artist:4tZwfgrHOc3mvqYlEYSvVi', '["electronic", "house"]', 88),
  ('artist3', 'Miles Davis', 'spotify:artist:0kbYTNQb4Pb1rPbbaF0pT4', '["jazz", "bebop"]', 78);

-- Vous pouvez ajouter plus de données de test ici

-- =====================================================
-- Fin du script de peuplement
-- =====================================================

