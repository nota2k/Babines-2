<script setup>
import { computed } from 'vue'
import { displayTitle } from '@/stores/library.js'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

// Plateformes dont la pastille s'ouvre en lien vers la provenance d'origine.
// Pour l'instant, seul YouTube est demandé ; en ajouter une autre, c'est
// ajouter une valeur ici, pas retrouver une condition éparpillée dans le
// gabarit.
const PLATEFORMES_AVEC_LIEN = ['youtube']

const title = computed(() => displayTitle(props.entry))
// Une pastille par plateforme (dédoublonnée), en conservant sa provenance
// pour retrouver l'URL à ouvrir. Quand plusieurs provenances partagent la
// même plateforme, on garde en priorité celle qui porte une URL.
const platformSources = computed(() => {
  const parPlateforme = new Map()
  for (const source of props.entry.sources || []) {
    const existante = parPlateforme.get(source.platform)
    if (!existante || (!existante.url && source.url)) parPlateforme.set(source.platform, source)
  }
  return [...parPlateforme.values()]
})
const excerpt = computed(() => (props.entry.note || '').split('\n')[0].slice(0, 90))
// Rang d'affichage, pas une donnée : recalculé depuis la position dans la
// liste affichée, il suit donc filtres et tri sans lien avec entry._id.
const rank = computed(() => String(props.index + 1).padStart(2, '0'))

function estLiable(source) {
  return Boolean(source.url) && PLATEFORMES_AVEC_LIEN.includes(source.platform)
}
</script>

<template>
  <li class="row">
    <!-- Surface étirée : ce lien n'affiche aucun texte à lui, il se contente
         de couvrir toute la ligne (voir .row-link en position absolute) pour
         rester cliquable/atteignable au clavier sans envelopper la pastille
         de plateforme — deux liens imbriqués seraient invalides en HTML.
         `aria-label` porte l'intitulé puisque son contenu visuel est vide. -->
    <router-link
      class="row-link"
      :to="{ name: 'entry', params: { id: entry._id } }"
      :aria-label="`Voir le détail de « ${title} »`"
    ></router-link>

    <span class="rank" aria-hidden="true">{{ rank }}</span>
    <!-- Colonne toujours rendue pour réserver sa place, invisible quand
         l'entrée n'attend pas d'enrichissement : évite qu'elle décale
         les colonnes suivantes selon les lignes. -->
    <span class="pending" :class="{ 'pending--hidden': !entry.pending }" title="En attente d’enrichissement">⏳</span>
    <span class="badge" :class="`badge--${entry.type}`">{{ entry.type === 'artist' ? 'artiste' : 'morceau' }}</span>
    <span class="title">{{ title }}</span>
    <span class="artist">{{ entry.artist }}</span>
    <span class="note">{{ excerpt }}</span>
    <span class="tags">
      <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
    </span>
    <span class="platforms">
      <template v-for="source in platformSources" :key="source.platform">
        <a
          v-if="estLiable(source)"
          class="platform platform--link"
          :href="source.url"
          target="_blank"
          rel="noopener"
          :title="`Ouvrir « ${title} » sur ${source.platform}`"
          :aria-label="`Ouvrir « ${title} » sur ${source.platform}`"
          @click.stop
        >{{ source.platform }}</a>
        <span v-else class="platform">{{ source.platform }}</span>
      </template>
    </span>
  </li>
</template>

<style scoped>
.row {
  /* Grille partagée avec SortBar.vue (voir --grille-ligne sur .list-card
     dans LibraryView.vue) : c'est elle qui fixe la position de chaque
     colonne, plus les largeurs individuelles ci-dessous. Portée par le <li>
     lui-même : le lien de détail n'enveloppe plus les cellules (voir
     .row-link ci-dessous), elles sont donc directement des enfants du <li>,
     de vrais items de sa grille. */
  position: relative;
  display: grid;
  grid-template-columns: var(--grille-ligne);
  align-items: baseline;
  column-gap: 0.6em;
  padding: 0.8em 0.7em;
  border-bottom: 1px solid var(--trait-fin);
  color: var(--encre);
  font-family: 'DM Sans', sans-serif;
  transition: background-color 0.15s linear;
}

.row:hover {
  background: var(--jaune);
}

.row-link {
  /* Couvre toute la ligne : c'est la « surface étirée » qui remplace
     l'ancien lien-conteneur. Positionné en absolu par rapport au <li>
     (position: relative ci-dessus), donc hors du flux de la grille — il ne
     compte pas comme une colonne et ne peut pas la décaler. Un
     `z-index` implicite (auto) suffit à le faire passer au-dessus du texte
     normal de la ligne ; seule la pastille de plateforme, avec son propre
     z-index, sait passer par-dessus lui pour rester cliquable. */
  position: absolute;
  inset: 0;
}

.row-link:focus-visible {
  outline: 2px solid var(--encre);
  outline-offset: -2px;
}

.rank {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--encre-tres-douce);
}

.pending {
  text-align: center;
}

.pending--hidden {
  visibility: hidden;
}

.badge {
  text-align: center;
}

.title,
.artist,
.note {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title {
  font-weight: 700;
}

.artist,
.note {
  color: var(--encre-douce);
}

.tags,
.platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
}

.badge,
.platform,
.tag {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid var(--trait);
  padding: 0.1em 0.5em;
  color: var(--encre-douce);
}

.badge--artist {
  background: var(--jaune);
  color: var(--encre);
}

.platform--link {
  /* Même cadre que les pastilles non cliquables, mais l'indice visuel
     d'interactivité (inversion au survol) reprend celui des pastilles
     rondes de la colonne de droite (voir SidePastilles.vue). Le
     positionnement relatif + z-index la fait passer au-dessus de la
     surface étirée du lien de détail, sans quoi ce dernier absorberait
     tous les clics. */
  position: relative;
  z-index: 1;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s linear, color 0.15s linear;
}

.platform--link:hover,
.platform--link:focus-visible {
  background: var(--encre);
  color: var(--jaune);
}

.platform--link:focus-visible {
  outline: 2px solid var(--encre);
  outline-offset: 2px;
}

@media screen and (max-width: 768px) {
  /* La grille de colonnes n'a plus de sens quand la ligne s'empile :
     on repasse en flux vertical simple, comme avant le passage en grille. */
  .row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.2em;
  }

  .badge {
    align-self: flex-start;
  }

  .title,
  .artist,
  .note {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .artist:empty,
  .note:empty {
    display: none;
  }

  .tags:empty {
    display: none;
  }
}
</style>
