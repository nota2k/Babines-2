<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FilterBar from '@/components/FilterBar.vue'
import LibraryList from '@/components/LibraryList.vue'
import PlaylistNav from '@/components/PlaylistNav.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import SidePastilles from '@/components/SidePastilles.vue'
import SortBar from '@/components/SortBar.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
import { useLibraryStore } from '@/stores/library.js'
import { useImportStore } from '@/stores/import.js'

const library = useLibraryStore()
const imports = useImportStore()

const resolveOnReconnect = () => imports.resolvePending().catch(() => {})

onMounted(() => {
  if (!library.entries.length && !library.isLoading) library.load()
  // `<router-view :key>` démonte et remonte cette vue à chaque changement de
  // route, et une capture y mène systématiquement : sans retrait, les écouteurs
  // s'accumuleraient à chaque aller-retour.
  if (navigator.onLine) imports.resolvePending().catch(() => {})
  window.addEventListener('online', resolveOnReconnect)
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

          <LibraryList :entries="library.filtered" :total="library.entries.length" :loading="library.isLoading" />
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
