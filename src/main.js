import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { getDb, ensureIndexes, startReplication } from '@/services/db.js'
import { migrateAll } from '@/services/migrate.js'
import { useLibraryStore } from '@/stores/library.js'
import { restoreSession, closeSession } from '@/services/session.js'

// Petit helper d'accord : « 1 document » mais « 2 documents ».
const pluriel = (n, singulier, plurielMot = singulier + 's') =>
  `${n} ${n > 1 ? plurielMot : singulier}`

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

async function bootstrap() {
  const library = useLibraryStore()
  const db = getDb()

  try {
    await ensureIndexes(db)
    const migration = await migrateAll(db)
    await library.load()

    // Un échec partiel de migration ne lève pas d'exception : sans ça, il resterait
    // invisible. Ce qui a échoué est resté en base, rien n'est perdu, mais il faut
    // le dire.
    if (migration.failed.length) {
      // `notice` et non `error` : c'est un avertissement, pas une panne, et il ne
      // doit pas être effacé par le premier cycle de réplication qui écrit dans
      // `error` via guard().
      const verbe =
        migration.failed.length > 1 ? 'n’ont pas pu être convertis' : 'n’a pas pu être converti'
      library.notice =
        `Migration incomplète : ${pluriel(migration.failed.length, 'document', 'documents')} ${verbe}. ` +
        `Ils sont toujours en base et seront retentés au prochain démarrage.`
    }
  } catch (err) {
    library.error = `Démarrage impossible : ${err.message}`
    return
  }

  // La réplication attend une session ; le hors-ligne, lui, n'attend rien.
  // Une entrée capturée sans être connecté partira à la prochaine session.
  // Point d'entrée unique : startReplication (services/db.js) ferme toute
  // réplication déjà en vol avant d'en ouvrir une autre, donc rien ici n'a
  // besoin de vérifier qu'aucune autre n'est déjà en cours.
  const repliquer = () =>
    startReplication(db, {
      url: import.meta.env.VITE_COUCHDB_URL,
      dbName: import.meta.env.VITE_COUCHDB_DB || 'babines',
      onStatus: (status) => {
        const previous = library.syncStatus
        library.syncStatus = status
        // Les modifications arrivées d'un autre appareil sont visibles dès la fin d'un cycle.
        if (status === 'idle' && previous === 'pending') library.load()
        // Géré ici plutôt que dans LibraryView : ce module vit pour toute la
        // durée de l'application, alors que la vue se démonte à chaque
        // changement de route. Un 401 reçu pendant que la vue est ailleurs
        // ne doit pas laisser la session locale croire, à tort, qu'elle est
        // toujours valide.
        if (status === 'auth-error') closeSession()
      },
    })

  library.startReplication = repliquer
  // Le cookie de session survit au rechargement ; sans cette vérification,
  // la réplication resterait en attente d'une reconnexion pourtant inutile.
  if (await restoreSession()) repliquer()

  // Lancé hors ligne — le scénario même que la PWA est censée couvrir —
  // restoreSession() renvoie null et rien ne retente ensuite : sans cet
  // écouteur, un cookie pourtant valide resterait ignoré jusqu'au prochain
  // rechargement complet de l'application.
  window.addEventListener('online', () => {
    restoreSession().then((restauree) => {
      if (restauree) repliquer()
    })
  })

  // Safari purge IndexedDB après ~7 jours sans ouverture. La demande peut être
  // refusée ; ce n'est pas grave, CouchDB rapatrie les données à la réouverture.
  navigator.storage?.persist?.().catch(() => {})
}

bootstrap()
