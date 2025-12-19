<script setup lang="ts">
export interface MinawanInfo {
  twitchUsername?: string;
  url: string;
}

defineProps<MinawanInfo>();
</script>

<template>
  <div class="minawan-box">
    <img
        :src="url"
        :alt="twitchUsername || 'A minawan'"
        style="width: 100%; height: 100%; object-fit: cover"
        draggable="false"
    />
    <span v-if="twitchUsername">
      <img src="~/assets/twitch.svg" alt="Twitch logo" width="20" height="20"/>
      {{ twitchUsername || 'Unnamed Minawan' }}
    </span>
  </div>
</template>

<style scoped>
.minawan-box {
  position: relative;
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

.minawan-box > img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.minawan-box > span {
  font-family: sans-serif;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-weight: 600;
  user-select: all;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 6px;
}

.minawan-box > span > img {
  aspect-ratio: 1;
  background-color: var(--twitch-purple);
  padding: 10px 6px 8px 10px;
  user-select: none;
}
</style>