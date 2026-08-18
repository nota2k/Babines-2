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
    await migrateAll(db)
    await library.load()
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
}

bootstrap()
