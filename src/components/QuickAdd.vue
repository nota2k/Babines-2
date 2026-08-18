<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library.js'
import { parseShareUrl } from '@/services/normalize.js'

const library = useLibraryStore()
const router = useRouter()

const input = ref('')
const feedback = ref('')

async function submit() {
  const text = input.value.trim()
  if (!text) return
  try {
    const entry = await library.capture(text)
    if (!entry) return
    feedback.value = parseShareUrl(text)
      ? 'Lien enregistré. Le titre sera complété au retour du réseau.'
      : 'Artiste enregistré.'
    // La saisie n'est effacée qu'après une écriture réussie.
    input.value = ''
    router.push({ name: 'entry', params: { id: entry._id } })
  } catch (err) {
    // Le store renseigne library.error dans les cas prévus ; le repli garantit
    // qu'un échec inattendu ne se traduise jamais par une zone de message vide.
    feedback.value = library.error || `Impossible d’enregistrer : ${err.message}`
  }
}
</script>

<template>
  <form class="quick-add" @submit.prevent="submit">
    <input
      v-model="input"
      type="text"
      inputmode="text"
      autocomplete="off"
      placeholder="Coller un lien, ou taper un nom d’artiste"
      aria-label="Capture rapide"
    />
    <button type="submit" class="yellow" aria-label="Ajouter">
      <div class="add-icon"></div>
    </button>
    <p v-if="feedback" class="feedback">{{ feedback }}</p>
  </form>
</template>

<style scoped>
.quick-add {
  display: flex;
  gap: 0.8em;
  align-items: center;
  flex-wrap: wrap;
  padding: 1em 0;
  border-bottom: 2px solid black;
}

input {
  flex: 1 1 240px;
  padding: 0.8em;
  border: 2px solid black;
  font-size: 1.1em;
}

button {
  background-color: var(--yellow);
  border: 2px solid black;
  border-radius: 100%;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.add-icon {
  background-color: black;
  width: 26px;
  height: 26px;
  -webkit-mask-image: url(../assets/add.svg);
  mask-image: url(../assets/add.svg);
}

.feedback {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.9em;
}
</style>
