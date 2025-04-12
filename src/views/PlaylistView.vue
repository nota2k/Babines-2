<script setup>
import { ref, onMounted, watch} from 'vue'
import { useRoute } from 'vue-router'
import Header from '@/components/Header.vue'
import Aside from '@/components/Aside.vue'

import PlaylistList from '@/components/playlists/PlaylistList.vue'
import PlaylistTracklist from '@/components/playlists/PlaylistTracklist.vue'
import { userSpotifyStore } from '@/stores/spotify'

const store = userSpotifyStore();
const selectedPlaylistId = ref(null); // Playlist sélectionnée

const route = useRoute();
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      selectedPlaylistId.value = newId; // Met à jour l'ID de la playlist
      await store.currentPlaylist; // Récupère les tracks pour la playlist
    }
  },
  { immediate: true }
);

const handleSelectPlaylist = async (id) => {
  selectedPlaylistId.value = id; // Met à jour l'ID sélectionné
};

onMounted(() => {
  store.fetchAllPlaylists(); // Charge toutes les playlists au montage
});

</script>

<template>
  <main>
    <Header />
    <PlaylistList page="Playlist Spawtify" :playlists="store.playlists" :loading="store.loading" @selectPlaylist="handleSelectPlaylist" />


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
    <PlaylistTracklist :id="selectedPlaylistId" @clearCache="store.likedTracks" />
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
