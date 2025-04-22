<script setup>
import { ref, onMounted, defineProps, onBeforeMount, onUpdated, watch } from 'vue'
import { useCouchDBStore } from '@/stores/couchdb'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useCouchDBStore();
let tracks = ref([]); // Liste des morceaux
let allTracks = ref([]); // Liste des morceaux
let playlist = ref([])
let isSorted = ref(false)
let isSortedAsc = ref(true)
let sortedBy = ref('')

// Charger les données au montage du composant
onMounted(() => {
  store.fetchAllDocuments()
    .then((allTracks) => {
      tracks.value = allTracks; // Assigner les données une fois disponibles
      // console.log('allTracks', tracks.value);
    })
    .catch((error) => {
      console.error('Erreur lors de la récupération des morceaux :', error);
    });
});

console.log('allTracks', tracks.value);

const sortTracksByArtist = (event) => {
  allTracks.value.sort((a, b) => {
    if (a.artist.toLowerCase() < b.artist.toLowerCase())
      return isSortedAsc.value ? -1 : 1
    if (a.artist.toLowerCase() > b.artist.toLowerCase())
      return isSortedAsc.value ? 1 : -1
    return 0
  })
  isSorted.value = true
  isSortedAsc.value = !isSortedAsc.value
  sortedBy.value = event.target.getAttribute('data-value')
  event.target.setAttribute('data-value', isSortedAsc.value)
}

const sortTracksByTitle = (event) => {
  tracks.value = store.tracksByPlaylist
  tracks.value.sort((a, b) => {
    if (a.track.title.toLowerCase() < b.track.title.toLowerCase()) return isSortedAsc.value ? -1 : 1
    if (a.track.title.toLowerCase() > b.track.title.toLowerCase()) return isSortedAsc.value ? 1 : -1
    return 0
  })
  isSorted.value = true
  isSortedAsc.value = !isSortedAsc.value
  sortedBy.value = event.target.getAttribute('data-value')
  event.target.setAttribute('data-value', isSortedAsc.value)
}

const sortTracksByAdded = (event) => {
  tracks.value = store.tracksByPlaylist
  tracks.value.sort((a, b) => {
    if (a.track.added_at.toLowerCase() < b.track.added_at.toLowerCase())
      return isSortedAsc.value ? -1 : 1
    if (a.track.added_at.toLowerCase() > b.track.added_at.toLowerCase())
      return isSortedAsc.value ? 1 : -1
    return 0
  })
  isSorted.value = true
  isSortedAsc.value = !isSortedAsc.value
  sortedBy.value = event.target.getAttribute('data-value')
  event.target.setAttribute('data-value', isSortedAsc.value)
}

</script>

<template>
  <!-- <div v-if="loading">Chargement...</div> -->
  <div class="tracklist-wrapper">
    <div class="container">
      <AddTrackManually />
      <h2 class="playlist-name">
        {{
          store.currentPlaylist?.name
            ? store.currentPlaylist.name
            : 'Tous mes morceaux'
        }}
      </h2>
      <table class="">
        <thead class="">
          <tr>
            <th class="">
              <span>Titre</span>
              <button class="filter" @click="sortTracksByTitle" data-value="true">
                <img src="../../assets/arrow-down.svg" />
              </button>
            </th>
            <th class="">
              <span>Artiste</span>
              <button class="filter" @click="sortTracksByArtist" data-value="true">
                <img src="../../assets/arrow-down.svg" />
              </button>
            </th>
            <th class="">
              <span>Album</span>
              <button class="filter" @click="sortTracksByArtist" data-value="true">
                <img src="../../assets/arrow-down.svg" />
              </button>
            </th>
            <th class="">
              <span>Ajouté le</span>
              <button class="filter" @click="sortTracksByAdded" data-value="true">
                <img src="../../assets/arrow-down.svg" />
              </button>
            </th>
            <th class=""><span> </span></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="track in tracks "
            :key="track._id"
          >
            <td class="title">
              {{ track.title }}
            </td>
            <td class="artist">
              {{ track.artist }}
            </td>
            <td class="album">
              {{ track.album }}
            </td>
            <td class="added">
              {{ track.added_at }}
            </td>
            <td class="to-youtube" @click="goToVideoView">
              <!-- <router-link
                :to="{
                  name: 'getvideo',
                  params: {
                    title: encodeURIComponent(track.track.title),
                    artist: encodeURIComponent(track.track.artist)
                  }
                }"
                class="yt"
              > -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-youtube"
                >
                  <path
                    d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"
                  />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
              <!-- </router-link> -->
            </td>
          </tr>
        </tbody>
      </table>
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

@media screen and (max-width: 768px) {
  tbody tr {
    display: flex;
    width: 100%;
    flex-direction: column;
  }

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
