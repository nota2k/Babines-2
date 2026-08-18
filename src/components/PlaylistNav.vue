<script setup>
// Colonne de navigation par playlist (demande explicite de la partenaire
// humaine, cf. docs/superpowers/specs/2026-08-18-babines-v2-design-visuel.md).
// La sélection écrit dans library.playlist : le filtre reste cohérent avec
// celui de FilterBar, quelle que soit l'entrée utilisée. Le sélecteur de
// plateforme écrit dans library.platform, pour la même raison.
import { computed, watch } from 'vue'
import { useLibraryStore } from '@/stores/library.js'
import { PLATFORM_LABELS, platformLabel } from '@/services/platforms.js'

const library = useLibraryStore()

const platformOptions = Object.keys(PLATFORM_LABELS)

const displayedPlaylists = computed(() =>
  library.platform === '' ? library.playlists : library.playlistsByPlatform[library.platform] ?? [],
)

function select(name) {
  library.playlist = name
}

// Changer de plateforme peut faire disparaître la playlist actuellement
// sélectionnée de la liste affichée : sans ce garde-fou, la bibliothèque
// paraîtrait vide sans raison visible à l'écran.
watch(
  () => library.platform,
  () => {
    if (library.playlist && !displayedPlaylists.value.includes(library.playlist)) {
      library.playlist = ''
    }
  },
)
</script>

<template>
  <nav class="playlist-nav" aria-label="Playlists">
    <div class="label-row">
      <h2 class="label">Playlists</h2>
      <span class="total">{{ displayedPlaylists.length }}</span>
    </div>
    <select v-model="library.platform" class="platform-select" aria-label="Filtrer les playlists par source">
      <option value="">Toutes les sources</option>
      <option v-for="platform in platformOptions" :key="platform" :value="platform">
        {{ platformLabel(platform) }}
      </option>
    </select>
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
      <li v-if="displayedPlaylists.length === 0" class="empty">
        Aucune playlist sur cette source.
      </li>
      <li v-for="name in displayedPlaylists" :key="name">
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

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6em;
  margin: 0 0 0.6em;
}

.label {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre-douce);
}

.total {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--encre-douce);
}

.platform-select {
  display: block;
  width: 100%;
  margin: 0 0 0.6em;
  padding: 0.5em 0.7em;
  border: 1px solid var(--trait);
  background: var(--surface);
  color: var(--encre);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9em;
  cursor: pointer;
  transition: background-color 0.15s linear, color 0.15s linear, border-color 0.15s linear;
}

.platform-select:hover {
  background: var(--jaune);
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

.empty {
  padding: 0.6em 0.8em;
  color: var(--encre-douce);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85em;
  font-style: italic;
}

.entry.active .count {
  color: #fff;
}
</style>
