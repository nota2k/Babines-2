<script setup>
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()
</script>

<template>
  <p class="sync" :class="library.syncStatus" :role="library.syncStatus === 'auth-error' ? 'alert' : null">
    <span class="dot"></span>{{ library.syncLabel }}
    <span v-if="library.syncStatus === 'auth-error'">
      — la synchronisation ne repartira pas seule, vérifiez les identifiants CouchDB.
    </span>
  </p>
</template>

<style scoped>
.sync {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-family: 'DM Mono', monospace;
  font-size: 0.85em;
  margin: 0.5em 0;
  color: var(--encre-douce);
}

.dot {
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  background: var(--encre-tres-douce);
}

.idle .dot { background: #2e9e4f; }
.pending .dot { background: var(--jaune); }
.offline .dot { background: var(--encre-tres-douce); }
.error .dot,
.auth-error .dot { background: var(--alerte); }

.auth-error {
  color: var(--alerte);
  font-weight: 700;
}
</style>
