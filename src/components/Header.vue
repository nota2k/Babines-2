<script setup>
import { ref, onMounted, defineEmits, defineProps } from 'vue'
import { useRoute } from 'vue-router'
</script>

<template>
  <header>
    <router-link :to="{ name: 'home' }">
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
