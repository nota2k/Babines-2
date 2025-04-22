<script setup lang="ts">
import { defineEmits, ref, watch, onMounted } from 'vue';
import { userSpotifyStore } from '@/stores/spotify';
import { userYoutubeStore } from '@/stores/youtube';
import db from '@/services/db.js';
import { useRoute } from 'vue-router';

const emit = defineEmits(['exportJson', 'clearCache']);
const storeSpotify = userSpotifyStore();
const storeYoutube = userYoutubeStore();
const route = useRoute();

let apiData = ref([]);
let tracks = ref([]);
let playlist = ref<{ id: string; name?: string; description?: string; uri?: string; href?: string } | null>(null);

// Fonction pour charger les données en fonction de l'ID
async function loadPlaylistData(id: string) {
  try {
    // Récupère les informations de la playlist
    playlist.value = await storeSpotify.fetchPlaylistById(id);

    // Récupère les pistes de la playlist
    const tracksData = await storeSpotify.fetchTracksByPlaylist(id);
    tracks.value = tracksData;

    // Formatage des données pour apiData
    if (playlist.value && tracks.value.length > 0) {
      apiData.value = tracks.value.map((track) => ({
        artist: track.track.artist,
        album: track.track.album,
        added_at: track.track.added_at,
        track_id: track.track.track_id,
        playlist: {
          name: playlist.value.name,
          description: playlist.value.description,
          uri: playlist.value.uri,
          id: playlist.value.id,
          href: playlist.value.href,
        },
      }));
    }

  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  }
}

// Observer les changements de l'ID dans l'URL
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadPlaylistData(newId.toString());
  }
}, { immediate: true });

// Charger les données au montage du composant si l'ID est présent
onMounted(() => {
  const id = route.params.id;
  if (id) {
    loadPlaylistData(id.toString());
  }
});

function syncLikedTrack() {
  emit('clearCache');
}

function exportCurrentPlaylist() {
  const playlist = storeSpotify.tracksByPlaylist;
  const youtubePlaylist = storeYoutube.currentPlaylist;

  if (!playlist || playlist.length === 0) {
    return;
  }
  if (!youtubePlaylist || youtubePlaylist.length === 0) {
    return;
  }

  const json = JSON.stringify(playlist, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'playlist.json';
  link.click();

  URL.revokeObjectURL(url);
}

const fetchAndInsert = async () => {
  try {
    console.log('apiData pour insertion:', apiData.value);

    // Vérification des données
    if (!apiData.value || apiData.value.length === 0) {
      console.error('Aucune donnée à synchroniser');
      return;
    }

    // Préparer tous les documents pour l'insertion en bloc
    const docsToInsert = [];
    const existingIds = new Set();

    // D'abord, récupérer tous les IDs existants
    for (const item of apiData.value) {
      try {
        const existingDoc = await db.get(item.track_id);
        existingIds.add(item.track_id);

        // Préparer le document avec la révision existante
        docsToInsert.push({
          _id: item.track_id,
          _rev: existingDoc._rev,
          track_id: item.track_id,
          artist: item.artist,
          album: item.album,
          added_at: item.added_at,
          playlist: { /* ... */ },
          last_updated: new Date().toISOString()
        });
      } catch (err) {
        if (err.status === 404) {
          // Document n'existe pas, l'ajouter sans révision
          docsToInsert.push({
            _id: item.track_id,
            track_id: item.track_id,
            artist: item.artist,
            album: item.album,
            added_at: item.added_at,
            playlist: { /* ... */ },
            last_updated: new Date().toISOString()
          });
        } else {
          console.error(`Erreur lors de la vérification de ${item.track_id}:`, err);
        }
      }
    }

    // Insérer ou mettre à jour tous les documents en une seule opération
    if (docsToInsert.length > 0) {
      const results = await db.bulkDocs(docsToInsert);
      console.log('Résultats des insertions en bloc:', results);

      // Vérifier les résultats
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error(`${errors.length} erreurs lors de l'insertion en bloc:`, errors);
      } else {
        console.log(`${results.length} documents insérés ou mis à jour avec succès!`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation :', error);
  }
};
</script>
<template>
  <aside>
    <ul class="actions">
      <li>
        <button id="sync" href="#" class="button primary" @click="fetchAndInsert">
          <img class=" dog" src="../assets/dog_1.svg" />
        <div class="label">
          <p>Sync</p>
          <img src="../assets/sync.png" />
        </div>
        </button>
      </li>
      <li>
        <a href="#" class="button primary">
          <img class="dog" src="../assets/dog_2.svg" />
        </a>
      </li>
      <li>
        <a href="#" class="button primary" @click="exportCurrentPlaylist">
          <img class="dog" src="../assets/dog_3.svg" />
          <div class="label">
            <p>Expaw</p>
            <img src="../assets/export.png" />
          </div>
        </a>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
aside {
  grid-column-start: 3;
  grid-row: 2 / 3;
  position: sticky;
  top: 5%;
  align-self: start;
}

ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin: 0.5em 0;
  position: relative;
}

li a,
li button {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
}

li button {
  height: 100%;
  width: 100%;
}

li::before {
  content: '';
  display: block;
  height: 80%;
  width: 80%;
  aspect-ratio: 1 / 1;
  background-color: var(--yellow);
  border-radius: 100%;
  margin: 0.5em 0;
  position: absolute;
}

.label {
  opacity: 0;
  position: absolute;
  color: black;
  font-size: 2em;
  transition: 0.2s ease-in-out all;
}

.label p {
  margin-bottom: 0;
  font-family: 'Eras Demi ITC';
}

.label img {
  width: 40px;
  margin-left: 25px;
}

li:hover .label {
  opacity: 1;
}

li:hover img.dog {
  opacity: 0.5;
}

li img.dog {
  transition: 0.2s ease-in-out all;
  animation: helloDogs 0.7s infinite;
  animation-fill-mode: both;
  animation-direction: alternate-reverse;
  animation-timing-function: ease-in-out;
}

@keyframes helloDogs {
  0% {
    transform: rotate(-20deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@media screen and (max-width: 768px) {
  aside {
    width: 100%;
    bottom: 0;
    position: fixed;
    top: initial;
    left: 0;
    right: 0;
  }
  ul {
    width: 100%;
    display: flex;
  }

  li {
    flex-grow: 2;
  }

  li::before {
    height: 70%;
    width: 90%;
  }
}
</style>
