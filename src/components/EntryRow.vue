<script setup>
import { computed } from 'vue'
import { displayTitle } from '@/stores/library.js'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const title = computed(() => displayTitle(props.entry))
const platforms = computed(() => [...new Set((props.entry.sources || []).map((s) => s.platform))])
const excerpt = computed(() => (props.entry.note || '').split('\n')[0].slice(0, 90))
// Rang d'affichage, pas une donnée : recalculé depuis la position dans la
// liste affichée, il suit donc filtres et tri sans lien avec entry._id.
const rank = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <li class="row">
    <router-link :to="{ name: 'entry', params: { id: entry._id } }">
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
        <span v-for="platform in platforms" :key="platform" class="platform">{{ platform }}</span>
      </span>
    </router-link>
  </li>
</template>

<style scoped>
.row {
  border-bottom: 1px solid var(--trait-fin);
}

.row a {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  padding: 0.8em 0.7em;
  color: var(--encre);
  font-family: 'DM Sans', sans-serif;
  transition: background-color 0.15s linear;
}

.row a:hover {
  background: var(--jaune);
}

.rank {
  flex: 0 0 auto;
  width: 26px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--encre-tres-douce);
}

.pending {
  flex: 0 0 auto;
  width: 16px;
  text-align: center;
}

.pending--hidden {
  visibility: hidden;
}

.badge {
  flex: 0 0 auto;
  width: 74px;
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
  flex: 3 1 0;
  font-weight: 700;
}

.artist,
.note {
  flex: 2 1 0;
  color: var(--encre-douce);
}

.tags {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
}

.platforms {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
  margin-left: auto;
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

@media screen and (max-width: 768px) {
  .row a {
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
    flex: none;
    width: auto;
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

  .platforms {
    margin-left: 0;
  }
}
</style>
