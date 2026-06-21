<template>
  <div class="game-wrapper">
    <canvas
      id="gameCanvas"
      class="game-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, getCurrentInstance } from 'vue';
  import { GameEngine } from '@/utils/game-engine.js';

  const emit = defineEmits<{
    (e: 'ready', engine: any): void;
    (e: 'instruction', text: string): void;
  }>();

  const engine = ref<any>(null);

  onMounted(() => {
    if (typeof uni !== 'undefined') {
      initUni();
    } else {
      initH5();
    }
  });

  function initH5() {
    const el = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!el) return;
    const ctx = el.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    el.width = window.innerWidth * dpr;
    el.height = window.innerHeight * dpr;
    el.style.width = window.innerWidth + 'px';
    el.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    const eng = new GameEngine(el, ctx);
    engine.value = eng;
    eng.loadCurrentLevel();
    emit('ready', eng);

    function loop() {
      eng.update();
      eng.render();
      requestAnimationFrame(loop);
    }
    loop();
  }

  function initUni() {
    // eslint-disable-next-line no-undef
    const query = uni.createSelectorQuery().in(getCurrentInstance());
    query
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res: any[]) => {
        if (!res[0]) return;
        const canvasNode = res[0].node;
        const ctx = canvasNode.getContext('2d')!;
        // eslint-disable-next-line no-undef
        const dpr = uni.getSystemInfoSync().pixelRatio;
        canvasNode.width = res[0].width * dpr;
        canvasNode.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        const eng = new GameEngine(canvasNode, ctx);
        engine.value = eng;
        eng.loadCurrentLevel();
        emit('ready', eng);

        function loop() {
          eng.update();
          eng.render();
          canvasNode.requestAnimationFrame(loop);
        }
        loop();
      });
  }

  function getPointer(e: PointerEvent) {
    return { pageX: e.pageX || e.clientX, pageY: e.pageY || e.clientY };
  }

  function onPointerDown(e: PointerEvent) {
    if (!engine.value) return;
    engine.value.handlePointerDown(getPointer(e));
  }

  function onPointerMove(e: PointerEvent) {
    if (!engine.value) return;
    e.preventDefault();
    engine.value.handlePointerMove(getPointer(e));
  }

  function onPointerUp(e: PointerEvent) {
    if (!engine.value) return;
    engine.value.handlePointerUp(getPointer(e));
  }

  defineExpose({ engine });
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
