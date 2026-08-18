const fs = require('fs')
const path = require('path')
const express = require('express')
const PouchDB = require('pouchdb')
const expressPouchDB = require('express-pouchdb')

// Passenger impose le port ; 5984 est celui de CouchDB, pratique en local.
const PORT = process.env.PORT || 5984

// Les fichiers LevelDB vivent hors du depot. DATA_DIR permet de les placer
// ailleurs que dans le repertoire de l'application sur l'hebergement.
const DATA_DIR = process.env.BABINES_DATA_DIR || path.join(__dirname, 'data')

// leveldown ne cree pas deux niveaux manquants d'un coup : sans ce mkdir, un
// premier lancement sur un hebergement neuf echoue sur data/_replicator, et
// rien dans le message ne dit que le repertoire est en cause.
fs.mkdirSync(DATA_DIR, { recursive: true })

const BabinesPouch = PouchDB.defaults({ prefix: `${DATA_DIR}${path.sep}` })

const app = express()

// express-pouchdb persiste sa configuration — dont l'administrateur — dans ce
// fichier. Le placer avec les donnees le garde hors du depot.
app.use(
  '/',
  expressPouchDB(BabinesPouch, {
    configPath: path.join(DATA_DIR, 'config.json'),
  }),
)

app.listen(PORT, () => {
  console.log(`Babines server sur le port ${PORT}, données dans ${DATA_DIR}`)
})
