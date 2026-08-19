import { resolveRemoteUrl } from '@/services/db.js'

/**
 * Session CouchDB, telle qu'express-pouchdb l'expose.
 *
 * Le cookie est posé par le serveur en HttpOnly : le JavaScript ne le voit
 * jamais. On ne retient donc ici que le nom, pour savoir s'il faut afficher
 * l'écran de connexion — la preuve d'authentification, elle, vit dans le
 * cookie et voyage seule.
 */
let session = null

const base = () => {
  const url = import.meta.env.VITE_COUCHDB_URL || '/db'
  try {
    return `${resolveRemoteUrl(url)}/_session`
  } catch {
    // resolveRemoteUrl a besoin d'une origine pour résoudre une URL relative ;
    // en test (environnement node, sans window.location), il n'y en a pas.
    // fetch, lui, sait résoudre une URL relative tout seul dans un navigateur.
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
    // 401 est le cas courant ; tout autre code mérite d'être montré tel quel,
    // parce qu'il ne se corrige pas en retapant le mot de passe.
    if (response.status === 401) throw new Error('Identifiants refusés.')
    throw new Error(`Connexion impossible : réponse ${response.status} du serveur.`)
  }

  session = { name }
  return session
}

/**
 * Retrouve une session encore valide au démarrage.
 *
 * Le cookie survit au rechargement, pas l'état de ce module : sans cette
 * vérification, l'écran de connexion réapparaîtrait devant un utilisateur
 * déjà authentifié.
 */
export async function restoreSession() {
  try {
    const response = await fetch(base(), { method: 'GET' })
    if (!response.ok) return null
    const { userCtx } = await response.json()
    session = userCtx?.name ? { name: userCtx.name } : null
    return session
  } catch {
    // Hors ligne au démarrage : on reste déconnecté, la bibliothèque locale
    // fonctionne quand même et la session sera retrouvée au retour du réseau.
    return null
  }
}

export async function closeSession() {
  const ouverte = session
  // On oublie la session avant l'appel : ne pas pouvoir joindre le serveur ne
  // doit pas laisser l'utilisateur coincé dans un état qu'il ne peut plus
  // quitter.
  session = null
  if (!ouverte) return
  try {
    await fetch(base(), { method: 'DELETE' })
  } catch {
    // Le cookie expirera de lui-même ; rien à dire à l'utilisateur.
  }
}
