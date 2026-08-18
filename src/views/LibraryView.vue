<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FilterBar from '@/components/FilterBar.vue'
import LibraryList from '@/components/LibraryList.vue'
import PlaylistNav from '@/components/PlaylistNav.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import SidePastilles from '@/components/SidePastilles.vue'
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

        <p class="count">
          {{ library.filtered.length }} entrée<span v-if="library.filtered.length > 1">s</span>
          <span v-if="library.filtered.length !== library.entries.length">
            sur {{ library.entries.length }}
          </span>
        </p>

        <LibraryList :entries="library.filtered" :total="library.entries.length" :loading="library.isLoading" />
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
}

.count {
  font-family: 'DM Mono', monospace;
  font-size: 0.85em;
  color: var(--encre-douce);
}
</style>
