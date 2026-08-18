<script setup>
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import DuplicateReview from '@/components/DuplicateReview.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()
onMounted(() => {
  if (!library.entries.length) library.load()
})
</script>

<template>
  <AppHeader />
  <main class="duplicates-view">
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>
    <ErrorBanner />
    <DuplicateReview />
  </main>
</template>

<style scoped>
main.duplicates-view {
  display: block;
  max-width: 800px;
  margin: 0 auto;
  padding: 1em clamp(16px, 2.6vw, 36px) 2em;
}
</style>
