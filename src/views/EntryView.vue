<script setup>
import { computed, onMounted } from 'vue'
import Header from '@/components/Header.vue'
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
  <Header />
  <main class="entry">
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
</style>
