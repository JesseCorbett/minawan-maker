<script setup lang="ts">
import type { Eyes } from "~/components/Minawan.vue";
import type { Accessories } from "~/components/MinawanCanvas.vue";
import { ref as storageRef } from "firebase/storage";

onMounted(() => {
  jscolor.install()
})

const props = defineProps<{
  eyes: Eyes
  eyeColor: string
  bodyLight: string
  bodyShaded: string
  outline: string
  mouth: string,
  accessories?: Accessories[]
}>()

const storage = useFirebaseStorage();
const user = useCurrentUser();

const eyes = ref<Eyes>(props.eyes)
const eyeColor = ref(props.eyeColor)
const bodyLight = ref(props.bodyLight)
const bodyShaded = ref(props.bodyShaded)
const outline = ref(props.outline)
const mouth = ref(props.mouth)

function updateBodyLight(event: InputEvent) {
  bodyLight.value = event.target!.value
}

function updateBodyShaded(event: InputEvent) {
  bodyShaded.value = event.target!.value
}

function updateOutline(event: InputEvent) {
  outline.value = event.target!.value
}

function updateMouth(event: InputEvent) {
  mouth.value = event.target!.value
}

function updateEyeColor(event: InputEvent) {
  eyeColor.value = event.target!.value
}

function updateEyes(eye: Eyes) {
  eyes.value = eye
}

const dataUrl = ref()

const activeAccessories = ref<Accessories[]>(props.accessories || [])

function toggleAccessory(accessory: Accessories) {
  if (activeAccessories.value.includes(accessory)) {
    activeAccessories.value = activeAccessories.value.filter(acc => acc !== accessory)
  } else {
    activeAccessories.value = [...activeAccessories.value, accessory]
  }
}

const uploadPath = computed(() => {
  if (user.value) {
    return `minawan/${user.value!.uid}/minasona.png`;
  }
});

const uploadRef = computed(() => {
  if (uploadPath.value) {
    return storageRef(storage, uploadPath.value);
  }
});

const { upload, uploadProgress } = useStorageFile(uploadRef);

async function uploadMinasona(base64: string) {
  const response = await fetch(base64);
  const blob = await response.blob();
  upload(blob);
}

const savingMinasona = ref(false);
async function saveMinasona() {
  if (!dataUrl.value || savingMinasona.value) return;
  savingMinasona.value = true;
  await uploadMinasona(dataUrl.value);
  setTimeout(() => savingMinasona.value = false, 1000);
}
</script>

<template>
  <div id="minawan-maker">
    <MinawanCanvas
        :width="512"
        :body-light="bodyLight"
        :body-shaded="bodyShaded"
        :outline="outline"
        :eye-color="eyeColor"
        :mouth="mouth"
        :eyes="eyes"
        :accessories="activeAccessories"
        @dataUrlCreated="dataUrl = $event"
    />
    <div id="controls">
      <label>Accessories</label>
      <div class="group">
        <div>
          <label @click="toggleAccessory('crab')">🦀</label>
        </div>
        <div>
          <label @click="toggleAccessory('milc')">🥛</label>
        </div>
        <div>
          <label @click="toggleAccessory('eyebrows')">😠</label>
        </div>
        <div>
          <label @click="toggleAccessory('minibot')">🤖</label>
        </div>
        <div>
          <label @click="toggleAccessory('vedal')">🐢</label>
        </div>
        <div>
          <label @click="toggleAccessory('drill')">🕶️</label>
        </div>
        <div>
          <label @click="toggleAccessory('reindeer')">🦌</label>
        </div>
        <div>
          <label @click="toggleAccessory('santa')">🎅🏻️</label>
        </div>
      </div>
      <label>Eyes</label>
      <div class="group">
        <div>
          <label for="circle" @click="updateEyes('o')">● ●</label>
          <input name="eyes" id="circle" type="radio" hidden>
        </div>
        <div>
          <label for="stars" @click="updateEyes('star')">♢ ♢</label>
          <input name="eyes" id="stars" type="radio" hidden>
        </div>
        <div>
          <label for="gt" @click="updateEyes('arrows')">&gt; &lt;</label>
          <input name="eyes" id="gt" type="radio" hidden>
        </div>
        <div>
          <label for="ticks" @click="updateEyes('^')">^ ^</label>
          <input name="eyes" id="ticks" type="radio" hidden>
        </div>
      </div>

      <div>
        <label for="outline">Eye Color</label>
        <input id="outline" :value="eyeColor" @input="updateEyeColor" data-jscolor="{
      format: 'hex',
      required: true,
      alphaChannel: false
    }"/>
      </div>

      <div>
        <label for="outline">Mouth</label>
        <input id="outline" :value="mouth" @input="updateMouth" data-jscolor="{
      format: 'hex',
      required: true,
      alphaChannel: false
    }"/>
      </div>

      <div>
        <label for="outline">Outline</label>
        <input id="outline" :value="outline" @input="updateOutline" data-jscolor="{
      format: 'hex',
      required: true,
      alphaChannel: false
    }"/>
      </div>

      <div>
        <label for="bodyLight">Body (upper)</label>
        <input id="bodyLight" :value="bodyLight" @input="updateBodyLight" data-jscolor="{
      format: 'hex',
      required: true,
      alphaChannel: false
    }"/>
      </div>
      <div>
        <label for="bodyShaded">Body (lower)</label>
        <input id="bodyShaded" :value="bodyShaded" @input="updateBodyShaded" data-jscolor="{
      format: 'hex',
      required: true,
      alphaChannel: false
    }"/>
      </div>
    </div>
    <div id="save">
      <a :href="dataUrl" download="minasona.png">Download</a>
      <a v-if="!!user" @click="saveMinasona">{{ uploadProgress ? uploadProgress === 1 ? 'Upload Complete' : `Uploaded ${Math.ceil(uploadProgress * 100)}%` : 'Set as minasona' }}</a>
    </div>
  </div>
</template>

<style scoped>
#minawan-maker {
  background: var(--yellow);
  box-shadow: var(--pink) 4px 8px;
  border: 5px solid var(--cerb-light);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 4px 32px;
  max-width: 100vw;
}

#controls {
  display: grid;
  gap: 4px;
  grid-template-columns: 1fr 1fr;
}

#controls > div {
  display: flex;
  flex-direction: column;
}

#controls > .group {
  user-select: none;
  display: flex;
  flex-direction: row;
  gap: 8px;
  grid-column: span 2;
  flex-wrap: wrap;
}

#save {
  grid-column: span 1;
  width: 100%;
  padding: 16px 8px 0;
  display: flex;
  gap: 4px;
}

#save a {
  cursor: pointer;
  background: var(--cerb-dark);
  color: white;
  font-size: 16px;
  padding: 4px 6px;
  font-family: sans-serif;
  border-radius: 12px;
  user-select: none;
  text-decoration: none;
  border: 4px solid var(--cerb-dark);
}

#save a:hover {
  background: var(--cerb-light);
}

@media (min-width: 1280px) {
  #minawan-maker {
    grid-template-columns: 1fr 350px;
  }

  #controls {
    grid-template-columns: 1fr;
  }

  #controls > .group {
    grid-column: span 1;
  }

  #save {
    grid-column: span 2;
  }
}

@media (max-width: 700px) {
  #controls {
    grid-template-columns: 1fr;
  }

  #controls > .group {
    grid-column: span 1;
  }
}

#controls > .group label {
  color: var(--cerb-dark);
  padding: 0;
  cursor: pointer;
  width: 50px;
  height: 30px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--pink);
  border-radius: 8px;
}

#controls input {
  width: fit-content;
  border: 2px solid var(--pink);
  border-radius: 12px;
  font-size: 24px;
}

#controls label {
  padding: 8px 0 1px;
  color: var(--cerb-dark);
  font-family: DynaPuff, sans-serif;
}
</style>
