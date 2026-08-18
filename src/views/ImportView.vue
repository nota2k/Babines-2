<script setup>
import Header from '@/components/Header.vue'
import ImportPanel from '@/components/ImportPanel.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
</script>

<template>
  <Header />
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
