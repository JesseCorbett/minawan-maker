<script setup lang="ts">
import type { Eyes } from "~/components/Minawan.vue";

export type Accessories = "eyebrows" | "minibot" | "crab" | "milc" | "vedal" | "drill" | "reindeer" | "santa"

const props = defineProps<{
  eyes: Eyes
  eyeColor: string
  bodyLight: string
  bodyShaded: string
  outline: string
  mouth: string,
  accessories?: Accessories[],
  width: number
}>()

const emits = defineEmits<{
  dataUrlCreated: [url: string]
}>()

const scale = computed<number>(() => props.width / 500)

const cerberAngryEyebrows = useTemplateRef<HTMLImageElement>('cerberAngryEyebrows')
const cerberMinibotAntennae = useTemplateRef<HTMLImageElement>('cerberMinibotAntennae')
const crab = useTemplateRef<HTMLImageElement>('crab')
const milc = useTemplateRef<HTMLImageElement>('milc')
const tutel = useTemplateRef<HTMLImageElement>('tutel')
const drill = useTemplateRef<HTMLImageElement>('drill')
const reindeer = useTemplateRef<HTMLImageElement>('reindeer')
const santa = useTemplateRef<HTMLImageElement>('santa')

const { width, eyes, eyeColor, outline, mouth, bodyLight, bodyShaded, accessories } = toRefs(props)
watch([width, eyes, eyeColor, outline, mouth, bodyLight, bodyShaded, accessories], () => nextTick(() => updateCanvas()))

const canvas = useTemplateRef('canvas')
let ctx: CanvasRenderingContext2D
const svg = useTemplateRef<HTMLDivElement>('svg')
onMounted(() => {
  function loadImage(img: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
      img.onload = () => resolve();
    });
  }

  const loaders = [crab, milc, tutel, drill, reindeer, santa, cerberAngryEyebrows, cerberMinibotAntennae].map((img) => loadImage(img.value!))
  Promise.all(loaders).then(() => {
    ctx = canvas.value!.getContext('2d')!
    updateCanvas()
  })
})

function drawImage(image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(image, scale.value * x, (scale.value * (y + 50)), scale.value * w, scale.value * h)
}

function updateCanvas() {
  const svgHtml = svg.value!.firstElementChild!.outerHTML
      .replaceAll('var(--body-light, #cab5d6)', props.bodyLight)
      .replaceAll('var(--body-shaded, #bea3d0)', props.bodyShaded)
      .replaceAll('var(--outline, #000000)', props.outline)
      .replaceAll('var(--mouth, #000000)', props.mouth)
      .replaceAll('var(--eyes, #000000)', props.eyeColor)
  const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const image = new Image()
  image.onload = () => {
    ctx.clearRect(0, 0, props.width, props.width)
    drawImage(
        image,
        ((500 - (195 * 2)) / 2),
        ((500 - (139 * 2)) / 2),
        195 * 2,
        139 * 2
    )
    URL.revokeObjectURL(url)

    props.accessories?.forEach(accessory => {
      switch (accessory) {
        case "minibot":
          drawImage(cerberMinibotAntennae.value!, 120, 50, 120, 225)
          break
        case "milc":
          drawImage(milc.value!, 150, 250, 280, 210)
          break
        case "crab":
          drawImage(crab.value!, 75, 150, 100, 200)
          break
        case "vedal":
          drawImage(tutel.value!, 195, 30, 210, 150)
          break
        case "eyebrows":
          drawImage(cerberAngryEyebrows.value!, 179, 145, 250, 75)
          break
        case "drill":
          drawImage(drill.value!, 176, 160, 264, 100)
          break
        case "reindeer":
          drawImage(reindeer!.value!, 170, 10, 260, 160)
          break
        case "santa":
          drawImage(santa.value!, 190, 0, 300, 200)
          break
      }
    })

    emits('dataUrlCreated', canvas.value!.toDataURL())
  }
  image.src = url
}
</script>

<template>
  <div>
    <canvas ref="canvas" :width="width" :height="width"></canvas>
    <div hidden ref="svg">
      <Minawan :eyes="eyes"/>
    </div>
    <div hidden>
      <img ref="cerberAngryEyebrows" src="~/assets/accessories/cerber-angry-eyebrows.png"/>
      <img ref="cerberMinibotAntennae" src="~/assets/accessories/cerber-minibot-antennae.png"/>
      <img ref="crab" src="~/assets/accessories/hanging_crab.png"/>
      <img ref="milc" src="~/assets/accessories/milc_collar.png"/>
      <img ref="tutel" src="~/assets/accessories/vedalplush.png"/>
      <img ref="drill" src="~/assets/accessories/WICKED_Glasses.png"/>
      <img ref="reindeer" src="~/assets/accessories/reindeer.png"/>
      <img ref="santa" src="~/assets/accessories/santa.png"/>
    </div>
  </div>
</template>

<style scoped>
canvas {
  width: v-bind(width) + 'px';
  aspect-ratio: 1;
  max-width: 100%;
}
</style>
