<script setup>
import { useImportStore } from '@/stores/import.js'

const imports = useImportStore()
const PLATFORMS = ['spotify', 'deezer', 'youtube']

// Le job récapitulatif de résolution des entrées en attente porte la
// plateforme fictive « resolve » : ENDPOINTS n'a pas d'entrée pour elle, donc
// importPlatform('resolve') lèverait une TypeError. On route ce job vers
// resolvePending() plutôt que vers importPlatform().
function retry(job) {
  return job.platform === 'resolve' ? imports.resolvePending() : imports.importPlatform(job.platform)
}
</script>

<template>
  <section class="import-panel">
    <h2>Sources</h2>
    <p class="hint">
      L'import passe par n8n. Si une plateforme échoue, le code de réponse est indiqué ci-dessous :
      une liste vide n'est jamais silencieuse.
    </p>

    <div class="platforms">
      <button
        v-for="platform in PLATFORMS"
        :key="platform"
        type="button"
        :disabled="imports.running"
        @click="imports.importPlatform(platform)"
      >
        Importer {{ platform }}
      </button>
    </div>

    <h3>Historique</h3>
    <p v-if="!imports.jobs.length">Aucun import lancé dans cette session.</p>
    <ul v-else class="jobs">
      <li v-for="job in [...imports.jobs].reverse()" :key="job.id" :class="job.status">
        <strong>{{ job.label }}</strong>
        <span class="status">{{ job.status }}</span>
        <span v-if="job.httpStatus"> — HTTP {{ job.httpStatus }}</span>
        <span class="time">{{ (job.finishedAt || job.startedAt).slice(11, 19) }}</span>
        <p class="message">{{ job.message || 'en cours…' }}</p>
        <button
          v-if="job.status !== 'running' && job.status !== 'ok'"
          type="button"
          :disabled="imports.running"
          :aria-label="`Réessayer l’import ${job.label}`"
          @click="retry(job)"
        >
          Réessayer
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.import-panel {
  max-width: 800px;
  margin: 0 auto;
}

.platforms {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
  margin: 1em 0;
}

button {
  padding: 0.7em 1.2em;
  border: 2px solid black;
  background: var(--yellow);
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: progress;
}

.jobs {
  list-style: none;
  padding: 0;
}

.jobs li {
  border: 2px solid black;
  padding: 0.8em;
  margin-bottom: 0.8em;
}

.jobs li.error { border-color: #b00020; background: #ffe9ec; }
.jobs li.partial { background: #fff7cc; }

.status { font-variant: small-caps; margin-left: 0.6em; }
.time { float: right; opacity: 0.6; }
.message { margin: 0.4em 0; }
.hint { opacity: 0.75; }
</style>
