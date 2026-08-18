<script setup>
// Colonne de navigation par playlist (demande explicite de la partenaire
// humaine, cf. docs/superpowers/specs/2026-08-18-babines-v2-design-visuel.md).
// La sélection écrit dans library.playlist : le filtre reste cohérent avec
// celui de FilterBar, quelle que soit l'entrée utilisée.
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()

function select(name) {
  library.playlist = name
}
</script>

<template>
  <nav class="playlist-nav" aria-label="Playlists">
    <p class="label">Playlists</p>
    <ul>
      <li>
        <button
          type="button"
          class="entry"
          :class="{ active: library.playlist === '' }"
          @click="select('')"
        >
          Tous mes morceaux
        </button>
      </li>
      <li v-for="name in library.playlists" :key="name">
        <button
          type="button"
          class="entry"
          :class="{ active: library.playlist === name }"
          @click="select(name)"
        >
          <span class="name">{{ name }}</span>
          <span class="count">{{ library.playlistCounts[name] || 0 }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.playlist-nav {
  flex: 1 1 220px;
}

.label {
  margin: 0 0 0.6em;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre-douce);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--trait);
  background: var(--surface);
}

.entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6em;
  width: 100%;
  padding: 0.6em 0.8em;
  border: 0;
  border-bottom: 1px solid var(--trait-fin);
  background: transparent;
  color: var(--encre);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9em;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s linear, color 0.15s linear;
}

li:last-child .entry {
  border-bottom: 0;
}

.entry:hover {
  background: var(--jaune);
}

.entry.active {
  background: var(--encre);
  color: #fff;
}

.count {
  font-family: 'DM Mono', monospace;
  font-size: 0.85em;
  color: var(--encre-tres-douce);
}

.entry.active .count {
  color: #fff;
}
</style>
