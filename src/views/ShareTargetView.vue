<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import { useLibraryStore } from '@/stores/library.js'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const message = ref('Enregistrement…')

onMounted(async () => {
  // Selon l'application source, le lien arrive dans `url` ou noyé dans `text`.
  const raw = [route.query.url, route.query.text, route.query.title].filter(Boolean).join(' ')
  const link = raw.match(/https?:\/\/\S+/)?.[0]
  try {
    const entry = await library.capture(link || raw)
    if (entry) return router.replace({ name: 'entry', params: { id: entry._id } })
    message.value = 'Rien à enregistrer.'
  } catch {
    message.value = library.error
  }
})
</script>

<template>
  <AppHeader />
  <main class="share">
    <ErrorBanner />
    <p>{{ message }}</p>
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>
  </main>
</template>

<style scoped>
main.share {
  display: block;
  max-width: 700px;
  margin: 0 auto;
  padding: 1em clamp(16px, 2.6vw, 36px) 2em;
}
</style>
