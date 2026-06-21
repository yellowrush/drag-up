<template>
  <view class="game-wrapper">
    <canvas
      id="gameCanvas"
      type="2d"
      class="game-canvas"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { GameEngine } from '@/utils/game-engine.js'
import { GameStorage } from '@/utils/storage.js'

const canvas = ref<any>(null)
const engine = ref<any>(null)

onMounted(() => {
  // #ifdef H5
  initH5()
  // #endif

  // #ifndef H5
  initUni()
  // #endif
})

function initH5() {
  const el = document.getElementById('gameCanvas') as HTMLCanvasElement
  if (!el) return
  const ctx = el.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  el.width = window.innerWidth * dpr
  el.height = window.innerHeight * dpr
  el.style.width = window.innerWidth + 'px'
  el.style.height = window.innerHeight + 'px'
  ctx.scale(dpr, dpr)

  const eng = new GameEngine(el, ctx)
  engine.value = eng
  eng.loadCurrentLevel()
  emit('ready', eng)

  function loop() {
    eng.update()
    eng.render()
    requestAnimationFrame(loop)
  }
  loop()
}

function initUni() {
  const query = uni.createSelectorQuery().in(getCurrentInstance())
  query.select('#gameCanvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res[0]) return
      const canvasNode = res[0].node
      const ctx = canvasNode.getContext('2d')!
      const dpr = uni.getSystemInfoSync().pixelRatio
      canvasNode.width = res[0].width * dpr
      canvasNode.height = res[0].height * dpr
      ctx.scale(dpr, dpr)

      const eng = new GameEngine(canvasNode, ctx)
      engine.value = eng
      eng.loadCurrentLevel()
      emit('ready', eng)

      function loop() {
        eng.update()
        eng.render()
        canvasNode.requestAnimationFrame(loop)
      }
      loop()
    })
}

function getPointer(e: any) {
  // #ifdef H5
  if (e.touches && e.touches.length > 0) {
    return { pageX: e.touches[0].clientX, pageY: e.touches[0].clientY }
  }
  return { pageX: e.clientX, pageY: e.clientY }
  // #endif

  // #ifndef H5
  if (e.touches && e.touches.length > 0) {
    return { pageX: e.touches[0].x, pageY: e.touches[0].y }
  }
  return { pageX: e.x, pageY: e.y }
  // #endif
}

function onTouchStart(e: any) {
  if (!engine.value) return
  engine.value.handlePointerDown(getPointer(e))
}

function onTouchMove(e: any) {
  if (!engine.value) return
  e.preventDefault()
  engine.value.handlePointerMove(getPointer(e))
}

function onTouchEnd(e: any) {
  if (!engine.value) return
  engine.value.handlePointerUp(getPointer(e))
}

const emit = defineEmits<{
  (e: 'ready', engine: any): void
  (e: 'instruction', text: string): void
}>()

defineExpose({ engine })
</script>

<style scoped>
.game-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
}
.game-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
