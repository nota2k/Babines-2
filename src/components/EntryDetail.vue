<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library.js'
import { matchKey } from '@/services/normalize.js'

const props = defineProps({ entry: { type: Object, required: true } })

const library = useLibraryStore()
const router = useRouter()

const note = ref(props.entry.note || '')
const tagsInput = ref((props.entry.tags || []).join(', '))
const title = ref(props.entry.title || '')
const artist = ref(props.entry.artist || '')
const name = ref(props.entry.name || '')
const saving = ref(false)
const feedback = ref('')

watch(
  () => props.entry._id,
  () => {
    note.value = props.entry.note || ''
    tagsInput.value = (props.entry.tags || []).join(', ')
    title.value = props.entry.title || ''
    artist.value = props.entry.artist || ''
    name.value = props.entry.name || ''
  },
)

const isArtist = computed(() => props.entry.type === 'artist')

async function save() {
  saving.value = true
  feedback.value = ''
  // Les tags sont dédoublonnés : un tag saisi deux fois polluerait le document,
  // la ligne de la bibliothèque et l'export, alors que le filtre le masquerait.
  const tags = [...new Set(
    tagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )]

  const cleanName = name.value.trim()
  const cleanTitle = title.value.trim()
  const cleanArtist = artist.value.trim()

  const patch = isArtist.value
    ? { note: note.value, tags, name: cleanName, matchKey: matchKey(cleanName) }
    : {
        note: note.value,
        tags,
        title: cleanTitle,
        artist: cleanArtist,
        matchKey: matchKey(cleanArtist, cleanTitle),
        // Une saisie faite uniquement d'espaces ne doit pas faire croire que
        // l'entrée est complétée.
        pending: props.entry.pending && !cleanTitle,
      }

  try {
    await library.updateEntry(props.entry._id, patch)
    feedback.value = 'Enregistré.'
  } catch (err) {
    feedback.value = `Échec de l’enregistrement : ${err.message}`
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!window.confirm('Supprimer définitivement cette entrée ?')) return
  try {
    await library.removeEntry(props.entry._id)
    router.push({ name: 'library' })
  } catch (err) {
    // Le store a déjà renseigné library.error ; on l'affiche ici, et on reste
    // sur l'entrée — elle existe toujours.
    feedback.value = library.error || `Suppression impossible : ${err.message}`
  }
}
</script>

<template>
  <article class="detail">
    <router-link class="back" :to="{ name: 'library' }">← Bibliothèque</router-link>

    <form @submit.prevent="save">
      <template v-if="isArtist">
        <label>Nom <input v-model="name" type="text" /></label>
      </template>
      <template v-else>
        <label>Titre <input v-model="title" type="text" /></label>
        <label>Artiste <input v-model="artist" type="text" /></label>
        <p v-if="entry.pending" class="pending">
          Entrée capturée par lien, pas encore enrichie. Elle se complétera au prochain retour du réseau,
          ou vous pouvez la renseigner ici.
        </p>
      </template>

      <label>Note
        <textarea v-model="note" rows="5" placeholder="vu au Petit Bain, recommandé par…"></textarea>
      </label>

      <label>Tags (séparés par des virgules)
        <input v-model="tagsInput" type="text" />
      </label>

      <div class="actions">
        <button type="submit" :disabled="saving">Enregistrer</button>
        <button type="button" class="danger" @click="remove">Supprimer</button>
        <span v-if="feedback" class="feedback">{{ feedback }}</span>
      </div>
    </form>

    <section class="sources">
      <h3>Provenances</h3>
      <p v-if="!entry.sources?.length">Entrée créée à la main, sans provenance.</p>
      <ul v-else>
        <li v-for="source in entry.sources" :key="`${source.platform}-${source.playlistId}`">
          <strong>{{ source.platform }}</strong>
          <span v-if="source.playlistName"> — {{ source.playlistName }}</span>
          <span v-if="source.addedAt"> — ajouté le {{ source.addedAt.slice(0, 10) }}</span>
          <a v-if="source.url" :href="source.url" target="_blank" rel="noopener">ouvrir</a>
          <em v-if="source.rawTitle" class="raw">titre d’origine : {{ source.rawTitle }}</em>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.detail {
  max-width: 700px;
  margin: 0 auto;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1em;
  margin: 1.5em 0;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  font-weight: 600;
}

input,
textarea {
  padding: 0.6em;
  border: 2px solid black;
  font: inherit;
  font-weight: 400;
}

.actions {
  display: flex;
  gap: 1em;
  align-items: center;
  flex-wrap: wrap;
}

button {
  padding: 0.6em 1.2em;
  border: 2px solid black;
  background: var(--yellow);
  cursor: pointer;
}

button.danger {
  background: white;
}

.pending {
  background: #fff7cc;
  padding: 0.6em;
  margin: 0;
}

.sources ul {
  list-style: none;
  padding: 0;
}

.sources li {
  padding: 0.5em 0;
  border-bottom: 1px solid #ddd;
}

.raw {
  display: block;
  opacity: 0.6;
  font-size: 0.85em;
}
</style>
