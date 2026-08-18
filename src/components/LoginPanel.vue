<script setup>
import { ref } from 'vue'
import { openSession } from '@/services/session.js'

const emit = defineEmits(['connecte'])

const name = ref('')
const password = ref('')
const enCours = ref(false)
const message = ref('')

async function connecter() {
  enCours.value = true
  message.value = ''
  try {
    const session = await openSession({ name: name.value, password: password.value })
    // Le mot de passe ne survit pas a la connexion : le cookie porte desormais
    // la preuve, le garder en memoire n'apporterait rien.
    password.value = ''
    emit('connecte', session)
  } catch (err) {
    message.value = err.message
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <form class="login" @submit.prevent="connecter">
    <h2 class="title">Se connecter pour synchroniser</h2>
    <p class="explication">
      La bibliothèque fonctionne sans connexion. Se connecter la synchronise entre vos appareils.
    </p>
    <label>Nom <input v-model="name" type="text" autocomplete="username" /></label>
    <label>
      Mot de passe
      <input v-model="password" type="password" autocomplete="current-password" />
    </label>
    <button type="submit" :disabled="enCours || !name || !password">
      {{ enCours ? 'Connexion…' : 'Se connecter' }}
    </button>
    <p v-if="message" class="feedback" role="status">{{ message }}</p>
  </form>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  padding: 1em;
  margin: 1em 0;
  background: var(--surface);
  border: 1px solid var(--trait);
}

.title {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre);
}

.explication {
  margin: 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  font-size: 0.9em;
  color: var(--encre-douce);
}

input {
  padding: 0.8em;
  border: 1px solid var(--trait);
  background: var(--surface-douce);
  font-family: 'DM Sans', sans-serif;
  font-size: 1em;
  color: var(--encre);
}

button {
  align-self: flex-start;
  padding: 0.6em 1.2em;
  background-color: var(--jaune);
  border: 1px solid var(--trait);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 1em;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.feedback {
  margin: 0;
  font-size: 0.9em;
  color: var(--alerte);
}
</style>
