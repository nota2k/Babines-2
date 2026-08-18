# Serveur de synchronisation Babines

`express-pouchdb` expose l'API HTTP de CouchDB. Le client PouchDB de Babines
réplique dessus sans code spécifique.

## En local

    cd server
    npm install
    node app.js

Le serveur écoute sur 5984. Les données vont dans `server/data/`, exclu du dépôt.

## Sur o2switch

1. cPanel → **Setup Node.js App** → _Create Application_
2. Version de Node : 20 ou plus
3. _Application root_ : le répertoire où sont déposés les fichiers de `server/`
4. _Application URL_ : `/db` sur le domaine qui sert la SPA — la même origine
   supprime le CORS et évite tout secret dans le bundle
5. _Application startup file_ : `app.js`
6. Cliquer **Run NPM Install**
7. Variable d'environnement `BABINES_DATA_DIR` : un chemin **hors de
   `public_html`**, par exemple `/home/bane2718/babines-data`

### Point de vigilance

LevelDB prend un verrou exclusif sur ses fichiers. Si Passenger lance plusieurs
processus, le second échouera à ouvrir la base ou la corrompra. Vérifier que
l'application est configurée en un seul processus.

### Sauvegardes

Les fichiers LevelDB vivent dans `BABINES_DATA_DIR` et ne sont sauvegardés par
personne. L'export JSON de l'application fait office de sauvegarde manuelle.

## Sécuriser le serveur au premier démarrage

Par défaut, un `express-pouchdb` fraîchement installé n'a pas d'administrateur
et laisse chaque base accessible à quiconque peut l'atteindre.

**Deux pistes ont été essayées et écartées avant d'arriver à la bonne, pour
ne pas les retenter :**

- `overrideMode: { include: ['routes/authentication', 'routes/authorization'] }`
  dans `app.js` : n'a jamais fait de différence. Le mode par défaut,
  `fullCouchDB`, inclut déjà ces deux modules ; ce réglage était un no-op,
  confirmé en le retirant et en observant que `/_config` refuse toujours
  l'accès anonyme sans lui.
- `couch_httpd_auth.require_valid_user` (le réglage CouchDB standard pour
  exiger une session partout) : `express-pouchdb` ne l'implémente pas du
  tout. Le fixer à `true` via `/_config` est accepté sans erreur — et sans
  aucun effet.

**Le vrai mécanisme est un document `_security` posé sur la base elle-même**
(`node_modules/express-pouchdb/lib/routes/security.js`, qui charge
`pouchdb-security`). `routes/authorization.js`, lui, ne protège que les
points d'accès système (`_config`, `_log`, `_active_tasks`, `_db_updates`,
`_restart`) — jamais les bases de données ; c'est pour ça que la première
piste semblait marcher sur `_config` tout en laissant `_all_docs` grand
ouvert.

### La difficulté : la base n'existe pas encore sur un serveur neuf

`_security` se pose sur une base qui existe déjà. Avant cette tâche, la
base `babines` n'était créée que comme effet de bord de la première
réplication de l'application — mais la réplication n'est déclenchée que
par une session valide (`restoreSession()` / connexion via l'écran de
Babines), et sans administrateur, aucune session ne peut s'ouvrir. Sur un
serveur tout juste déployé, ce cercle n'a pas de sortie manuelle sûre : le
temps de le résoudre à la main, `_config` reste ouvert à quiconque atteint
l'URL, qui pourrait s'y déclarer administrateur avant l'opérateur légitime.

**`server/setup.js` fait les trois étapes dans le seul ordre qui évite ce
piège, et vérifie son propre travail :**

1. Crée l'administrateur (ferme la fenêtre `_config` ouverte).
2. Crée la base (elle n'a pas besoin de l'application pour exister).
3. Pose `_security` dessus.
4. Vérifie : une lecture anonyme doit renvoyer `401`, une lecture
   authentifiée `200`. Le script échoue bruyamment (code de sortie non nul)
   si l'un des deux ne correspond pas — jamais de succès silencieux sur une
   base mal protégée.

Procédure complète, à exécuter une seule fois après le déploiement :

```bash
# 1. Démarrer le serveur (dans le répertoire server/)
node app.js

# 2. Générer un mot de passe long, jamais versionné
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"

# 3. Lancer le script avec les identifiants en variables d'environnement
#    (jamais dans un fichier, jamais affichés par le script)
BABINES_ADMIN=<NOM> BABINES_ADMIN_PASSWORD=<MOTDEPASSE> node setup.js

# 4. Se connecter depuis la SPA avec ces mêmes identifiants
```

`setup.js` n'est **délibérément pas appelé depuis `app.js`** au démarrage :
activer ce verrouillage avant qu'un compte existe est exactement le
scénario qui bloque le serveur sans recours, la raison qui a fait écarter
l'automatisation depuis le début de cette tâche.
