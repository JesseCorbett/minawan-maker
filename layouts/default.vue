<script setup lang="ts">
</script>
<template>
  <div id="content">
    <div class="minawan-rows" v-for="n in 20">
      <MinawanRow/>
    </div>
    <div id="page-container">
      <slot/>
    </div>
  </div>
</template>

<style scoped>
#content {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--yellow);
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
  padding-bottom: 54px;
}

.minawan-rows:nth-child(odd) {
  transform: scaleX(-1);
}
</style>