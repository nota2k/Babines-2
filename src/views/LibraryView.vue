<script setup>
import { onMounted } from 'vue'
import Header from '@/components/Header.vue'
import FilterBar from '@/components/FilterBar.vue'
import LibraryList from '@/components/LibraryList.vue'
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()

onMounted(() => {
  if (!library.entries.length && !library.isLoading) library.load()
})
</script>

<template>
  <Header />
  <main class="library">
    <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>

    <nav class="tabs">
      <router-link :to="{ name: 'import' }">Sources</router-link>
      <router-link :to="{ name: 'duplicates' }">Doublons</router-link>
    </nav>

    <FilterBar />

    <p class="count">
      {{ library.filtered.length }} entrée<span v-if="library.filtered.length > 1">s</span>
      <span v-if="library.filtered.length !== library.entries.length">
        sur {{ library.entries.length }}
      </span>
    </p>

    <LibraryList :entries="library.filtered" :total="library.entries.length" />
  </main>
</template>

<style scoped>
main.library {
  display: block;
  max-width: 1000px;
  margin: 0 auto;
}

.error {
  border: 2px solid #b00020;
  background: #ffe9ec;
  padding: 0.8em 1em;
}

.tabs {
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
}

.tabs a {
  color: black;
  border: 2px solid black;
  padding: 0.3em 0.8em;
}

.tabs a.router-link-active {
  background: var(--yellow);
}

.count {
  font-size: 0.9em;
  opacity: 0.7;
}
</style>
