<script setup>
import { ref, onMounted, defineProps, onBeforeMount, onUpdated, watch } from 'vue'
import { userYoutubeStore } from '@/stores/youtube'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = userYoutubeStore();
let playlist = ref([])
const videos = ref([]) // Définir videos pour qu'il soit accessible dans le template
// const loading = ref(false)

const props = defineProps({
  id: {
    type: String,
    default: null
  }
})

watch(
  () => route.params.id,
  (newId) => {
    if (!newId) return; // Ignore si l'ID est manquant
    store.fetchVideosByPlaylist(newId);
    playlist.value = store.playlists.find((playlist) => playlist.id === newId);
  },
  { immediate: true }
);

</script>

<template>
  <div class="tracklist-wrapper">
    <div class="container">
      <h2 class="playlist-name">
        {{ store.currentPlaylist?.title ? store.currentPlaylist.title : 'Toutes les vidéos' }}
      </h2>

      <div class="videos-container">
        <div class="video-item" v-for="video in store.playlists" :key="video.id"
          :class="{ 'deleted-video': video.title === 'Deleted video' || video.title === 'Private video' }">
          <router-link :to="{ name: 'oneplaylist', params: { id: video.id } }">
            <img :src="video.thumbnail_url" />
            <h2>{{ video.title }}</h2>
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
.videos-container{
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding:20px;
}

.video-item {
  width: calc(100% / 4 - 20px);
  margin: 0 10px;
  height: fit-content;
  /* flex-grow: 2; */
}

.deleted-video {
  display: none;
}

.video-item img {
  width: 100%;
  height: 100%;
  background-color: aquamarine;
  border-radius: 10px;
}

.video-item h2{
  font-size: 1em;
  font-weight: 400;
  margin: 10px 0;
  color:#000;
}

/* .video-item h2::before {
  content: '';
  display: block;
  margin-bottom: 5px;;
  width: 100%;
  height: 1px;
  background-color: rgb(238, 238, 238);
} */

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
