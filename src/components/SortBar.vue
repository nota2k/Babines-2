<script setup>
// Barre de tri en boutons (remplace la liste déroulante). Le critère actif
// écrit dans library.sortBy / library.sortAsc, qui existent déjà côté store —
// aucun changement de comportement, seulement de présentation.
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()

const criteres = [
  { valeur: 'updatedAt', libelle: 'Modifié récemment' },
  { valeur: 'createdAt', libelle: 'Ajouté récemment' },
  { valeur: 'title', libelle: 'Titre' },
  { valeur: 'artist', libelle: 'Artiste' },
]

function trierPar(valeur) {
  if (library.sortBy === valeur) {
    library.sortAsc = !library.sortAsc
  } else {
    library.sortBy = valeur
    library.sortAsc = true
  }
}
</script>

<template>
  <div class="sort-bar">
    <span class="label">Trier</span>
    <button
      v-for="critere in criteres"
      :key="critere.valeur"
      type="button"
      class="entry"
      :class="{ active: library.sortBy === critere.valeur }"
      @click="trierPar(critere.valeur)"
    >
      {{ critere.libelle }}
      <template v-if="library.sortBy === critere.valeur">{{ library.sortAsc ? '↑' : '↓' }}</template>
    </button>
  </div>
</template>

<style scoped>
.sort-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--trait-fin);
  background: var(--surface-douce);
}

.label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre-douce);
}

.entry {
  min-height: 28px;
  padding: 2px 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #555;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.15s linear, border-color 0.15s linear;
}

.entry.active {
  color: var(--encre);
  border-bottom-color: var(--jaune);
}
</style>
