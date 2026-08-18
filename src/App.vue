<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <router-view :key="$route.fullPath" />
  <footer class="app-footer">BABINES — LE BLOC-NOTE DE TOUTE TA MUSIQUE</footer>
</template>

<style scoped>
.app-footer {
  padding: 1.4em clamp(16px, 2.6vw, 36px);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: var(--encre-tres-douce);
}
</style>
