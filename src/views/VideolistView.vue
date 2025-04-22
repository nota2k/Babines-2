<script setup>
import { ref, onMounted, onBeforeMount, watch} from 'vue'
import Header from '@/components/Header.vue'
import Aside from '@/components/Aside.vue'

import PlaylistList from '@/components/playlist_videos/PlaylistList.vue'
import PlaylistVideoList from '@/components/playlist_videos/PlaylistVideoList.vue'
import {userYoutubeStore} from '@/stores/youtube'

const store = userYoutubeStore();
const playlist = ref([])
const selectedPlaylistId = ref(null); // Playlist sélectionnée

const handleSelectPlaylist = async (id) => {
  selectedPlaylistId.value = id; // Met à jour l'ID sélectionné
};

onMounted(() => {
  store.fetchAllPlaylists(); // Charge toutes les playlists au montage
  playlist.value = store.playlists
});

</script>

<template>
  <main>
    <Header />
    <PlaylistList page="Playlist Youtruffe" @selectPlaylist="handleSelectPlaylist" />
    <router-link class="registered-playlist" :to="{ name: 'getData' }">
      <h3>Liste complète</h3>
    </router-link>
    <div class="youtube-to-spotify">
      <router-link :to="{ name: 'home' }">
        <div class="container flex column">
          <div class="img-wrapper">
            <img class="os" src="../assets/os.svg" alt="os" />
          </div>
          <p>Spawtify</p>
        </div>
      </router-link>
    </div>
    <Aside />
    <PlaylistVideoList/>
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
