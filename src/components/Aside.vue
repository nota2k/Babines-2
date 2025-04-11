<script setup lang="ts">
import { defineEmits } from 'vue'
// import axios from 'axios'

const emit = defineEmits(['exportJson', 'clearCache'])

function syncLikedTrack() {
  // axios
  //   .get(`https://pantagruweb.club/tentacules/webhook/babines/liked?cache=false`)
  //   .then((response) => {
  //     console.log(response.data)
  //     // videoData.value = response.data
  //   })
  emit('clearCache')
}
</script>

<template>
  <aside>
    <ul class="actions">
      <li>
        <button id="sync" href="#" class="button primary" @click="syncLikedTrack()">
          <img class="dog" src="../assets/dog_1.svg" />
          <div class="label">
            <p>Sync</p>
            <img src="../assets/sync.png" />
          </div>
        </button>
      </li>
      <li>
        <a href="#" class="button primary">
          <img class="dog" src="../assets/dog_2.svg" />
        </a>
      </li>
      <li>
        <a href="#" class="button primary" @click.prevent="emit('exportJson')">
          <img class="dog" src="../assets/dog_3.svg" />
          <div class="label">
            <p>Expaw</p>
            <img src="../assets/export.png" />
          </div>
        </a>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
aside {
  grid-column-start: 3;
  grid-row: 2 / 3;
  position: sticky;
  top: 5%;
  align-self: start;
}

ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin: 0.5em 0;
  position: relative;
}

li a,
li button {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
}

li button {
  height: 100%;
  width: 100%;
}

li::before {
  content: '';
  display: block;
  height: 80%;
  width: 80%;
  aspect-ratio: 1 / 1;
  background-color: var(--yellow);
  border-radius: 100%;
  margin: 0.5em 0;
  position: absolute;
}

.label {
  opacity: 0;
  position: absolute;
  color: black;
  font-size: 2em;
  transition: 0.2s ease-in-out all;
}

.label p {
  margin-bottom: 0;
  font-family: 'Eras Demi ITC';
}

.label img {
  width: 40px;
  margin-left: 25px;
}

li:hover .label {
  opacity: 1;
}

li:hover img.dog {
  opacity: 0.5;
}

li img.dog {
  transition: 0.2s ease-in-out all;
  animation: helloDogs 0.7s infinite;
  animation-fill-mode: both;
  animation-direction: alternate-reverse;
  animation-timing-function: ease-in-out;
}

@keyframes helloDogs {
  0% {
    transform: rotate(-20deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@media screen and (max-width: 768px) {
  aside {
    width: 100%;
    bottom: 0;
    position: fixed;
    top: initial;
  }
  ul {
    width: 100%;
    display: flex;
  }

  li {
    flex-grow: 2;
  }
}
</style>
