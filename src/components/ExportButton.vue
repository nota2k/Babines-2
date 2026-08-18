<script setup>
import { computed, ref } from 'vue'
import { useLibraryStore } from '@/stores/library.js'
import { buildExport, exportFilename, exportScope, shareOrDownload } from '@/services/exportLibrary.js'

const library = useLibraryStore()
const feedback = ref('')

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
    feedback.value = `${payload.tracks.length} morceaux et ${payload.artists.length} artistes exportés.`
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
    <span v-if="feedback" class="feedback">{{ feedback }}</span>
  </div>
</template>

<style scoped>
.export { display: flex; align-items: center; gap: 1em; flex-wrap: wrap; margin: 0.5em 0; }
button { padding: 0.6em 1.2em; border: 2px solid black; background: #a98be9; cursor: pointer; }
.feedback { font-size: 0.9em; }
</style>
