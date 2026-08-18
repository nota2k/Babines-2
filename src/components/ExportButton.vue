<script setup>
import { computed, ref } from 'vue'
import { useLibraryStore } from '@/stores/library.js'
import { buildExport, exportFilename, exportScope, shareOrDownload } from '@/services/exportLibrary.js'

const library = useLibraryStore()
const feedback = ref('')

// Petit helper d'accord : « 1 morceau » mais « 2 morceaux ».
const pluriel = (n, singulier, plurielMot = singulier + 's') => `${n} ${n > 1 ? plurielMot : singulier}`

const scope = computed(() =>
  exportScope({
    query: library.query,
    platform: library.platform,
    playlist: library.playlist,
    tag: library.tag,
    entryType: library.entryType,
  }),
)

async function exportNow() {
  const now = new Date().toISOString()
  const payload = buildExport(library.filtered, scope.value, now)
  try {
    await shareOrDownload(payload, exportFilename(scope.value, now))
    const parts = [
      pluriel(payload.tracks.length, 'morceau', 'morceaux'),
      pluriel(payload.artists.length, 'artiste', 'artistes'),
    ]
    // Les entrées d'un type inattendu (anciens documents non migrés) sont bien
    // dans le fichier : les taire dans le message reviendrait à les faire
    // disparaître là où on a justement tout fait pour qu'elles ne disparaissent pas.
    if (payload.others.length) parts.push(pluriel(payload.others.length, 'entrée non classée', 'entrées non classées'))
    feedback.value = `${parts.join(', ')} — exportés.`
  } catch (err) {
    feedback.value = `Export impossible : ${err.message}`
  }
}
</script>

<template>
  <div class="export">
    <button
      type="button"
      class="pastille"
      :title="`Exporter ${scope === 'library' ? 'toute la bibliothèque' : 'la sélection'} (${library.filtered.length})`"
      @click="exportNow"
    >
      <img src="../assets/dog_3.svg" alt="" class="dog" />
      <span class="visually-hidden">
        Exporter {{ scope === 'library' ? 'toute la bibliothèque' : 'la sélection' }} ({{ library.filtered.length }})
      </span>
    </button>
    <span class="label">Expaw</span>
    <span v-if="feedback" class="feedback" role="status">{{ feedback }}</span>
  </div>
</template>

<style scoped>
.export {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4em;
  text-align: center;
}

.pastille {
  width: 64px;
  height: 64px;
  border-radius: 100%;
  border: 1px solid var(--trait);
  background: var(--jaune);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s linear;
  overflow: hidden;
}

.pastille:hover .dog,
.pastille:focus-visible .dog {
  animation: helloDogs 0.8s infinite alternate-reverse ease-in-out both;
}

@keyframes helloDogs {
  0% {
    transform: rotate(-16deg);
  }
  100% {
    transform: rotate(4deg);
  }
}

.dog {
  width: 34px;
  height: auto;
}

.label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.feedback {
  font-size: 0.8em;
  color: var(--encre-douce);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
