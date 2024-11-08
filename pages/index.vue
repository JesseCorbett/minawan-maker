<script setup lang="ts">

</script>

<template>
  <div>
    <h1>Make a Minawan!!</h1>
    <MinawanMaker body-light="#b8a099" body-shaded="#a18981" outline="#000000" mouth="#000000" eye-color="#000000" eyes="o"/>
    <div id="credit">
      Made by hoopy, for Cerber and the Minawan ^.^<br>
      Canvas adapted from a vector daavko made from Cerber's design<br>
      Accessories provided by Diamondwan
    </div>
  </div>
</template>

<style scoped>
#credit {
  font-size: 10px;
  position: fixed;
  bottom: -1px;
  right: -1px;
  color: var(--cerb-dark);
  font-family: sans-serif;
  padding: 4px 6px;
  background: var(--yellow);
  border-top-left-radius: 12px;
  border: 1px solid var(--cerb-light);
}
</style>
