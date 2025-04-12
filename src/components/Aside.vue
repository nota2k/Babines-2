<script setup lang="ts">
import { defineEmits,ref, watch } from 'vue';
import { userSpotifyStore } from '@/stores/spotify';
import { userYoutubeStore } from '@/stores/youtube';
import db from '@/services/db.js';
import { useRoute } from 'vue-router';
import { c } from 'vite/dist/node/moduleRunnerTransport.d-CXw_Ws6P';

const emit = defineEmits(['exportJson', 'clearCache']);
const storeSpotify = userSpotifyStore();
const storeYoutube = userYoutubeStore();

function syncLikedTrack() {
  emit('clearCache');
}

function exportCurrentPlaylist() {
  const playlist = storeSpotify.tracksByPlaylist; // Récupère la playlist courante
  const youtubePlaylist = storeYoutube.currentPlaylist; // Récupère la playlist Youtube

  if (!playlist || playlist.length === 0) {
    alert('Aucune playlist à exporter.');
    return;
  }
  if (!youtubePlaylist || youtubePlaylist.length === 0) {
    alert('Aucune playlist Youtube à exporter.');
    return;
  }

  const json = JSON.stringify(playlist, null, 2); // Convertit en JSON formaté
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'playlist.json'; // Nom du fichier exporté
  link.click();

  URL.revokeObjectURL(url); // Libère l'URL après utilisation
}

const apiData = ref([]);
let tracks = ref([]);
let playlist = ref<{ id: string; name?: string; description?: string; uri?: string; href?: string } | null>(null);

const route = useRoute();
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      // Récupérer les données de la playlist et des morceaux
      tracks.value = storeSpotify.tracksByPlaylist; // Liste des morceaux
      playlist.value = storeSpotify.playlists.find(playlist => playlist.id === newId); // Playlist avec l'ID spécifique
    }
    // Vérifie si playlist et tracks sont définis avant de les utiliser
    if (playlist.value && tracks.value) {
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
  },
  { immediate: true }
)

const fetchAndInsert = async () => {
  try {
    console.log('apiData', apiData.value);

    // 2. Insertion dans CouchDB
    for (const item of apiData.value) {
      // Adapte cette structure à ce que retourne ton API
      const doc = {
        _id: item.track_id, // utile pour éviter les doublons
        track_id: item.track_id,
        artist: item.artist,
        album: item.album,
        added_at: item.added_at,
        playlist: {
          name: item.playlist.name,
          description: item.playlist.description,
          uri: item.playlist.uri,
          id: item.playlist.id,
          href: item.playlist.href
        }
      };

      console.log('doc', doc);

      try {
        await db.put(doc);
      } catch (err: any) {
        // Si le document existe déjà, on peut le mettre à jour par exemple
        if (err.name === 'conflict') {
          const existing = await db.get(doc._id);
          await db.put({
            ...existing,
            ...doc
          });
        } else {
          console.error('Erreur insertion CouchDB :', err);
        }
      }
    }
  } catch (error) {
    console.error('Erreur API :', error);
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
  }
  ul {
    width: 100%;
    display: flex;
  }

  li {
    flex-grow: 2;
  }
}
</style>
