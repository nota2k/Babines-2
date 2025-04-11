<script setup>
import { ref, onMounted } from 'vue'
// import { useRoute } from 'vue-router'
import Header from '@/components/Header.vue'
import Aside from '@/components/Aside.vue'

import PlaylistList from '@/components/playlists/PlaylistList.vue'
import PlaylistTracklist from '@/components/playlists/PlaylistTracklist.vue'
import { userSpotifyStore } from '@/stores/spotify'

const playlistsStore = userSpotifyStore()
const selectedPlaylistId = ref(null); // Stocke l'ID de la playlist sélectionnée

const handleSelectPlaylist = (id) => {
  if(!id){
    playlistsStore.fetchLikedTracks()
    return
  }
  selectedPlaylistId.value = id; // Met à jour l'ID sélectionné
};

onMounted(() => {
  playlistsStore.fetchAllPlaylists();
})

// const currentPlaylist = playlistsStore.currentPlaylist
// console.log(currentPlaylist)
// const handlePlaylistId = (id) => {
//   playlistsStore.currentPlaylistId = id
//   console.log(playlistsStore.currentPlaylistId)
//   // playlistsStore.fetchTracksByPlaylist(id)
// }
</script>

<template>
  <main>
    <Header />
    <PlaylistList :playlists="playlistsStore.playlists" :loading="playlistsStore.loading"/>
    <div class="youtube-to-spotify">
      <div class="container flex column">
        <div class="img-wrapper">
          <img class="os" src="../assets/os.svg" alt="os" />
        </div>
        <p>Youtube</p>
      </div>
    </div>
    <Aside />
    <!-- <PlaylistTracklist :id="selectedPlaylistId" /> -->
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

.to-youtube {
  display: inline-flex;
  justify-content: center;
  width: 100%;
}

.youtube-to-spotify {
  grid-column-start: 1;
  grid-row-start: 3;
  width: 100%;
  height: 100%;
  background: var(--yellow);
  padding: 1em;
  border: 2px solid black;
  box-sizing: border-box;
}

.os {
  width: 100%;
  height: 100%;
}

.img-wrapper {
  width: -moz-available;
  max-width: 180px;
}
</style>
