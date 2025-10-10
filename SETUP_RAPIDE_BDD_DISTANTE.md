# ⚡ Setup Ultra-Rapide - Base de Données Distante

Vous avez déjà une base MySQL sur un serveur distant ? Parfait ! Voici comment tout connecter en 5 minutes.

## 📋 Ce dont vous avez besoin

- ✅ Serveur MySQL distant avec base `bane2718_babines`
- ✅ Accès à phpMyAdmin ou ligne de commande MySQL
- ✅ Identifiants MySQL (host, user, password)

## 🚀 Setup en 3 étapes

### 1️⃣ Créer la structure SQL sur votre serveur

**Option A : Via phpMyAdmin (recommandé)**

1. Connectez-vous à phpMyAdmin
2. Sélectionnez la base `bane2718_babines`
3. Onglet **SQL**
4. Copiez tout le contenu de `database/schema.sql`
5. Collez et cliquez **Exécuter**

**Option B : Via script automatique**

```bash
cd database
./import-distant.sh
```

Le script vous demandera vos identifiants et importera tout automatiquement.

**Option C : Via ligne de commande**

```bash
mysql -h votre-serveur.com -u bane2718_bane2718 -p bane2718_babines < database/schema.sql
```

### 2️⃣ Configurer le backend

```bash
# Aller dans backend
cd backend

# Installer
npm install

# Créer .env
cp env.txt .env
```

**Modifiez `backend/.env` :**

```env
DB_HOST=votre-serveur-mysql.com
DB_PORT=3306
DB_NAME=bane2718_babines
DB_USER=bane2718_bane2718
DB_PASSWORD=votre-mot-de-passe

PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 3️⃣ Démarrer tout

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Attendez de voir : `🗄️ Base de données: ✅ Connectée`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Ouvrez http://localhost:5173 🎉

## ✅ Vérifications rapides

### La base est bien créée ?

```sql
-- Dans phpMyAdmin ou MySQL
USE bane2718_babines;
SHOW TABLES;
```

Vous devez voir : `users`, `artists`, `albums`, `tracks`, `playlists`, etc.

### Le backend est connecté ?

Ouvrez : http://localhost:3000/api/health

Doit afficher :
```json
{
  "status": "ok",
  "database": "connected"
}
```

### L'API fonctionne ?

- http://localhost:3000/api/playlists → `[]` (vide pour l'instant)
- http://localhost:3000/api/tracks → `[]` (vide pour l'instant)
- http://localhost:3000 → Infos sur l'API

## 🔧 Problèmes ?

### "Can't connect to MySQL server"

**Cause :** Votre serveur MySQL n'accepte pas les connexions externes.

**Solutions :**
1. cPanel : MySQL® Databases → Remote MySQL® → Ajoutez votre IP
2. Contactez votre hébergeur pour autoriser l'accès distant
3. Vérifiez que le port 3306 est ouvert

### "Access denied"

**Cause :** Mauvais identifiants ou droits insuffisants.

**Solutions :**
1. Vérifiez dans votre hébergeur les bons identifiants
2. L'utilisateur doit avoir TOUS les privilèges sur `bane2718_babines`
3. L'utilisateur doit être autorisé en "distant" (pas seulement localhost)

### "database: disconnected"

Vérifiez votre fichier `backend/.env` :
- DB_HOST est correct ?
- DB_USER et DB_PASSWORD sont exacts ?
- La base existe bien ?

## 📊 Arborescence finale

```
Votre serveur distant
└── MySQL
    └── bane2718_babines (base de données)
        ├── users
        ├── artists
        ├── albums
        ├── tracks
        ├── playlists
        └── ... (13 tables)
        
Votre machine locale
├── Backend (port 3000)
│   └── Se connecte à MySQL distant
│
└── Frontend (port 5173)
    └── Appelle le backend
```

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. **Peupler la base** avec vos playlists Spotify
2. **Modifier les stores** pour utiliser votre API locale
3. **Profiter** de la puissance de MySQL pour rechercher, filtrer, etc.

## 📚 Guides détaillés

- **Plus de détails :** `CONNEXION_BDD_DISTANTE.md`
- **Documentation MySQL :** `database/README.md`
- **Documentation Backend :** `backend/README.md`

---

**Temps estimé :** 5-10 minutes
**Difficulté :** ⭐⭐☆☆☆

Besoin d'aide ? Vérifiez les guides détaillés ci-dessus ! 🚀

