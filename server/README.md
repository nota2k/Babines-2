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
et laisse la base accessible à quiconque peut l'atteindre. Deux réglages sont
nécessaires, **dans cet ordre précis** :

1. **Créer l'administrateur en premier**, avec un mot de passe long généré
   aléatoirement, jamais versionné :

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   curl -s -X PUT http://127.0.0.1:5984/_config/admins/<NOM> \
     -H 'Content-Type: application/json' -d '"<MOTDEPASSE>"'
   ```

2. **Exiger une session valide en second**, authentifié comme cet
   administrateur :

   ```bash
   curl -s -u '<NOM>:<MOTDEPASSE>' -X PUT \
     http://127.0.0.1:5984/_config/couch_httpd_auth/require_valid_user \
     -H 'Content-Type: application/json' -d '"true"'
   ```

**L'ordre n'est pas cosmétique.** Inverser les deux verrouille le serveur
avant qu'un compte existe, et plus rien ne peut alors s'authentifier pour
revenir en arrière. C'est pourquoi ce réglage n'est délibérément pas
automatisé dans `app.js` : un serveur qui se verrouille lui-même au premier
démarrage se briquerait sur o2switch, sans compte pour le déverrouiller.

Vérifier ensuite que l'accès anonyme est bien refusé :

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/babines/_all_docs
```

Attendu : `401`. **À la vérification de cette procédure, la réponse obtenue a
été `200`** — malgré l'administrateur créé et `require_valid_user` activé
(confirmés tous deux dans `server/data/config.json`, et `/_config` refuse
bien l'accès anonyme avec `401`). Les routes de base de données
(`/babines`, `/babines/_all_docs`, `/_all_dbs`) restent accessibles sans
session. Ce point n'est donc **pas résolu** ; voir le rapport de la tâche 4
pour le détail des commandes exécutées.
