<script setup>
import { ref, onMounted, defineProps, onBeforeMount, onUpdated, watch } from 'vue'
import { userYoutubeStore } from '@/stores/youtube'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = userYoutubeStore();
const videos = ref([]) // Définir videos pour qu'il soit accessible dans le template
const loading = ref(false)

const props = defineProps({
  id: {
    type: String,
  }
})

// Fonction pour charger les vidéos
async function loadVideos(playlistId) {
  loading.value = true
  try {
    // Attendez que les données soient récupérées
    videos.value = await store.fetchVideosByPlaylist(playlistId)
    // Trouver la playlist courante
    store.currentPlaylist = store.playlists.find(playlist => playlist.id === playlistId)
  } catch (error) {
    console.error('Erreur lors du chargement des vidéos:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadVideos(newId)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="tracklist-wrapper">
    <div class="container">
      <div v-if="loading">Chargement...</div>

      <h2 class="playlist-name">
        {{ store.currentPlaylist?.name ? store.currentPlaylist.name : 'Toutes les vidéos' }}
      </h2>

      <div class="videos-container" v-if="!loading">
        <div class="video-item" v-for="video in videos" :key="video.id">
          <router-link :to="{ name: 'oneplaylist', params: { id: video.id } }">
            <img :src="video.thumbnail" alt="Video Thumbnail" />
            <h3>{{ video.title }}</h3>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
<style scope>
.container {
  margin: 0 auto;
}

.playlist-name {
  padding: 26px;
  background-color: var(--yellow);
  margin: 0;
  border-bottom: 2px solid black;
}

.tracklist-wrapper {
  grid-row: 2 / 7;
  height: fit-content;
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

.filter {
  top: 3px;
  position: relative;
  cursor: pointer;
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

.filter img {
  width: 14px;
  margin-left: 10px;
}

.filter img[data-value='true'] {
  transform: rotate(180deg);
}

.tracklist-wrapper {
  /* border: 2px solid black; */
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
</style>
