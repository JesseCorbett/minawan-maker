<script setup lang="ts">
export interface MinawanInfo {
  userId: string;
  name: string;
  url: string;
}

defineProps<{
  minawan?: MinawanInfo
}>()
</script>

<template>
  <div class="minawan-box">
    <div v-if="minawan">
      {{ minawan }}
    </div>
    <NuxtLink to="/" class="to-maker" v-else>
      Upload or make your own Minawan
    </NuxtLink>
  </div>
</template>

<style scoped>
.minawan-box {
  border: 5px solid var(--black);
  background-color: var(--yellow);
  border-radius: 25px;
  width: var(--minawan-box-size, 200px);
  height: var(--minawan-box-size, 200px);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.to-maker {
  font-family: sans-serif;
  font-weight: 500;
  font-size: 24px;
  color: var(--black);
  text-align: center;
  user-select: none;
  cursor: pointer;
  text-decoration: none;
}

.to-maker:hover {
  font-weight: 600;
}
</style>