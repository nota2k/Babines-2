<script setup>
import { computed } from 'vue'
import { displayTitle } from '@/stores/library.js'

const props = defineProps({ entry: { type: Object, required: true } })

const title = computed(() => displayTitle(props.entry))
const platforms = computed(() => [...new Set((props.entry.sources || []).map((s) => s.platform))])
const excerpt = computed(() => (props.entry.note || '').split('\n')[0].slice(0, 90))
</script>

<template>
  <li class="row">
    <router-link :to="{ name: 'entry', params: { id: entry._id } }">
      <span class="badge" :class="entry.type">{{ entry.type === 'artist' ? 'artiste' : 'morceau' }}</span>
      <span class="title">{{ title }}</span>
      <span v-if="entry.artist" class="artist">{{ entry.artist }}</span>
      <span v-if="entry.pending" class="pending" title="En attente d’enrichissement">⏳</span>
      <span class="platforms">
        <span v-for="platform in platforms" :key="platform" class="platform">{{ platform }}</span>
      </span>
      <span v-if="excerpt" class="note">{{ excerpt }}</span>
      <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
    </router-link>
  </li>
</template>

<style scoped>
.row {
  border-bottom: 1px solid var(--trait-fin);
}

.row a {
  display: flex;
  flex-wrap: wrap;
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

.title {
  font-weight: 700;
}

.artist,
.note {
  color: var(--encre-douce);
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

.badge.artist {
  background: var(--jaune);
  color: var(--encre);
}

@media screen and (max-width: 768px) {
  .row a {
    flex-direction: column;
    gap: 0.2em;
  }
}
</style>
