<script setup>
import { computed, ref, watch } from 'vue'
import { useImportStore } from '@/stores/import.js'

const props = defineProps({ entry: { type: Object, required: true } })

const imports = useImportStore()

const candidats = ref([])
const choisie = ref(null)
const playlists = ref([])
const playlistId = ref('')
const dejaDedans = ref(null)
const cherche = ref(false)
const envoie = ref(false)
const message = ref('')

// La requête est aussi affichée dans le message d'absence de résultat : sans
// elle, on ne peut pas distinguer un échec de YouTube d'un titre mal découpé.
const requete = computed(() => [props.entry.artist, props.entry.title].filter(Boolean).join(' '))

const playlistChoisie = computed(() => playlists.value.find((p) => p.id === playlistId.value))

function reinitialiser() {
  candidats.value = []
  choisie.value = null
  playlists.value = []
  playlistId.value = ''
  dejaDedans.value = null
  cherche.value = false
  envoie.value = false
  message.value = ''
}

// Changer d'entrée sans réinitialiser laisserait les candidats du morceau
// précédent sous le titre du suivant, et un envoi partirait sur la mauvaise vidéo.
watch(() => props.entry._id, reinitialiser)

// Compteur incrémenté à chaque contrôle : couvre le cas où deux sélections de
// playlist se succèdent vite et où la première réponse arrive après la seconde.
let generationControle = 0

async function chercher() {
  const pour = props.entry._id
  cherche.value = true
  message.value = ''
  candidats.value = []
  choisie.value = null
  dejaDedans.value = null
  try {
    const trouves = await imports.searchVideos(requete.value)
    if (props.entry._id !== pour) return // l'entree a change sous la requete
    candidats.value = trouves
    if (!trouves.length) message.value = `Aucune vidéo trouvée pour « ${requete.value} ».`
  } catch (err) {
    if (props.entry._id !== pour) return
    message.value = `Recherche impossible : ${err.message}`
  } finally {
    if (props.entry._id === pour) cherche.value = false
  }
}

async function choisir(candidat) {
  const pour = props.entry._id
  choisie.value = candidat
  dejaDedans.value = null
  message.value = ''
  if (playlists.value.length) return controler()
  try {
    const trouvees = await imports.fetchPlaylists('youtube')
    if (props.entry._id !== pour) return // l'entree a change sous la requete
    playlists.value = trouvees
    if (!trouvees.length) message.value = 'Aucune playlist YouTube à alimenter.'
  } catch (err) {
    if (props.entry._id !== pour) return
    message.value = `Playlists indisponibles : ${err.message}`
  }
}

/**
 * Renseigne si la vidéo est déjà dans la playlist visée. Un échec ne bloque
 * rien : le contrôle éclaire l'envoi, il ne le garde pas.
 */
async function controler() {
  const pour = props.entry._id
  const gen = ++generationControle
  dejaDedans.value = null
  message.value = ''
  if (!choisie.value || !playlistId.value) return
  try {
    const resultat = await imports.playlistContains(playlistId.value, choisie.value.videoId)
    if (props.entry._id !== pour || gen !== generationControle) return
    dejaDedans.value = resultat
  } catch {
    if (props.entry._id !== pour || gen !== generationControle) return
    message.value = 'Contrôle impossible : l’envoi reste possible, au risque d’un doublon.'
  }
}

async function envoyer() {
  if (!choisie.value || !playlistId.value) return
  const pour = props.entry._id
  envoie.value = true
  message.value = ''
  try {
    await imports.addVideoToPlaylist({
      videoId: choisie.value.videoId,
      playlistId: playlistId.value,
    })
    if (props.entry._id !== pour) return // l'entree a change pendant l'envoi
    message.value = `Ajoutée à ${playlistChoisie.value?.name || 'la playlist'}.`
    candidats.value = []
    choisie.value = null
    dejaDedans.value = null
  } catch (err) {
    if (props.entry._id !== pour) return
    // Vignette et playlist restent sélectionnées : réessayer ne doit pas coûter
    // un nouveau parcours.
    message.value = `Envoi impossible : ${err.message}`
  } finally {
    if (props.entry._id === pour) envoie.value = false
  }
}
</script>

<template>
  <section class="match">
    <h3>Trouver la vidéo</h3>

    <div class="lancer">
      <button
        type="button"
        class="yellow"
        :disabled="cherche"
        aria-label="Chercher la vidéo"
        title="Chercher la vidéo"
        @click="chercher"
      >
        <div class="swap-icon"></div>
      </button>
      <span class="requete">{{ requete }}</span>
    </div>

    <ul v-if="candidats.length" class="candidats">
      <li v-for="candidat in candidats" :key="candidat.videoId">
        <button
          type="button"
          class="candidat"
          :class="{ actif: choisie?.videoId === candidat.videoId }"
          @click="choisir(candidat)"
        >
          <img v-if="candidat.thumbnail" :src="candidat.thumbnail" :alt="''" />
          <span class="titre">{{ candidat.title }}</span>
          <span class="chaine">{{ candidat.channel }}</span>
        </button>
        <a :href="candidat.url" target="_blank" rel="noopener" class="voir">voir sur YouTube</a>
      </li>
    </ul>

    <div v-if="choisie && playlists.length" class="envoi">
      <label>
        Playlist
        <select v-model="playlistId" @change="controler">
          <option value="">Choisir…</option>
          <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>

      <p v-if="dejaDedans?.found" class="avertissement">Déjà dans cette playlist.</p>
      <p v-else-if="dejaDedans && dejaDedans.checked === 0" class="controle">
        Contrôle sans résultat : la playlist n’a renvoyé aucun élément.
      </p>
      <p v-else-if="dejaDedans && dejaDedans.checked === 1" class="controle">
        Absente de l’unique élément examiné.
      </p>
      <p v-else-if="dejaDedans" class="controle">
        Absente des {{ dejaDedans.checked }} premiers éléments examinés.
      </p>

      <button type="button" :disabled="!playlistId || envoie" @click="envoyer">
        {{ dejaDedans?.found ? 'Envoyer quand même' : 'Envoyer' }}
      </button>
    </div>

    <p class="feedback" role="status">{{ cherche ? 'Recherche…' : message }}</p>
  </section>
</template>

<style scoped>
.match {
  margin: 2em 0 0;
  padding-top: 1.5em;
  border-top: 1px solid var(--trait);
}

h3 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre);
}

.lancer {
  display: flex;
  align-items: center;
  gap: 0.8em;
}

.requete {
  font-size: 0.9em;
  color: var(--encre-douce);
}

button.yellow {
  background-color: var(--jaune);
  border: 1px solid var(--trait);
  border-radius: 100%;
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.15s linear;
}

button.yellow:hover {
  background-color: var(--encre);
}

/* Masque CSS sur fond coloré, comme add.svg dans QuickAdd et les pastilles :
   l'icône reprend la couleur du texte et s'inverse au survol. */
.swap-icon {
  background-color: var(--encre);
  width: 22px;
  height: 22px;
  -webkit-mask-image: url('../assets/arrow_swap.svg');
  mask-image: url('../assets/arrow_swap.svg');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  transition: background-color 0.15s linear;
}

button.yellow:hover .swap-icon {
  background-color: var(--jaune);
}

.candidats {
  list-style: none;
  padding: 0;
  margin: 1.2em 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1em;
}

.candidat {
  display: grid;
  gap: 0.3em;
  width: 100%;
  padding: 0;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--trait);
  cursor: pointer;
}

.candidat.actif {
  border-color: var(--encre);
  outline: 2px solid var(--jaune);
}

/* Distinct de .actif, dont l'outline signifie déjà « sélectionné » : le focus
   clavier ne doit pas se confondre avec la sélection. */
.candidat:focus-visible {
  outline: 3px solid var(--alerte);
  outline-offset: 2px;
}

.candidat img {
  width: 100%;
  display: block;
}

.titre {
  padding: 0 0.6em;
  font-size: 0.9em;
  color: var(--encre);
}

.chaine {
  padding: 0 0.6em 0.6em;
  font-size: 0.8em;
  color: var(--encre-douce);
}

.voir {
  display: inline-block;
  margin-top: 0.3em;
  font-size: 0.8em;
  color: var(--encre-douce);
}

.envoi {
  display: flex;
  align-items: center;
  gap: 1em;
  flex-wrap: wrap;
  margin-top: 1.2em;
}

.avertissement {
  margin: 0;
  font-size: 0.9em;
  color: var(--alerte);
}

.controle {
  margin: 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}

.feedback {
  margin: 0.8em 0 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}
</style>
