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
    <button type="button" @click="exportNow">
      Exporter {{ scope === 'library' ? 'toute la bibliothèque' : 'la sélection' }} ({{ library.filtered.length }})
    </button>
    <span v-if="feedback" class="feedback" role="status">{{ feedback }}</span>
  </div>
</template>

<style scoped>
.export { display: flex; align-items: center; gap: 1em; flex-wrap: wrap; margin: 0.5em 0; }
button { padding: 0.6em 1.2em; border: 2px solid black; background: #a98be9; cursor: pointer; }
.feedback { font-size: 0.9em; }
</style>
