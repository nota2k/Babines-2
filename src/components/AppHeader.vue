<script setup>
// Aucune logique : le logo ramène à la bibliothèque.
</script>

<template>
  <header>
    <router-link :to="{ name: 'library' }">
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
