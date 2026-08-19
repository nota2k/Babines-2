/**
 * Script de premier démarrage.
 *
 * Crée l'administrateur, la base et son document `_security`, dans le seul
 * ordre qui ne verrouille jamais le serveur avant qu'un compte existe :
 * l'administrateur d'abord (ça ferme la fenêtre pendant laquelle `_config`
 * est ouvert à quiconque peut atteindre l'URL), puis la base (elle n'existe
 * pas encore sur un serveur neuf), puis `_security` (qui a besoin de la
 * base pour exister). Termine en vérifiant son propre travail plutôt que de
 * supposer qu'il a réussi.
 *
 * Volontairement absent de `app.js` : automatiser ce verrouillage
 * transformerait un redémarrage sans compte préalable en serveur qui se
 * verrouille lui-même, sans personne pour le déverrouiller.
 *
 * Ce script agit sur BABINES_SERVER_URL (ou 127.0.0.1:PORT par défaut) —
 * jamais sur un second processus local lancé pour l'occasion : sur
 * l'hébergement, Passenger fait déjà tourner l'unique instance qui compte,
 * contre BABINES_DATA_DIR. Un `node app.js` lancé à la main dans un shell où
 * cette variable n'est pas définie démarrerait une seconde instance, avec
 * une base LevelDB différente et vide ; ce script la sécuriserait avec
 * succès sans que la vraie base, servie par Passenger, n'ait jamais reçu la
 * moindre protection. D'où l'affichage de l'URL ci-dessous, à vérifier
 * avant de continuer.
 *
 * Usage : BABINES_ADMIN=<nom> BABINES_ADMIN_PASSWORD=<motdepasse> \
 *         BABINES_SERVER_URL=<url publique>/db node setup.js
 */

const PORT = process.env.PORT || 5984
const BASE_URL = process.env.BABINES_SERVER_URL || `http://127.0.0.1:${PORT}`
const ADMIN = process.env.BABINES_ADMIN
const PASSWORD = process.env.BABINES_ADMIN_PASSWORD
// Le nom de base par défaut doit rester identique à celui de l'application
// (`VITE_COUCHDB_DB || 'babines'`) : un nom codé en dur ici protégerait un
// peu n'importe quoi, pendant que la vraie base resterait ouverte.
const DB = process.env.BABINES_DB || 'babines'
// _users et _replicator sont créées par express-pouchdb au démarrage. Une
// écriture anonyme dans _replicator pourrait faire répliquer babines par le
// serveur lui-même vers une cible arbitraire, contournant le _security posé
// sur babines : elles ont donc besoin de la même protection.
const SYSTEM_DBS = ['_users', '_replicator']

if (!ADMIN || !PASSWORD) {
  console.error(
    'BABINES_ADMIN et BABINES_ADMIN_PASSWORD doivent être définis dans l’environnement.',
  )
  process.exit(1)
}

// Affiché avant toute action : c'est la seule façon pour l'opérateur de
// vérifier qu'il sécurise l'instance publique et non un processus local
// démarré par erreur (voir le commentaire d'en-tête).
console.log(`Cible : ${BASE_URL}`)

const auth = `Basic ${Buffer.from(`${ADMIN}:${PASSWORD}`).toString('base64')}`

async function creerAdmin() {
  const url = `${BASE_URL}/_config/admins/${encodeURIComponent(ADMIN)}`
  const body = JSON.stringify(PASSWORD)

  let response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (response.status === 401) {
    // Un administrateur existe déjà (exécution précédente, ou serveur déjà
    // sécurisé) : retenter authentifié avec les mêmes identifiants garde le
    // script rejouable sans le rendre plus permissif.
    response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body,
    })
  }

  if (!response.ok) {
    throw new Error(`création de l’administrateur : réponse ${response.status}`)
  }
  console.log('Administrateur créé (ou déjà existant).')
}

async function creerBase(nom) {
  const response = await fetch(`${BASE_URL}/${nom}`, {
    method: 'PUT',
    headers: { Authorization: auth },
  })
  // 412 : la base existe déjà, ce n'est pas un échec ici. _users et
  // _replicator sont dans ce cas dès le premier démarrage d'express-pouchdb.
  if (!response.ok && response.status !== 412) {
    throw new Error(`création de la base « ${nom} » : réponse ${response.status}`)
  }
  console.log(`Base « ${nom} » prête.`)
}

async function appliquerSecurite(nom) {
  const response = await fetch(`${BASE_URL}/${nom}/_security`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      admins: { names: [ADMIN], roles: [] },
      members: { names: [ADMIN], roles: [] },
    }),
  })
  if (!response.ok) {
    // On ne fait pas échouer le script ici : verifier() est le juge final,
    // par une vraie requête anonyme plutôt que par le code retour de ce PUT.
    // Si une base système refuse durablement _security, c'est verifier()
    // qui le révèle, avec le nom de la base en cause.
    console.warn(
      `Avertissement : application de _security sur « ${nom} » refusée (réponse ${response.status}).`,
    )
    return
  }
  console.log(`Document _security appliqué sur « ${nom} ».`)
}

async function verifier(nom) {
  const sansSession = await fetch(`${BASE_URL}/${nom}/_all_docs`)
  const avecSession = await fetch(`${BASE_URL}/${nom}/_all_docs`, {
    headers: { Authorization: auth },
  })

  console.log(
    `« ${nom} » — sans session : ${sansSession.status}, avec session : ${avecSession.status}`,
  )

  if (sansSession.status !== 401 || avecSession.status !== 200) {
    throw new Error(
      `la vérification a échoué sur « ${nom} » : cette base n’est pas correctement protégée. ` +
        'Ne pas considérer ce déploiement comme sécurisé.',
    )
  }
}

async function main() {
  await creerAdmin()
  for (const nom of [DB, ...SYSTEM_DBS]) {
    await creerBase(nom)
    await appliquerSecurite(nom)
  }
  for (const nom of [DB, ...SYSTEM_DBS]) {
    await verifier(nom)
  }
  // Message final unique, pour ne jamais laisser croire qu'une seule base a
  // été vérifiée quand trois l'ont été.
  console.log(
    `Vérification réussie : ${[DB, ...SYSTEM_DBS].map((n) => `« ${n} »`).join(', ')} sont protégées (401 anonyme, 200 authentifié).`,
  )
}

main().catch((err) => {
  console.error(`Échec : ${err.message}`)
  process.exit(1)
})
