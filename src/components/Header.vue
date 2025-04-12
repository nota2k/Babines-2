<script setup>
import { ref, onMounted, defineEmits, defineProps, watch } from 'vue'
import { useRoute } from 'vue-router'
import { userSpotifyStore } from '@/stores/spotify.js'

const store = userSpotifyStore()
const route = useRoute()
watch(
  () => route.params.id,
  (newId) => {
    if (!newId) {
      store.likedTracks
    }
  },
  { immediate: true }
)

const emit = defineEmits(['clearCache'])
</script>

<template>
  <header>
    <router-link :to="{ name: 'home'}" @click="clearCache">
      <div class="logo-wrapper">
        <img src="../assets/logo_babines.svg" alt="logo" />
      </div>
    </router-link>
  </header>
</template>

<style scoped>
.logo-wrapper {
  display: flex;
  justify-content: center;
  margin: 1em 0;
  max-width: 200px;
  margin: 0 auto;
}
</style>
