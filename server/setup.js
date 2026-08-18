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
 * Usage : BABINES_ADMIN=<nom> BABINES_ADMIN_PASSWORD=<motdepasse> node setup.js
 */

const PORT = process.env.PORT || 5984
const BASE_URL = process.env.BABINES_SERVER_URL || `http://127.0.0.1:${PORT}`
const ADMIN = process.env.BABINES_ADMIN
const PASSWORD = process.env.BABINES_ADMIN_PASSWORD
// Le nom de base par défaut doit rester identique à celui de l'application
// (`VITE_COUCHDB_DB || 'babines'`) : un nom codé en dur ici protégerait un
// peu n'importe quoi, pendant que la vraie base resterait ouverte.
const DB = process.env.BABINES_DB || 'babines'

if (!ADMIN || !PASSWORD) {
  console.error(
    'BABINES_ADMIN et BABINES_ADMIN_PASSWORD doivent être définis dans l’environnement.',
  )
  process.exit(1)
}

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

async function creerBase() {
  const response = await fetch(`${BASE_URL}/${DB}`, {
    method: 'PUT',
    headers: { Authorization: auth },
  })
  // 412 : la base existe déjà, ce n'est pas un échec ici.
  if (!response.ok && response.status !== 412) {
    throw new Error(`création de la base « ${DB} » : réponse ${response.status}`)
  }
  console.log(`Base « ${DB} » prête.`)
}

async function appliquerSecurite() {
  const response = await fetch(`${BASE_URL}/${DB}/_security`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      admins: { names: [ADMIN], roles: [] },
      members: { names: [ADMIN], roles: [] },
    }),
  })
  if (!response.ok) {
    throw new Error(`application de _security : réponse ${response.status}`)
  }
  console.log('Document _security appliqué.')
}

async function verifier() {
  const sansSession = await fetch(`${BASE_URL}/${DB}/_all_docs`)
  const avecSession = await fetch(`${BASE_URL}/${DB}/_all_docs`, {
    headers: { Authorization: auth },
  })

  console.log(`Sans session : ${sansSession.status}`)
  console.log(`Avec session : ${avecSession.status}`)

  if (sansSession.status !== 401 || avecSession.status !== 200) {
    throw new Error(
      'la vérification a échoué : la base n’est pas correctement protégée. ' +
        'Ne pas considérer ce déploiement comme sécurisé.',
    )
  }
  console.log('Vérification réussie : la base est protégée.')
}

async function main() {
  await creerAdmin()
  await creerBase()
  await appliquerSecurite()
  await verifier()
}

main().catch((err) => {
  console.error(`Échec : ${err.message}`)
  process.exit(1)
})
