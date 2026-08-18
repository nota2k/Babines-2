<script setup>
// Barre de tri en boutons, posée en grille sur les mêmes colonnes que les
// lignes (--grille-ligne, défini sur .list-card dans LibraryView.vue) afin
// que « Titre » et « Artiste » surplombent vraiment leurs colonnes. Le
// critère actif écrit dans library.sortBy / library.sortAsc, qui existent
// déjà côté store — aucun changement de comportement, seulement de
// présentation.
import { useLibraryStore } from '@/stores/library.js'

const library = useLibraryStore()

function trierPar(valeur) {
  if (library.sortBy === valeur) {
    library.sortAsc = !library.sortAsc
  } else {
    library.sortBy = valeur
    library.sortAsc = true
  }
}

function estActif(valeur) {
  return library.sortBy === valeur
}
</script>

<template>
  <div class="sort-bar">
    <div class="colonnes">
      <span class="label col-trier">Trier</span>

      <button
        type="button"
        class="entry col-titre"
        :class="{ active: estActif('title') }"
        @click="trierPar('title')"
      >
        Titre
        <template v-if="estActif('title')">{{ library.sortAsc ? '↑' : '↓' }}</template>
      </button>

      <button
        type="button"
        class="entry col-artiste"
        :class="{ active: estActif('artist') }"
        @click="trierPar('artist')"
      >
        Artiste
        <template v-if="estActif('artist')">{{ library.sortAsc ? '↑' : '↓' }}</template>
      </button>
    </div>

    <!-- « Modifié récemment » et « Ajouté récemment » ne nomment aucune
         colonne visible (les lignes n'affichent ni date de modification ni
         date d'ajout) : ce sont des critères de tri, pas des en-têtes de
         colonne. Elles restent donc hors grille, alignées à droite comme la
         colonne des sources qu'elles surplombent, mais sans être bridées à
         sa largeur fixe : leur texte ne tiendrait pas dedans. -->
    <div class="dates">
      <button
        type="button"
        class="entry"
        :class="{ active: estActif('updatedAt') }"
        @click="trierPar('updatedAt')"
      >
        Modifié récemment
        <template v-if="estActif('updatedAt')">{{ library.sortAsc ? '↑' : '↓' }}</template>
      </button>

      <button
        type="button"
        class="entry"
        :class="{ active: estActif('createdAt') }"
        @click="trierPar('createdAt')"
      >
        Ajouté récemment
        <template v-if="estActif('createdAt')">{{ library.sortAsc ? '↑' : '↓' }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sort-bar {
  border-bottom: 1px solid var(--trait-fin);
  background: var(--surface-douce);
}

.colonnes {
  /* Même grille que les lignes (voir --grille-ligne sur .list-card) : les
     colonnes 1-3 (rang, badge d'attente, badge de type) accueillent le mot
     « Trier », la colonne 4 « Titre », la colonne 5 « Artiste ». Les
     colonnes 6 et 7 (note, tags) n'ont pas de libellé et restent vides. */
  display: grid;
  grid-template-columns: var(--grille-ligne);
  align-items: center;
  column-gap: 0.6em;
  padding: 12px 0.7em 6px;
}

.col-trier {
  /* Colonnes 1 à 3 : rang + badge d'attente + badge de type. */
  grid-column: 1 / 4;
}

.col-titre {
  grid-column: 4;
}

.col-artiste {
  grid-column: 5;
}

.dates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px 18px;
  padding: 0 0.7em 10px;
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
  text-align: left;
  white-space: nowrap;
  transition: color 0.15s linear, border-color 0.15s linear;
}

.entry.active {
  color: var(--encre);
  border-bottom-color: var(--jaune);
}

@media screen and (max-width: 768px) {
  /* Sous 768 px, les lignes s'empilent en colonne unique (voir EntryRow.vue) :
     un en-tête de colonnes n'a alors plus de sens, puisqu'il n'y a plus de
     colonnes à surplomber. On abandonne donc la grille pour un simple flux
     de boutons qui s'enroule, plutôt que de masquer la barre : les critères
     de tri restent ainsi utilisables sur mobile, comme avant ce changement. */
  .colonnes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    padding: 12px 20px 6px;
  }

  .dates {
    justify-content: flex-start;
    padding: 0 20px 12px;
  }
}
</style>
