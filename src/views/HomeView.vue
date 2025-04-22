<script setup>
import { ref, onMounted, watch} from 'vue'
import Header from '@/components/Header.vue'
import Aside from '@/components/Aside.vue'

import PlaylistList from '@/components/playlists/PlaylistList.vue'
import PlaylistTracklist from '@/components/playlists/PlaylistTracklist.vue'
import { userSpotifyStore } from '@/stores/spotify'


const store = userSpotifyStore();
const selectedPlaylist = ref(null); // Playlist sélectionnée

const handleSelectPlaylist = async (id) => {
  selectedPlaylist.value = id; // Met à jour l'ID sélectionné
  if (id) {
    await store.fetchTracksByPlaylist(id); // Charge les morceaux de la playlist sélectionnée
  } else {
    store.tracksByPlaylist = store.likedTracks; // Utilise les morceaux likés par défaut
  }
};

onMounted(() => {
  store.fetchAllPlaylists(); // Charge toutes les playlists au montage
  store.tracksByPlaylist = store.likedTracks; // Définit les morceaux likés par défaut
});

console.log(selectedPlaylist.value); // Affiche l'ID de la playlist sélectionnée dans la console
</script>

<template>
  <main>
    <Header />
    <PlaylistList page="Playlists Spawtify" :playlists="store.playlists" @selectPlaylist="handleSelectPlaylist"
      key="home" />
    <router-link class="registered-playlist" :to="{ name: 'getData' }">
        <h3>Liste complète</h3>
    </router-link>
    <div class="youtube-to-spotify">
      <router-link :to="{ name: 'videos' }">
        <div class="container flex column">
          <div class="img-wrapper">
            <img class="os" src="../assets/os.svg" alt="os" />
          </div>
          <p>Youtube</p>
        </div>
      </router-link>
    </div>
    <Aside />
    <PlaylistTracklist :playlist="selectedPlaylist" />
  </main>
</template>

<style scoped>
.container {
  margin: 0 auto;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex.column {
  flex-direction: column;
}

.tracklist-wrapper {
  border: 2px solid black;
}

table {
  margin: 0 auto;
  padding: 2em;
  width: 100%;
  border-radius: 5px;
}

thead tr {
  text-align: left;
  font-weight: bold;
  line-height: 3em;
}

tbody th {
  text-align: left;
  font-weight: normal;
}

tbody tr:nth-child(odd) {
  background-color: #f9f9f9;
}

button {
  appearance: none;
  box-shadow: none;
  background: none;
  border: none;
}
</style>
