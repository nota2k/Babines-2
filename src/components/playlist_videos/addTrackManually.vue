<script setup lang="ts"></script>

<template>
  <div class="add-wrapper">
    <h2>Ajouter un morceau</h2>
    <form>
      <input placeholder="Titre" type="text" id="title" name="title" />
      <input type="text" placeholder="Artiste" id="artist" name="artist" />
      <button type="submit" class="yellow">
        <div class="add-icon"></div>
      </button>
    </form>
  </div>
</template>

<style scoped>
.add-wrapper {
  padding: 1em;
  border-bottom: 2px solid black;
}

.add-wrapper h2 {
  margin: 0;
}

form {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: stretch;
  align-items: center;
}

input {
  padding: 8px 10px;
  border-radius: 2px;
  border: 1px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 2;
  height: fit-content;
  gap: 15px;
  font-size: 1.1em;
}

input.title {
  width: 40%;
}

.add-wrapper button {
  background-color: var(--yellow);
  border: 2px solid black;
  border-radius: 100%;
  cursor: pointer;
  width: 60px;
  height: 60px;
  transition: 0.2s ease-in-out all;
  display: flex;
  justify-content: center;
  align-items: center;
}

.add-wrapper button:hover {
  background-color: #000;
}

.add-icon {
  background-color: black;
  background-size: contain;
  width: 30px;
  height: 30px;
  -webkit-mask-image: url(../../assets/add.svg);
  mask-image: url(../../assets/add.svg);
}

.add-wrapper button:hover .add-icon {
  background-color: var(--yellow);
}
</style>
