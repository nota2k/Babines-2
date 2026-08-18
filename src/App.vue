<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <router-view :key="$route.fullPath" />
  <footer class="app-footer">
    <div class="app-footer-inner">
      <span>Babines</span>
      <span>Un grand bloc-note de musique</span>
      <span class="mono">json in ⋅ json out</span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid var(--trait);
  padding: 26px clamp(16px, 2.6vw, 36px);
}

.app-footer-inner {
  max-width: 1560px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--encre-douce);
}

.app-footer-inner .mono {
  font-family: 'DM Mono', monospace;
  letter-spacing: 0;
  text-transform: none;
}
</style>
