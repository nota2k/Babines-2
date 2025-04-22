<script setup>
import { ref, onMounted, defineEmits, defineProps } from 'vue'
import { storeToRefs } from 'pinia'
import { userSpotifyStore } from '@/stores/spotify.js'

const store = userSpotifyStore()

const props = defineProps({
  page: String,
  playlists: {
    type: Array
  }
});

const emit = defineEmits(['selectPlaylist']);

</script>

<template>
  <div class="playlist-wrapper">
    <!-- <div v-if="loading">Chargement...</div> -->
    <div>
      <div class="container">
        <button class="close" @click="$emit('close')">Fermer</button>
        <h2>{{props.page}}</h2>
        <ul>
          <router-link :to="{ name: 'playlist', params: { id: playlist.id }}" v-for="playlist in playlists" :key="playlist.id">
            <li class="playlist-item" @click="$emit('selectPlaylist', playlist.id)">
              {{ playlist.name }}
            </li>
          </router-link>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlist-wrapper {
  grid-column-start: 1;
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid black;
  height: 55vh;
  position: relative;
}

h2 {
  width: -moz-available;
  margin-bottom: 0;
  position: sticky;
  top: 0;
  background: white;
  padding: 1em;
  left: 0;
  border-bottom: 2px solid black;
  margin-top: 0;
}

ul {
  list-style-type: none;
  padding: 0;
  margin-top: 0;
  overflow: scroll;
}

li {
  margin: 0;
  padding: 10px;
  cursor: pointer;
}

li:nth-child(odd) {
  background: #f9f9f9;
}

.playlist-wrapper {
  grid-column-start: 1;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid black;
  max-height: 70vh;
  position: relative;
}

h2 {
  width: -moz-available;
  margin-bottom: 0;
  position: sticky;
  top: 0;
  background: white;
  padding: 1em;
  left: 0;
  border-bottom: 2px solid black;
  margin-top: 0;
}

ul {
  list-style-type: none;
  padding: 0;
  margin-top: 0;
  overflow: scroll;
}

li {
  margin: 0;
  padding: 10px;
  cursor: pointer;
}

li:nth-child(odd) {
  background: #f9f9f9;
}

li {
  text-decoration: none;
  color: black;
  transition: 0.2s ease-in-out all;
  margin-left: 0;
}

@media (hover: hover) {
  li:hover {
    background-color: var(--yellow);
    font-weight: 500;
    margin-left: 5px;
  }
}
</style>
