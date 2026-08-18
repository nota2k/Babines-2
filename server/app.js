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

// Passenger, configuré avec PassengerBaseURI, transmet le préfixe de
// l'Application URL tel quel : une requête vers /db/babines arrive à
// l'application sous /db/babines, jamais réécrite en /babines. Sans monter
// l'app sur ce même préfixe, chaque route répond 404 (vérifié en production :
// changer le montage pour /db a transformé tous les 404 en 200). '/' reste le
// défaut pour que le développement local continue de fonctionner via le proxy
// Vite, qui lui *retire* /db avant de transmettre la requête.
const BASE_PATH = process.env.BABINES_BASE_PATH || '/'

// Fauxton est une console d'administration ouverte à quiconque atteint
// l'URL : aucun intérêt à la publier sur le domaine de l'utilisateur. Doit
// être déclaré avant express-pouchdb, et sous le même préfixe que lui pour
// intercepter la route avant qu'elle n'atteigne le module.
app.use(`${BASE_PATH === '/' ? '' : BASE_PATH}/_utils`, (_req, res) => res.sendStatus(404))

// express-pouchdb persiste sa configuration — dont l'administrateur — dans ce
// fichier. Le placer avec les donnees le garde hors du depot.
app.use(
  BASE_PATH,
  expressPouchDB(BabinesPouch, {
    configPath: path.join(DATA_DIR, 'config.json'),
  }),
)

app.listen(PORT, () => {
  console.log(`Babines server sur le port ${PORT}, données dans ${DATA_DIR}`)
})
