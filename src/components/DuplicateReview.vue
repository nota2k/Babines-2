<script setup>
import { ref } from 'vue'
import { useLibraryStore, displayTitle } from '@/stores/library.js'

const library = useLibraryStore()
const busy = ref('')

async function merge(keep, drop) {
  busy.value = drop._id
  try {
    await library.mergeEntries(keep._id, drop._id)
  } finally {
    busy.value = ''
  }
}

const platformsOf = (entry) => [...new Set((entry.sources || []).map((s) => s.platform))].join(', ')

const mergeLabel = (entry, group) =>
  group.length > 2
    ? `Garder « ${displayTitle(entry)} » et fusionner la suivante`
    : `Garder « ${displayTitle(entry)} » et fusionner l'autre`
</script>

<template>
  <section class="duplicates">
    <h2>Doublons probables</h2>
    <p class="hint">
      Rapprochements suggérés par la clé de normalisation. <strong>Rien n'est fusionné automatiquement</strong> :
      un live et sa version studio se ressemblent sans être le même morceau. Vous décidez.
    </p>

    <p v-if="!library.duplicateGroups.length">Aucun doublon probable.</p>

    <div v-for="group in library.duplicateGroups" :key="group[0].matchKey" class="group">
      <h3>{{ group[0].matchKey }}</h3>
      <ul>
        <li v-for="entry in group" :key="entry._id">
          <router-link :to="{ name: 'entry', params: { id: entry._id } }">{{ displayTitle(entry) }}</router-link>
          <span class="meta">{{ entry.artist }} — {{ platformsOf(entry) || 'sans provenance' }}</span>
          <span v-if="entry.note" class="meta">note : {{ entry.note.slice(0, 60) }}</span>
        </li>
      </ul>
      <div class="actions">
        <button
          v-for="entry in group"
          :key="`keep-${entry._id}`"
          type="button"
          :disabled="busy !== ''"
          @click="merge(entry, group.find((e) => e._id !== entry._id))"
        >
          {{ mergeLabel(entry, group) }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.duplicates { max-width: 800px; margin: 0 auto; }
.group { border: 2px solid black; padding: 1em; margin-bottom: 1em; }
.group h3 { margin-top: 0; font-family: monospace; font-size: 0.9em; opacity: 0.7; }
ul { list-style: none; padding: 0; }
li { padding: 0.4em 0; border-bottom: 1px solid #ddd; }
.meta { display: block; font-size: 0.85em; opacity: 0.7; }
.actions { display: flex; flex-direction: column; gap: 0.5em; margin-top: 1em; }
button { padding: 0.6em; border: 2px solid black; background: var(--yellow); cursor: pointer; text-align: left; }
.hint { opacity: 0.75; }
</style>
