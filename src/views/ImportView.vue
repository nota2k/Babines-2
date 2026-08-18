<script setup>
import AppHeader from '@/components/AppHeader.vue'
import ImportPanel from '@/components/ImportPanel.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
</script>

<template>
  <AppHeader />
  <main class="import">
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>
    <SyncIndicator />
    <ImportPanel />
  </main>
</template>

<style scoped>
main.import {
  display: block;
}
</style>
