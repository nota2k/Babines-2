import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const userSpotifyStore = defineStore('spotify', () => {
  const spotify = ref([])
  const loading = ref(false)
  const error = ref(null)

  const getAllPlaylists = async () => {
    const response = await fetch('https://tentacules.pantagruweb.club/webhook/getplaylist')
    spotify.value = await response.json()

    try{
      loading.value = false
    } catch (err) {
      error.value = err
      loading.value = false
    } finally {
      loading.value = false
    }
  }

  return { spotify, loading, error, getAllPlaylists }

})
