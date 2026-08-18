<script setup>
// Colonne des trois pastilles rondes : sources (import), doublons, export.
// ExportButton porte déjà toute la logique d'export ; on la réutilise ici
// plutôt que de la dupliquer.
import ExportButton from '@/components/ExportButton.vue'
</script>

<template>
  <aside class="pastilles">
    <router-link :to="{ name: 'import' }" class="item" title="Sources">
      <span class="pastille">
        <img src="../assets/dog_1.svg" alt="" class="dog" />
      </span>
      <span class="label">Sources</span>
    </router-link>

    <router-link :to="{ name: 'duplicates' }" class="item" title="Doublons">
      <span class="pastille">
        <img src="../assets/dog_2.svg" alt="" class="dog" />
      </span>
      <span class="label">Doublons</span>
    </router-link>

    <ExportButton />
  </aside>
</template>

<style scoped>
.pastilles {
  flex: 1 1 128px;
  position: sticky;
  top: 96px;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.4em;
}

a.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4em;
  text-align: center;
  color: var(--encre);
}

.pastille {
  width: 64px;
  height: 64px;
  border-radius: 100%;
  border: 1px solid var(--trait);
  background: var(--jaune);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background-color 0.15s linear;
}

a.item:hover .dog,
a.item:focus-visible .dog {
  animation: helloDogs 0.8s infinite alternate-reverse ease-in-out both;
}

@keyframes helloDogs {
  0% {
    transform: rotate(-16deg);
  }
  100% {
    transform: rotate(4deg);
  }
}

.dog {
  width: 34px;
  height: auto;
}

.label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .pastilles {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
