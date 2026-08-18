# Serveur de synchronisation Babines

`express-pouchdb` expose l'API HTTP de CouchDB. Le client PouchDB de Babines
réplique dessus sans code spécifique.

## En local

    cd server
    npm install
    node app.js

Le serveur écoute sur 5984. Les données vont dans `server/data/`, exclu du dépôt.

## Sur o2switch

1. cPanel → **Setup Node.js App** → *Create Application*
2. Version de Node : 20 ou plus
3. *Application root* : le répertoire où sont déposés les fichiers de `server/`
4. *Application URL* : `/db` sur le domaine qui sert la SPA — la même origine
   supprime le CORS et évite tout secret dans le bundle
5. *Application startup file* : `app.js`
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
