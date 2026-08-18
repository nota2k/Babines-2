<script setup>
// L'en-tête pilote le filtre de recherche global de la bibliothèque : c'est
// le même champ que celui de FilterBar, il écrit dans library.query.
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()
</script>

<template>
  <header class="app-header">
    <router-link :to="{ name: 'library' }" class="logo-wrapper">
      <img src="../assets/logo_babines.svg" alt="Babines" class="logo" />
    </router-link>

    <label class="search">
      <span class="slash" aria-hidden="true">/</span>
      <input
        v-model="library.query"
        type="search"
        placeholder="Chercher un titre, un artiste, une note…"
        aria-label="Chercher dans la bibliothèque"
      />
    </label>

    <p class="count">
      {{ library.entries.length }} entrée<span v-if="library.entries.length > 1">s</span>
    </p>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1.2em;
  padding: 0.8em clamp(16px, 2.6vw, 36px);
  background: var(--encre);
  color: #fff;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.logo {
  height: 28px;
  width: auto;
  /* Inverse le logo (sombre par défaut) en blanc sur l'en-tête noir. */
  filter: brightness(0) invert(1);
}

.search {
  flex: 1 1 320px;
  display: flex;
  align-items: center;
  gap: 0.4em;
  background: #fff;
  border: 1px solid var(--encre);
  padding: 0.4em 0.7em;
}

.slash {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: var(--encre);
  background: var(--jaune);
  line-height: 1;
  padding: 0.15em 0.4em;
}

.search input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95em;
  color: var(--encre);
}

.count {
  flex: 0 0 auto;
  margin: 0;
  font-family: 'DM Mono', monospace;
  font-size: 0.85em;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .app-header {
    flex-wrap: wrap;
  }

  .search {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
