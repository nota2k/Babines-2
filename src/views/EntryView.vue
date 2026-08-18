<script setup>
import { computed, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import EntryDetail from '@/components/EntryDetail.vue'
import { useLibraryStore } from '@/stores/library.js'

const props = defineProps({ id: { type: String, required: true } })
const library = useLibraryStore()

const entry = computed(() => library.entries.find((e) => e._id === props.id))

onMounted(() => {
  if (!library.entries.length) library.load()
})
</script>

<template>
  <AppHeader />
  <main class="entry">
    <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>
    <EntryDetail v-if="entry" :entry="entry" />
    <p v-else-if="library.isLoading">Chargement…</p>
    <p v-else>
      Entrée introuvable. <router-link :to="{ name: 'library' }">Retour à la bibliothèque</router-link>
    </p>
  </main>
</template>

<style scoped>
main.entry {
  display: block;
}

.error {
  border: 2px solid #b00020;
  background: #ffe9ec;
  padding: 0.8em 1em;
}
</style>
