import { resolveRemoteUrl } from '@/services/db.js'

/**
 * Session CouchDB, telle qu'express-pouchdb l'expose.
 *
 * Le cookie est pose par le serveur en HttpOnly : le JavaScript ne le voit
 * jamais. On ne retient donc ici que le nom, pour savoir s'il faut afficher
 * l'ecran de connexion — la preuve d'authentification, elle, vit dans le
 * cookie et voyage seule.
 */
let session = null

const base = () => {
  const url = import.meta.env.VITE_COUCHDB_URL || '/db'
  try {
    return `${resolveRemoteUrl(url)}/_session`
  } catch {
    // resolveRemoteUrl a besoin d'une origine pour resoudre une URL relative ;
    // en test (environnement node, sans window.location), il n'y en a pas.
    // fetch, lui, sait resoudre une URL relative tout seul dans un navigateur.
    return `${url}/_session`
  }
}

export function currentSession() {
  return session
}

export async function openSession({ name, password }) {
  const response = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })

  if (!response.ok) {
    // 401 est le cas courant ; tout autre code merite d'etre montre tel quel,
    // parce qu'il ne se corrige pas en retapant le mot de passe.
    if (response.status === 401) throw new Error('Identifiants refusés.')
    throw new Error(`Connexion impossible : réponse ${response.status} du serveur.`)
  }

  session = { name }
  return session
}

export async function closeSession() {
  const ouverte = session
  // On oublie la session avant l'appel : ne pas pouvoir joindre le serveur ne
  // doit pas laisser l'utilisateur coince dans un etat qu'il ne peut plus
  // quitter.
  session = null
  if (!ouverte) return
  try {
    await fetch(base(), { method: 'DELETE' })
  } catch {
    // Le cookie expirera de lui-meme ; rien a dire a l'utilisateur.
  }
}
