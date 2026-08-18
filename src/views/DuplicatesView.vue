<script setup>
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import DuplicateReview from '@/components/DuplicateReview.vue'
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()
onMounted(() => {
  if (!library.entries.length) library.load()
})
</script>

<template>
  <AppHeader />
  <main class="duplicates-view">
    <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>
    <DuplicateReview />
  </main>
</template>

<style scoped>
main.duplicates-view { display: block; }

.error {
  border: 2px solid #b00020;
  background: #ffe9ec;
  padding: 0.8em 1em;
}
</style>
