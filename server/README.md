# Serveur de synchronisation Babines

`express-pouchdb` expose l'API HTTP de CouchDB. Le client PouchDB de Babines
réplique dessus sans code spécifique.

## En local

    cd server
    npm install
    node app.js

Le serveur écoute sur 5984. Les données vont dans `server/data/`, exclu du dépôt.

## Fichiers nécessaires sur l'hébergement

L'application déployée a besoin de tout ce qui suit — ni plus (le dépôt
entier n'a rien à faire là), ni moins :

- `app.js` — le serveur
- `setup.js` — le script de sécurisation du premier démarrage, voir plus bas
- `package.json` et `package-lock.json` — pour **Run NPM Install**
- `.htaccess` — **indispensable**, voir juste en dessous

### Pourquoi `.htaccess` n'est pas optionnel

La racine web **est** la racine applicative : cPanel l'impose, et on ne peut pas
les séparer. Sans ce fichier, `app.js`, `setup.js`, `package-lock.json` et
surtout ce `README.md` — qui décrit le mécanisme de sécurité — sont servis à
quiconque connaît l'adresse. Vérifié en production avant sa mise en place :
tous répondaient `200`.

Aucun identifiant n'est en jeu, ils vivent dans `BABINES_DATA_DIR` hors de la
racine web. Mais `package-lock.json` livre les versions exactes d'un arbre de
dépendances ancien, ce qui suffit à cibler des failles connues.

Après déploiement, vérifier — `403` attendu sur les deux premiers, `200` sur le
troisième :

    curl -o /dev/null -w '%{http_code}\n' https://<domaine>/app.js
    curl -o /dev/null -w '%{http_code}\n' https://<domaine>/README.md
    curl -o /dev/null -w '%{http_code}\n' https://<domaine>/

`server/data/` n'en fait pas partie : il est créé par `app.js` lui-même
(`BABINES_DATA_DIR`), et ne doit surtout pas être déposé à la main.

Si l'un de ces fichiers est ajouté ou modifié après un premier déploiement
(c'est arrivé pour `setup.js`, écrit après le premier `git clone` sur
l'hébergement), le déposer à la main dans le répertoire applicatif :
l'hébergement ne se resynchronise pas tout seul avec le dépôt.

## Sur o2switch

**Ne jamais déposer le dépôt Git tel quel comme racine applicative.**
`server/` doit être le répertoire dont le _contenu_ (pas le dossier
`server` lui-même) est copié à la racine applicative — copier le dépôt
entier fait détecter à cPanel le `package.json` de la SPA, pas celui du
serveur.

⚠️ Si cette erreur est faite et que le réflexe est de changer ensuite
l'_Application Root_ pour un sous-dossier de lui-même (ex. `public_html`
→ `public_html/server`) : **ne pas le faire**. C'est ce qui a rendu
CloudLinux irrécupérable lors du premier déploiement réel
(`shutil.Error: Cannot move a directory into itself`, environnement
virtuel perdu, application inutilisable jusqu'à une recréation complète
depuis zéro). Si l'arborescence déposée est la mauvaise, supprimer
l'application dans **Setup Node.js App** et la recréer proprement plutôt
que de déplacer son _Application Root_.

1. **La racine web doit être traversable.** Un `git clone` ou un dépôt de
   fichiers en shell crée souvent un dossier en mode `700` : chaque chemin
   répond alors `403`, y compris `/.well-known/acme-challenge/`, ce qui
   empêche l'émission de tout certificat SSL. Corriger avec :

   ```bash
   chmod 755 <racine web>
   ```

   Le groupe `nobody` utilisé par les racines créées par cPanel a parfois
   besoin des droits root pour être positionné ; demander au support de
   l'hébergeur si `chmod` seul ne suffit pas.

2. **La racine web EST la racine applicative.** Il n'y a pas de séparation
   entre les fichiers servis et ceux de l'application Node : un
   `rsync --delete` (ou équivalent) du dossier `dist/` du build de la SPA
   directement dans cette racine effacerait `app.js`, `setup.js` et
   `package.json`. Toujours déployer le build de la SPA et les fichiers du
   serveur comme deux étapes distinctes, jamais l'un en écrasant l'autre
   avec suppression des fichiers absents de la source.

3. cPanel → **Setup Node.js App** → _Create Application_
4. Version de Node : 20 ou plus
5. _Application root_ : la racine web (voir points 1 et 2 ci-dessus),
   contenant le _contenu_ de `server/` tel que décrit plus haut
6. _Application URL_ : `/db` sur le domaine qui sert la SPA — la même
   origine supprime le CORS et évite tout secret dans le bundle
7. _Application startup file_ : `app.js`
8. Variables d'environnement :
   - `BABINES_DATA_DIR` : un chemin **hors de `public_html`**, par exemple
     `/home/bane2718/babines-data`
   - `BABINES_BASE_PATH` : `/db` — **indispensable**. Passenger, configuré
     avec `PassengerBaseURI "/db"`, transmet ce préfixe tel quel dans
     chaque requête (`/db/babines`, jamais réécrit en `/babines`) ;
     `app.js` doit donc être monté sur ce même préfixe, sinon toutes les
     routes répondent `404`. Voir le diagnostic ci-dessous.
9. Cliquer **Run NPM Install**

### `node_modules` doit rester un lien symbolique

CloudLinux gère les dépendances dans un environnement virtuel séparé et
attend que `node_modules` soit un lien symbolique vers cet environnement,
posé par **Run NPM Install**. Un `npm install` lancé à la main (en SSH,
dans le répertoire applicatif) crée à la place un vrai dossier, après quoi
cPanel refuse de continuer :

> demands to store node modules for application in separate folder
> (virtual environment) pointed by symlink

Correction :

```bash
rm -rf node_modules
```

puis relancer **Run NPM Install** depuis cPanel — jamais `npm install` en
SSH sur cette application.

### Diagnostic : le montage `/db` fonctionne-t-il ?

```bash
curl https://<domaine>/db/
```

Doit renvoyer le JSON d'accueil de CouchDB (`{"couchdb":"Welcome",...}`).
Si la réponse est le HTML de la SPA ou un `404`, `BABINES_BASE_PATH` est
absent ou incorrect (voir l'étape 8 ci-dessus) — c'est le symptôme observé
en production avant l'ajout de cette variable.

### Point de vigilance : un seul processus

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

**Le vrai mécanisme est un document `_security` posé sur chaque base**
(`node_modules/express-pouchdb/lib/routes/security.js`, qui charge
`pouchdb-security`). `routes/authorization.js`, lui, ne protège que les
points d'accès système (`_config`, `_log`, `_active_tasks`, `_db_updates`,
`_restart`) — jamais les bases de données ; c'est pour ça que la première
piste semblait marcher sur `_config` tout en laissant `_all_docs` grand
ouvert.

Trois bases ont besoin de ce document : `babines` (les données), mais
aussi les deux bases système que crée express-pouchdb, `_users` et
`_replicator`. `_replicator` est la plus sensible des deux : une écriture
anonyme dedans peut faire répliquer `babines` par le serveur lui-même vers
une cible arbitraire choisie par l'attaquant, en contournant complètement
le `_security` posé sur `babines`. `setup.js` protège les trois.

### La difficulté : la base n'existe pas encore sur un serveur neuf

`_security` se pose sur une base qui existe déjà. Avant cette tâche, la
base `babines` n'était créée que comme effet de bord de la première
réplication de l'application — mais la réplication n'est déclenchée que
par une session valide (`restoreSession()` / connexion via l'écran de
Babines), et sans administrateur, aucune session ne peut s'ouvrir. Sur un
serveur tout juste déployé, ce cercle n'a pas de sortie manuelle sûre : le
temps de le résoudre à la main, `_config` reste ouvert à quiconque atteint
l'URL, qui pourrait s'y déclarer administrateur avant l'opérateur légitime.

**`server/setup.js` fait les étapes dans le seul ordre qui évite ce
piège, et vérifie son propre travail :**

1. Crée l'administrateur (ferme la fenêtre `_config` ouverte).
2. Pour `babines`, `_users` et `_replicator` : crée la base si besoin, puis
   pose `_security` dessus.
3. Vérifie chacune des trois : une lecture anonyme doit renvoyer `401`,
   une lecture authentifiée `200`. Le script échoue bruyamment (code de
   sortie non nul) si l'une des deux ne correspond pas pour l'une des
   trois bases — jamais de succès silencieux sur un déploiement mal
   protégé. Si une base système refusait durablement de recevoir de
   `_security` sur un hébergement donné, ce serait cette vérification qui
   le révèle, avec le nom de la base en cause dans le message — signaler
   alors le fait ici, dans ce README, plutôt que de le laisser filer.

### Procédure complète, à exécuter une seule fois après le déploiement

**Ne jamais lancer un second `node app.js` pour cette étape.** Sur
l'hébergement, Passenger fait déjà tourner l'unique instance qui compte,
avec `BABINES_DATA_DIR` positionné. Un `node app.js` lancé à la main dans
un shell SSH où cette variable n'est pas définie démarre une seconde
instance, avec une base LevelDB différente et vide — `setup.js` la
sécuriserait avec succès, afficherait « Vérification réussie », et la
vraie base servie par Passenger resterait sans administrateur ni
`_security`, sans que rien ne le signale. `setup.js` affiche l'URL cible
en tout premier : la vérifier avant de continuer.

```bash
# 1. Générer un mot de passe long, jamais versionné
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"

# 2. Lancer le script contre l'instance déjà servie par Passenger — jamais
#    contre un processus local lancé pour l'occasion.
BABINES_ADMIN=<NOM> \
BABINES_ADMIN_PASSWORD=<MOTDEPASSE> \
BABINES_SERVER_URL=https://<domaine>/db \
node setup.js

# 3. Se connecter depuis la SPA avec ces mêmes identifiants
```

En local, `BABINES_SERVER_URL` peut être omis : le script cible alors
`http://127.0.0.1:<PORT>` par défaut, ce qui convient au `node app.js`
lancé pour le développement.

`setup.js` n'est **délibérément pas appelé depuis `app.js`** au démarrage :
activer ce verrouillage avant qu'un compte existe est exactement le
scénario qui bloque le serveur sans recours, la raison qui a fait écarter
l'automatisation depuis le début de cette tâche.
