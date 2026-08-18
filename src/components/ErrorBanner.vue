<script setup>
// Lit le store lui-même : chaque écran l'ajoute sans avoir à relayer
// library.error / library.notice à la main, et ne peut donc pas les oublier
// (ce qui est arrivé à ImportView).
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()
</script>

<template>
  <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>
  <p v-if="library.notice" class="notice" role="status">{{ library.notice }}</p>
</template>

<style scoped>
.error {
  border: 1px solid var(--alerte);
  background: var(--alerte-fond);
  color: var(--alerte);
  padding: 0.8em 1em;
  margin: 0 0 1em;
  font-family: 'DM Sans', sans-serif;
}

.notice {
  border: 1px solid var(--jaune);
  background: #fffbe6;
  color: var(--encre);
  padding: 0.8em 1em;
  margin: 0 0 1em;
  font-family: 'DM Sans', sans-serif;
}
</style>
