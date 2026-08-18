<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library.js'
import { parseShareUrl } from '@/services/normalize.js'

const library = useLibraryStore()

const input = ref('')
const feedback = ref('')
const lastEntry = ref(null)

async function submit() {
  const text = input.value.trim()
  if (!text) return
  try {
    const entry = await library.capture(text)
    if (!entry) return
    lastEntry.value = entry
    feedback.value = parseShareUrl(text)
      ? 'Lien enregistré. Le titre sera complété au retour du réseau.'
      : 'Artiste enregistré.'
    // La saisie n'est effacée qu'après une écriture réussie.
    input.value = ''
  } catch (err) {
    // Le store renseigne library.error dans les cas prévus ; le repli garantit
    // qu'un échec inattendu ne se traduise jamais par une zone de message vide.
    lastEntry.value = null
    feedback.value = library.error || `Impossible d’enregistrer : ${err.message}`
  }
}
</script>

<template>
  <form class="quick-add" @submit.prevent="submit">
    <h2 class="title">Noter une découverte</h2>
    <input
      v-model="input"
      type="text"
      inputmode="text"
      autocomplete="off"
      placeholder="Coller un lien, ou taper un nom d’artiste"
      aria-label="Capture rapide"
    />
    <button type="submit" class="yellow" aria-label="Ajouter" title="Ajouter">
      <div class="add-icon"></div>
    </button>
    <p v-if="feedback" class="feedback" role="status">
      {{ feedback }}
      <router-link v-if="lastEntry" :to="{ name: 'entry', params: { id: lastEntry._id } }">
        Annoter
      </router-link>
    </p>
  </form>
</template>

<style scoped>
.quick-add {
  display: flex;
  gap: 0.8em;
  align-items: center;
  flex-wrap: wrap;
  padding: 1em;
  margin: 1em 0;
  background: var(--surface);
  border: 1px solid var(--trait);
}

.title {
  flex-basis: 100%;
  margin: 0 0 0.2em;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre);
}

input {
  flex: 1 1 240px;
  padding: 0.8em;
  border: 1px solid var(--trait);
  background: var(--surface-douce);
  font-family: 'DM Sans', sans-serif;
  font-size: 1em;
  color: var(--encre);
}

button {
  background-color: var(--jaune);
  border: 1px solid var(--trait);
  border-radius: 100%;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.15s linear;
}

button:hover {
  background-color: var(--encre);
}

.add-icon {
  background-color: var(--encre);
  width: 26px;
  height: 26px;
  -webkit-mask-image: url(../assets/add.svg);
  mask-image: url(../assets/add.svg);
  transition: background-color 0.15s linear;
}

button:hover .add-icon {
  background-color: var(--jaune);
}

.feedback {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}

.feedback a {
  margin-left: 0.5em;
  color: var(--encre);
  text-decoration: underline;
}
</style>
