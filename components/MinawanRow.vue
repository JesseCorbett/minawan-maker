<script setup lang="ts">
import { type Eyes } from "~/components/Minawan.vue";
import type { Accessories } from "~/components/MinawanCanvas.vue";

const colors = [
  ['#cab5d6', '#bea3d0'],
  ['#d5e1df', '#c2d3cf'],
  ['#f5e9de', '#e9d8ca'],
  ['#f2d7d9', '#e6c0c7'],
  ['#d0d9e1', '#bcc8d3'],
  ['#e1d5d9', '#d3c0c7'],
  ['#d9e1e0', '#c7d3d2'],
  ['#e9d8d5', '#dbc2bf'],
  ['#dee0e1', '#ccd3d4'],
  ['#e1d9d5', '#d3c7bf'],
  ['#d5e1d7', '#c2d3c5'],
  ['#dfe0df', '#ced3cf'],
  ['#e1d7d0', '#d3c5be'],
  ['#d7e1d9', '#c5d3c7'],
  ['#e0dfe1', '#d2cfd3'],
  ['#d9dfe1', '#c7cfd3'],
  ['#e1e0df', '#d3d2cf'],
  ['#dfe1e0', '#cfd3d2'],
  ['#e0dfe0', '#d2cfd2'],
  ['#e0e0e0', '#d2d2d2'],
  ['#7d8fa6', '#66778f'],
  ['#b58cb0', '#a07899'],
  ['#8099b0', '#698199'],
  ['#99a0b0', '#818999'],
  ['#8999b0', '#718199'],
  ['#9989a0', '#817189'],
  ['#a099b8', '#8981a1'],
  ['#b099a6', '#99818f'],
  ['#b8a099', '#a18981']
];

const eyes: Eyes[] = ['star', '^', 'arrows', 'o']

const accessories: Accessories[][] = [
  ['eyebrows'],
  ['eyebrows', 'drill'],
  ['drill'],
  ['vedal'],
  ['santa'],
  ['reindeer'],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  []
]

function getColor() {
  const index = Math.round(Math.random() * 100) % colors.length
  const color = colors[index]
  return {
    '--body-light': color[0],
    '--body-shaded': color[1]
  }
}

function getEyes(): Eyes {
  const index = Math.round(Math.random() * 100) % eyes.length
  return eyes[index]
}
</script>

<template>
  <div class="row" v-once>
    <div class="row-slider">
      <Minawan v-for="n in 100" :key="n" :style="getColor()" :eyes="getEyes()"/>
    </div>
  </div>
</template>

<style>
@keyframes slide {
  0% {
    transform: translateX(0%)
  }
  100% {
    transform: translateX(calc(100% - 100vw))
  }
}

div.row {
  user-select: none;
  pointer-events: none;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: end;
  opacity: 0.25;
}

div.row > .row-slider {
  width: fit-content;
  display: flex;
  flex-direction: row;
  gap: 24px;
  animation: slide 240s linear infinite;
}

div.row > .row-slider > * {
  width: 110px;
  height: 110px;
  flex-shrink: 0;
}
</style>
