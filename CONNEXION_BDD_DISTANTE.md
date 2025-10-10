# 🌐 Connexion à votre Base de Données MySQL Distante

Guide pour connecter Babines à votre serveur MySQL distant.

## 🎯 Configuration Rapide

### Étape 1 : Créer la structure de la base de données

Vous devez exécuter le script SQL sur votre serveur distant.

#### Option A : Via phpMyAdmin (le plus simple)

1. Connectez-vous à phpMyAdmin de votre hébergeur
2. Sélectionnez votre base de données `bane2718_babines`
3. Allez dans l'onglet **SQL**
4. Copiez-collez le contenu du fichier `database/schema.sql`
5. Cliquez sur **Exécuter**

#### Option B : Via ligne de commande SSH

Si vous avez un accès SSH à votre serveur :

```bash
# Se connecter à votre serveur
ssh votre-utilisateur@votre-serveur.com

# Exécuter le script
mysql -u bane2718_bane2718 -p bane2718_babines < /chemin/vers/schema.sql
```

#### Option C : Via MySQL Workbench

1. Ouvrez MySQL Workbench
2. Créez une nouvelle connexion avec les infos de votre serveur distant
3. Ouvrez le fichier `database/schema.sql`
4. Exécutez-le

### Étape 2 : Configurer le backend

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dépendances
npm install

# 3. Créer le fichier .env
cp env.txt .env
```

### Étape 3 : Modifier le fichier .env

Ouvrez `backend/.env` et configurez avec vos informations :

```env
# Informations de VOTRE serveur MySQL distant
DB_HOST=votre-serveur-mysql.com
DB_PORT=3306
DB_NAME=bane2718_babines
DB_USER=bane2718_bane2718
DB_PASSWORD=9HR3-8NfK-D7P#

# Configuration locale du backend
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Exemples de DB_HOST selon votre hébergeur :**
- cPanel : `localhost` ou `mysql.votredomaine.com`
- OVH : `votrebasededonnees.mysql.db`
- Gandi : `mysqlXXXX.db.gandi.net`
- Infomaniak : `votrebasededonnees.mysql.infomaniak.com`

### Étape 4 : Tester la connexion

```bash
# Dans le dossier backend/
npm run dev
```

Vous devriez voir :
```
🚀 Serveur Babines Backend démarré
📡 http://localhost:3000
🗄️  Base de données: ✅ Connectée
```

Si vous voyez ✅ Connectée, c'est bon ! 🎉

### Étape 5 : Démarrer le frontend

Dans un nouveau terminal, à la racine du projet :

```bash
npm run dev
```

Ouvrez http://localhost:5173

## ✅ Vérifications

### Test 1 : Backend répond

```bash
curl http://localhost:3000/api/health
```

Devrait retourner :
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-10T..."
}
```

### Test 2 : Tables créées

Via phpMyAdmin ou MySQL :
```sql
USE bane2718_babines;
SHOW TABLES;
```

Vous devriez voir :
- users
- artists
- albums
- tracks
- playlists
- playlist_tracks
- liked_tracks
- youtube_videos
- etc.

### Test 3 : API fonctionne

Ouvrez dans le navigateur :
- http://localhost:3000/api/playlists
- http://localhost:3000/api/tracks
- http://localhost:3000/api/artists

## 🔒 Sécurité - Important !

### 1. Autoriser l'accès distant

Votre hébergeur doit autoriser les connexions externes à MySQL.

**cPanel :**
1. MySQL® Databases
2. Remote MySQL®
3. Ajoutez votre IP ou `%` (tous)

**Attention :** Autoriser `%` n'est pas recommandé en production.

### 2. Utiliser SSL/TLS (recommandé)

Si votre hébergeur le supporte, ajoutez dans `backend/db.js` :

```javascript
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // ou true avec certificat
  }
}
```

### 3. Pare-feu

Assurez-vous que le port 3306 est ouvert sur votre serveur distant.

### 4. Ne jamais commiter .env

Vérifiez que `.env` est dans `.gitignore` :

```bash
echo "backend/.env" >> .gitignore
```

## 🐛 Problèmes courants

### Problème : "ECONNREFUSED" ou "Can't connect to MySQL server"

**Causes possibles :**
1. Le serveur MySQL n'accepte pas les connexions distantes
2. Pare-feu bloque le port 3306
3. DB_HOST incorrect

**Solutions :**
1. Vérifiez que MySQL accepte les connexions distantes
2. Contactez votre hébergeur pour autoriser votre IP
3. Vérifiez le nom d'hôte MySQL (souvent différent du domaine)

### Problème : "Access denied for user"

**Causes :**
- Mauvais mot de passe
- Utilisateur n'a pas les droits sur cette base
- Utilisateur n'est autorisé qu'en local

**Solutions :**
1. Vérifiez les identifiants dans votre hébergeur
2. Vérifiez que l'utilisateur a tous les privilèges sur la base
3. Autorisez l'accès distant pour cet utilisateur

### Problème : "ER_NOT_SUPPORTED_AUTH_MODE"

Votre MySQL utilise un ancien mode d'authentification.

**Solution :** Ajoutez dans `backend/db.js` :

```javascript
const dbConfig = {
  // ... autres configs
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
  }
}
```

### Problème : "Too many connections"

**Solution :** Réduisez `connectionLimit` dans `backend/db.js` :

```javascript
const dbConfig = {
  // ... autres configs
  connectionLimit: 5, // au lieu de 10
}
```

## 📊 Performances avec base distante

### Optimisations recommandées

1. **Connection pooling** (déjà configuré) ✅
2. **Cache côté backend** (à implémenter si besoin)
3. **Index MySQL** (déjà dans schema.sql) ✅

### Exemple de cache simple

```javascript
// backend/server.js
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

app.get('/api/playlists', async (req, res) => {
  const cacheKey = 'all_playlists'
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data)
  }
  
  try {
    const playlists = await query('SELECT * FROM playlists')
    cache.set(cacheKey, { data: playlists, timestamp: Date.now() })
    res.json(playlists)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## 🌍 Déploiement en production

### Option 1 : Backend sur le même serveur que la base

Si vous hébergez le backend sur le même serveur :

```env
DB_HOST=localhost
# Plus rapide car pas de latence réseau
```

### Option 2 : Backend séparé (Vercel, Railway, etc.)

Si vous déployez le backend ailleurs :

```env
DB_HOST=votre-serveur-mysql.com
# Utilisez SSL obligatoirement
```

### Option 3 : Full cloud (Heroku + ClearDB, DigitalOcean, etc.)

Utilisez les variables d'environnement fournies par votre plateforme.

## 📝 Checklist de configuration

- [ ] Base de données `bane2718_babines` existe sur le serveur distant
- [ ] Script `schema.sql` exécuté sur le serveur distant
- [ ] Tables créées (vérifier avec `SHOW TABLES`)
- [ ] Accès distant MySQL autorisé
- [ ] Fichier `backend/.env` créé et configuré
- [ ] Dépendances backend installées (`npm install`)
- [ ] Backend démarre sans erreur (`npm run dev`)
- [ ] Test de santé réussit (http://localhost:3000/api/health)
- [ ] Frontend se connecte au backend
- [ ] `.env` dans `.gitignore`

## 💡 Conseil Pro

**Pour le développement :**
1. Utilisez le serveur distant pendant le développement
2. Testez que tout fonctionne
3. Ajoutez des données de test via l'API

**Pour la production :**
1. Déployez le backend sur un serveur (Heroku, Railway, VPS, etc.)
2. Configurez les variables d'environnement
3. Utilisez SSL/TLS obligatoirement
4. Mettez en place des backups automatiques

## 🆘 Besoin d'aide ?

### Informations nécessaires pour le support

Si vous avez des problèmes, notez :
1. Votre hébergeur (OVH, Gandi, Infomaniak, etc.)
2. Le message d'erreur exact
3. Le résultat de `npm run dev` dans le backend
4. Votre configuration (sans le mot de passe !)

---

**Prochaine étape :** Une fois la connexion établie, vous pouvez peupler votre base avec les données Spotify ! 🎵

