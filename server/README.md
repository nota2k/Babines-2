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
et laisse chaque base accessible à quiconque peut l'atteindre. `express-pouchdb`
n'implémente pas le réglage CouchDB `require_valid_user` ; la protection passe
par un document `_security` posé sur la base elle-même
(`node_modules/express-pouchdb/lib/routes/security.js`, qui charge
`pouchdb-security`). `routes/authorization.js`, lui, ne protège que les
points d'accès système (`_config`, `_log`, `_active_tasks`, `_db_updates`,
`_restart`) — jamais les bases de données.

La base `babines` n'existe qu'après la première réplication depuis
l'application : `_security` ne peut donc se poser qu'après elle. L'ordre
complet, **à respecter précisément** :

1. **Démarrer le serveur**, et laisser l'application s'y connecter une
   première fois (en développement, ouvrir la SPA suffit : la réplication
   crée la base `babines` toute seule).

2. **Créer l'administrateur**, avec un mot de passe long généré
   aléatoirement, jamais versionné :

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   curl -s -X PUT http://127.0.0.1:5984/_config/admins/<NOM> \
     -H 'Content-Type: application/json' -d '"<MOTDEPASSE>"'
   ```

3. **Poser `_security` sur la base `babines`**, authentifié comme cet
   administrateur — un `members.names` non vide est ce qui ferme l'accès
   anonyme ; une liste vide signifie « publique » :

   ```bash
   curl -s -u '<NOM>:<MOTDEPASSE>' -X PUT \
     http://127.0.0.1:5984/babines/_security \
     -H 'Content-Type: application/json' \
     -d '{"admins":{"names":["<NOM>"],"roles":[]},"members":{"names":["<NOM>"],"roles":[]}}'
   ```

**L'ordre n'est pas cosmétique.** Créer l'administrateur avant `_security`
laisse toujours un compte capable de revenir en arrière ; pas de base avant
l'administrateur, pas d'administrateur avant `_security`. C'est pourquoi ce
réglage n'est délibérément pas automatisé dans `app.js` : l'automatiser
imposerait un ordre de démarrage rigide (base créée, puis administrateur,
puis verrouillage) qu'un redéploiement ou un redémarrage de Passenger
pourrait facilement inverser.

Vérifier ensuite, dans cet ordre :

```bash
# sans session — doit refuser
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/babines/_all_docs
# → 401

# avec session — doit accepter
curl -s -c /tmp/babines-cookie -X POST http://127.0.0.1:5984/_session \
  -H 'Content-Type: application/json' -d '{"name":"<NOM>","password":"<MOTDEPASSE>"}'
curl -s -b /tmp/babines-cookie -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/babines/_all_docs
# → 200

# _config, sans session — doit refuser (verifie que la protection admin
# elle-meme n'a pas ete cassee par ce qui precede)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/_config
# → 401
```
