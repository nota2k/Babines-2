<script setup>
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()

function reset() {
  library.query = ''
  library.platform = ''
  library.playlist = ''
  library.tag = ''
  library.entryType = ''
}
</script>

<template>
  <div class="filters">
    <input v-model="library.query" type="search" placeholder="Chercher un titre, un artiste, une note…" />

    <select v-model="library.entryType" aria-label="Type d’entrée">
      <option value="">Tout</option>
      <option value="track">Morceaux</option>
      <option value="artist">Artistes</option>
    </select>

    <select v-model="library.platform" aria-label="Plateforme">
      <option value="">Toutes les plateformes</option>
      <option v-for="platform in library.platforms" :key="platform" :value="platform">{{ platform }}</option>
    </select>

    <select v-model="library.playlist" aria-label="Playlist">
      <option value="">Toutes les playlists</option>
      <option v-for="name in library.playlists" :key="name" :value="name">{{ name }}</option>
    </select>

    <select v-model="library.tag" aria-label="Tag">
      <option value="">Tous les tags</option>
      <option v-for="tag in library.tags" :key="tag" :value="tag">{{ tag }}</option>
    </select>

    <select v-model="library.sortBy" aria-label="Tri">
      <option value="updatedAt">Modifié récemment</option>
      <option value="createdAt">Ajouté récemment</option>
      <option value="title">Titre</option>
      <option value="artist">Artiste</option>
    </select>

    <button type="button" @click="library.sortAsc = !library.sortAsc">
      {{ library.sortAsc ? '↑' : '↓' }}
    </button>

    <button type="button" @click="reset">Réinitialiser</button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  align-items: center;
  margin: 1em 0;
}

input[type='search'] {
  flex: 1 1 260px;
  padding: 0.6em;
  border: 2px solid black;
}

select,
button {
  padding: 0.5em;
  border: 2px solid black;
  background: white;
  cursor: pointer;
}
</style>
