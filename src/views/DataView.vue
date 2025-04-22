<script setup>
import { ref, onMounted, watch} from 'vue'
import Header from '@/components/Header.vue'
import Aside from '@/components/Aside.vue'

import PlaylistList from '@/components/playlists/PlaylistList.vue'
import Tracklist from '@/components/playlists/Tracklist.vue'
import { userSpotifyStore } from '@/stores/spotify'
import { useCouchDBStore } from '@/stores/couchdb'


const couchdb = useCouchDBStore();
const playlist = userSpotifyStore();
let tracks = ref([]); // Liste des morceaux
onMounted(async () => {
  try {
    const allTracks = await couchdb.fetchAllDocuments(); // Attendre la résolution de la Promise
    tracks.value = allTracks; // Assigner les données une fois disponibles
    // console.log('allTracks', tracks.value);
  } catch (error) {
    console.error('Erreur lors de la récupération des morceaux :', error);
  }
});

</script>

<template>
  <main>
    <Header />
    <PlaylistList page="Playlists Spawtify" :playlists="playlist.playlists" @selectPlaylist="handleSelectPlaylist"
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
    <Tracklist />
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
