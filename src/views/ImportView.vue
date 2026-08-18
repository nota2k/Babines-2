<script setup>
import AppHeader from '@/components/AppHeader.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import ImportPanel from '@/components/ImportPanel.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
</script>

<template>
  <AppHeader />
  <main class="import">
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>
    <ErrorBanner />
    <SyncIndicator />
    <ImportPanel />
  </main>
</template>

<style scoped>
main.import {
  display: block;
  max-width: 800px;
  margin: 0 auto;
  padding: 1em clamp(16px, 2.6vw, 36px) 2em;
}
</style>
