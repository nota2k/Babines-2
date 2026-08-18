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
        <span class="dog dog--sources" aria-hidden="true"></span>
      </span>
      <span class="label">Sources</span>
    </router-link>

    <router-link :to="{ name: 'duplicates' }" class="item" title="Doublons">
      <span class="pastille">
        <span class="dog dog--doublons" aria-hidden="true"></span>
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
  /* Carré parfait quelle que soit la largeur disponible, jamais sous 120 px. */
  min-width: 120px;
  aspect-ratio: 1 / 1;
  border-radius: 100%;
  border: 1px solid var(--trait);
  background: var(--jaune);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background-color 0.15s linear;
}

/* Les chiens s'agitent en permanence, pas seulement au survol : c'est la
   signature du produit, héritée de la première version de Babines. */
.dog {
  animation: helloDogs 0.8s infinite alternate-reverse ease-in-out both;
}

/* Inversion au survol : la pastille devient noire, le dessin devient jaune. */
a.item:hover .pastille,
a.item:focus-visible .pastille {
  background: var(--encre);
}

a.item:hover .dog,
a.item:focus-visible .dog {
  background-color: var(--jaune);
}

/* Un mouvement perpétuel se désactive pour qui demande moins d'animation. */
@media (prefers-reduced-motion: reduce) {
  .dog {
    animation: none;
  }
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
  width: 76px;
  background-color: var(--encre);
  transition: background-color 0.15s linear;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

/* Chaque dessin porte son propre masque et son propre rapport largeur/hauteur,
   les trois SVG n'ayant pas le même viewBox. */
.dog--sources {
  -webkit-mask-image: url('../assets/dog_1.svg');
  mask-image: url('../assets/dog_1.svg');
  aspect-ratio: 152.41 / 186.46;
}

.dog--doublons {
  -webkit-mask-image: url('../assets/dog_2.svg');
  mask-image: url('../assets/dog_2.svg');
  aspect-ratio: 202.96 / 157.41;
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
