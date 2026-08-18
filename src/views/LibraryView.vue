<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FilterBar from '@/components/FilterBar.vue'
import LibraryList from '@/components/LibraryList.vue'
import PlaylistNav from '@/components/PlaylistNav.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import SidePastilles from '@/components/SidePastilles.vue'
import SortBar from '@/components/SortBar.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
import LoginPanel from '@/components/LoginPanel.vue'
import { currentSession, restoreSession } from '@/services/session.js'
import { useLibraryStore } from '@/stores/library.js'
import { useImportStore } from '@/stores/import.js'

const library = useLibraryStore()
const imports = useImportStore()

const session = ref(currentSession())

function connecte(ouverte) {
  session.value = ouverte
  library.startReplication?.()
}

// import.meta n'est pas accessible depuis le template : sans URL de
// synchronisation, l'application est en local pur et proposer une connexion
// n'aurait aucun sens.
const VITE_COUCHDB_URL = import.meta.env.VITE_COUCHDB_URL

const resolveOnReconnect = () => imports.resolvePending().catch(() => {})

onMounted(() => {
  if (!library.entries.length && !library.isLoading) library.load()
  // `<router-view :key>` démonte et remonte cette vue à chaque changement de
  // route, et une capture y mène systématiquement : sans retrait, les écouteurs
  // s'accumuleraient à chaque aller-retour.
  if (navigator.onLine) imports.resolvePending().catch(() => {})
  window.addEventListener('online', resolveOnReconnect)

  // Le cookie de session survit au rechargement, pas cette vue : sans cette
  // verification, l'ecran de connexion reapparaitrait devant un utilisateur
  // deja authentifie. La replication elle-meme est deja relancee par
  // main.js ; ici on ne fait que rafraichir l'affichage.
  restoreSession().then((restaure) => {
    if (restaure) session.value = restaure
  })
})

onUnmounted(() => {
  window.removeEventListener('online', resolveOnReconnect)
})
</script>

<template>
  <AppHeader />
  <main class="library">
    <ErrorBanner />

    <SyncIndicator />
    <LoginPanel v-if="!session && VITE_COUCHDB_URL" @connecte="connecte" />

    <QuickAdd />

    <div class="columns">
      <PlaylistNav />

      <div class="content">
        <FilterBar />

        <section class="list-card">
          <div class="list-header">
            <h1>{{ library.playlist || 'Tous mes morceaux' }}</h1>
            <span class="count">
              {{ library.filtered.length }} entrée<span v-if="library.filtered.length > 1">s</span>
              <span v-if="library.filtered.length !== library.entries.length">
                sur {{ library.entries.length }}
              </span>
            </span>
          </div>

          <SortBar />

          <LibraryList
            :entries="library.filtered"
            :total="library.entries.length"
            :loading="library.isLoading"
          />
        </section>
      </div>

      <SidePastilles />
    </div>
  </main>
</template>

<style scoped>
main.library {
  display: block;
  max-width: 1560px;
  margin: 0 auto;
  padding: 1em clamp(16px, 2.6vw, 36px) 2em;
}

.columns {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 2.6vw, 36px);
  align-items: flex-start;
}

.content {
  flex: 999 1 min(100%, 380px);
  /* Sans cette ligne, un élément flex refuse de descendre sous la largeur
     minimale de son contenu : le tableau de morceaux imposait alors plus de
     500 px, et la colonne des pastilles basculait sous la liste dès que la
     fenêtre passait sous ~1030 px. Les colonnes des lignes savent se tronquer,
     autant les laisser faire. */
  min-width: 0;
}

.list-card {
  /* Définition unique des colonnes de la liste, partagée par l'en-tête de
     tri (SortBar.vue) et les lignes (EntryRow.vue) : rang et badge de
     largeur fixe, titre/artiste/note en proportions souples, puis tags et
     sources calés à droite. Toute modification des proportions se fait ici,
     à un seul endroit, pour que les deux ne puissent plus diverger.
     Aucune colonne en `auto` : une colonne qui se dimensionne sur son
     contenu calcule une largeur différente selon ce qu'elle contient
     (une pastille SPOTIFY dans une ligne, « Modifié récemment » dans
     l'en-tête), ce qui désaligne les deux grilles. Tags et sources ont
     donc une largeur fixe — assez pour une pastille de plateforme, avec
     retour à la ligne si une entrée en cumule plusieurs.
     Titre/artiste/note en 5fr/3fr/2fr (50 %/30 %/20 % de l'espace souple) :
     avec ~1675 entrées importées de YouTube, la colonne note est vide tant
     qu'aucune n'est annotée, alors que les titres, longs, se tronquaient
     souvent en 3fr/2fr/2fr. La note garde 2fr pour rester lisible une fois
     annotée. */
  --grille-ligne: 26px 16px 74px minmax(0, 5fr) minmax(0, 3fr) minmax(0, 2fr) minmax(0, 90px)
    minmax(0, 96px);

  background: var(--surface);
  border: 1px solid var(--trait);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.list-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 24px;
  padding: 24px 20px 18px;
  border-bottom: 1px solid var(--trait);
}

.list-header h1 {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(20px, 2.6vw, 30px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.count {
  font-family: 'DM Mono', monospace;
  font-size: 0.85em;
  color: var(--encre-douce);
  white-space: nowrap;
}
</style>
