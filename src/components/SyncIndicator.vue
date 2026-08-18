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
  font-size: 0.85em;
  margin: 0.5em 0;
  opacity: 0.8;
}

.dot {
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  background: #999;
}

.idle .dot { background: #2e9e4f; }
.pending .dot { background: var(--yellow); }
.offline .dot { background: #999; }
.error .dot,
.auth-error .dot { background: #b00020; }

.auth-error {
  opacity: 1;
  color: #b00020;
  font-weight: 600;
}
</style>
