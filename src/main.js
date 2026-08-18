import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { getDb, ensureIndexes, startReplication } from '@/services/db.js'
import { migrateAll } from '@/services/migrate.js'
import { useLibraryStore } from '@/stores/library.js'

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
      library.notice =
        `Migration incomplète : ${migration.failed.length} document(s) n'ont pas pu être convertis. ` +
        `Ils sont toujours en base et seront retentés au prochain démarrage.`
    }
  } catch (err) {
    library.error = `Démarrage impossible : ${err.message}`
    return
  }

  startReplication(db, {
    url: import.meta.env.VITE_COUCHDB_URL,
    dbName: import.meta.env.VITE_COUCHDB_DB || 'babines',
    onStatus: (status) => {
      const previous = library.syncStatus
      library.syncStatus = status
      // Les modifications arrivées d'un autre appareil sont visibles dès la fin d'un cycle.
      if (status === 'idle' && previous === 'pending') library.load()
    },
  })

  // Safari purge IndexedDB après ~7 jours sans ouverture. La demande peut être
  // refusée ; ce n'est pas grave, CouchDB rapatrie les données à la réouverture.
  navigator.storage?.persist?.().catch(() => {})
}

bootstrap()
