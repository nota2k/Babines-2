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
    <EntryRow v-for="entry in entries" :key="entry._id" :entry="entry" />
  </ul>
</template>

<style scoped>
.entries {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 2px solid black;
}

.empty {
  padding: 2em 0;
  opacity: 0.7;
}

.loading {
  padding: 2em 0;
  opacity: 0.7;
}
</style>
