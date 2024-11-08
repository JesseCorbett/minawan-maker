<template>
  <div id="content">
    <div class="minawan-rows" v-for="n in 20">
      <MinawanRow/>
    </div>
    <div id="page-container">
      <NuxtPage/>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  --cerb-dark: #9B4ED0;
  --cerb-light: #A455CD;
  --pink: #C592AE;
  --yellow: #FADFB7;
  --black: #322E43;

  background-color: var(--yellow);
}

h1, h2 {
  text-align: center;
  font-family: DynaPuff;
  color: white;
  -webkit-text-stroke: 1px var(--pink);
  text-shadow: var(--pink) 2px 4px;
  font-size: 78px;
  font-weight: 700;
}

#content {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

#page-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding-bottom: 72px;
}

.minawan-rows:nth-child(odd) {
  transform: scaleX(-1);
}
</style>

<script setup lang="ts">
</script>
