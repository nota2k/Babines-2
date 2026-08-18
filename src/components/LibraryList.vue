<script setup>
import EntryRow from '@/components/EntryRow.vue'

defineProps({
  entries: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <p v-if="loading" class="loading">Chargement de la bibliothèque…</p>
  <p v-else-if="!entries.length && !total" class="empty">
    La bibliothèque est vide. Lancez un import depuis <router-link :to="{ name: 'import' }">Sources</router-link>.
  </p>
  <p v-else-if="!entries.length" class="empty">Aucune entrée ne correspond à ces filtres.</p>

  <ul v-else class="entries">
    <EntryRow v-for="(entry, index) in entries" :key="entry._id" :entry="entry" :index="index" />
  </ul>
</template>

<style scoped>
.entries {
  list-style: none;
  padding: 0;
  margin: 0;
  background: var(--surface);
  border: 1px solid var(--trait);
}

.empty,
.loading {
  padding: 2em 1em;
  color: var(--encre-douce);
  background: var(--surface);
  border: 1px solid var(--trait);
}
</style>
