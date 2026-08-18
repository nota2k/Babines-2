<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  <main><p>{{ message }}</p></main>
</template>
