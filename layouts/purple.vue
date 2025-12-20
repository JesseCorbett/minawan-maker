<script setup lang="ts">
import type { Eyes } from "~/components/Minawan.vue";
import { onMounted, onUnmounted ,ref } from "vue";

const eyes: Eyes[] = ['star', '^', 'arrows', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o']
const minawanSize: number = 100;
let block: boolean = false;
let rows = ref(0);
let columns = ref(0);
let syncKey = ref(0);

function getEyes(): Eyes {
  const index = Math.round(Math.random() * 100) % eyes.length
  return eyes[index]
}

function calcMinawan(): void {
  if (block) return;
  block = true;
  
  const w: number = window.innerWidth;
  const h: number = window.innerHeight;

  rows.value = Math.floor(h / minawanSize);
  columns.value = Math.floor(w / minawanSize);
  syncKey.value++;

  setTimeout(() => block = false, 100);
}

onMounted(() => {
  calcMinawan();
  addEventListener("resize", calcMinawan);
});

onUnmounted(() => window.removeEventListener("resize", calcMinawan));
</script>

<template>
  <div id="content" :key="syncKey">
    <div class="minawan-rows" v-for="n in rows">
      <Minawan
          v-for="n in columns"
          :key="n"
          style="--body-light: var(--cerb-dark); --body-shaded: var(--cerb-dark)"
          :style="`--i: ${n % 2 === 0 ? '-8deg' : '8deg'}`"
          :eyes="getEyes()"/>
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
  background: repeating-linear-gradient(
      -45deg,
      #9f4cd7,
      #9f4cd7 30px,
      #a650df 30px,
      #a650df 60px
  );
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

.minawan-rows {
  user-select: none;
  pointer-events: none;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: end;
  gap: 25px;
  opacity: 0.2;
}

.minawan-rows > * {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  --i: 0deg;
  animation: hard-flip 4s linear infinite;
}

@keyframes hard-flip {
  0%, 50% {
    transform: rotate(var(--i));
  }
  50.1%, 100% {
    transform: rotate(calc(var(--i) * -1));
  }
}

.minawan-rows:nth-child(odd) {
  transform: scaleX(-1);
}
</style>