<template>
  <view class="game-wrapper">
    <!-- #ifdef H5 -->
    <view v-if="!paused" id="canvasHost" class="canvas-host" />
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN -->
    <canvas
      v-if="!paused"
      type="2d"
      id="gameCanvas"
      class="game-canvas"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
  import { shallowRef, ref, onMounted, onUnmounted, getCurrentInstance, watch, nextTick } from 'vue';
  import { GameEngine } from '@/utils/game-engine.js';

  const props = defineProps({
    paused: { type: Boolean, default: false }
  })

  const emit = defineEmits(['ready', 'instruction']);

  const engine = shallowRef(null);

  // Active pointer state for robust cross-device input handling
  const activePointer = ref(null);

  // Keep track of the real H5 canvas element so listeners can be removed on unmount
  const h5CanvasNode = shallowRef(null);
  const h5ResizeObserver = shallowRef(null);
  const h5ResizeCallback = shallowRef(null);
  const h5LoopActive = ref(true);

  // 弹窗开关：暂停时销毁引擎 + 移除 canvas；关闭时重建
  watch(
    () => props.paused,
    (paused) => {
      if (paused) {
        // 立即停止游戏循环 + 销毁引擎，确保原生 canvas 层不再渲染
        h5LoopActive.value = false;
        if (engine.value) {
          engine.value.destroy();
          engine.value = null;
        }
        return;
      }
      // paused 变为 false（弹窗关闭）：等 v-if 重建 canvas 后再初始化
      nextTick(() => {
        // #ifdef H5
        initH5();
        // #endif
        // #ifdef MP-WEIXIN
        initUni();
        // #endif
      });
    }
  );

  onMounted(() => {
    // #ifdef H5
    initH5();
    addH5WindowListeners();
    // #endif
    // #ifdef MP-WEIXIN
    initUni();
    // #endif
  });

  onUnmounted(() => {
    h5LoopActive.value = false;
    // #ifdef H5
    removeH5WindowListeners();
    removeH5CanvasListeners();
    if (h5ResizeObserver.value) {
      h5ResizeObserver.value.disconnect();
      h5ResizeObserver.value = null;
    }
    // #endif
    if (engine.value) {
      engine.value.destroy();
    }
  });

  // ---- H5 initialization ----

  function initH5() {
    const wrapper = document.querySelector('.game-wrapper') as HTMLElement | null;
    const host = document.getElementById('canvasHost') as HTMLElement | null;
    if (!wrapper || !host) {
      // console.error('[game-canvas] cannot find .game-wrapper or #canvasHost');
      return;
    }

    // Ensure the host is a full-size, non-scrolling container.
    host.style.position = 'absolute';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.overflow = 'hidden';

    const dpr = window.devicePixelRatio || 1;

    function createOrResizeCanvas() {
      const rect = host.getBoundingClientRect();
      const w = rect.width || wrapper.clientWidth || window.innerWidth;
      const h = rect.height || wrapper.clientHeight || window.innerHeight;

      if (!w || !h) {
        // console.warn('[game-canvas] canvas host has zero size, retrying next frame');
        requestAnimationFrame(() => createOrResizeCanvas());
        return;
      }

      let canvas = h5CanvasNode.value;
      if (!canvas) {
        // Create a brand-new native canvas element so uni-app's H5 wrapper
        // cannot interfere with sizing or event handling.
        canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.className = 'game-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';
        canvas.style.pointerEvents = 'auto';

        host.innerHTML = '';
        host.appendChild(canvas);
        h5CanvasNode.value = canvas;

        addH5CanvasListeners(canvas);
      } else {
        // Sync CSS size with the current host pixel size.
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }

      // Match the drawing buffer to the CSS pixel size × DPR.
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      const canvasRect = canvas.getBoundingClientRect();
      // console.log('[game-canvas] H5 init', {
      //   w,
      //   h,
      //   dpr,
      //   wrapperRect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
      //   canvasRect: { width: canvasRect.width, height: canvasRect.height, left: canvasRect.left, top: canvasRect.top }
      // });

      if (!engine.value) {
        const eng = new GameEngine(canvas, ctx);
        engine.value = eng;
        eng.setupCanvas(w, h);
        eng.loadCurrentLevel();
        emit('ready', eng);

        // 重新激活动画循环（可能在暂停时被置为 false）
        h5LoopActive.value = true;
        function loop() {
          if (!h5LoopActive.value || engine.value !== eng || props.paused) return;
          eng.update();
          eng.render();
          requestAnimationFrame(loop);
        }
        loop();
      } else {
        // Re-attach the new context and canvas to the existing engine.
        engine.value.canvas = canvas;
        engine.value.ctx = ctx;
        engine.value.setupCanvas(w, h);
      }
    }

    h5ResizeCallback.value = createOrResizeCanvas;

    createOrResizeCanvas();

    // Use ResizeObserver to react to layout changes without relying on window.resize.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => createOrResizeCanvas());
      ro.observe(host);
      h5ResizeObserver.value = ro;
    }
  }

  // ---- WeChat Mini Program initialization ----

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
        // Pass the actual canvas size (CSS pixels) from the query result
        eng.setupCanvas(res[0].width, res[0].height);
        eng.loadCurrentLevel();
        emit('ready', eng);

        function loop() {
          if (props.paused) return;
          eng.update();
          eng.render();
          if (canvasNode && typeof canvasNode.requestAnimationFrame === 'function') {
            canvasNode.requestAnimationFrame(loop);
          } else {
            window.requestAnimationFrame(loop);
          }
        }
        loop();
      });
  }

  // ---- Pointer / mouse / touch event helpers ----

  function getPointer(e: any) {
    // Native PointerEvent / MouseEvent
    if (e.clientX != null) {
      return { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    }
    // TouchEvent (native or uni-app wrapped)
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (touch && touch.clientX != null) {
      return { x: touch.clientX, y: touch.clientY, pointerId: touch.identifier };
    }
    // uni-app custom normalized event detail
    if (e.detail) {
      const d = e.detail;
      if (d.clientX != null) {
        return { x: d.clientX, y: d.clientY, pointerId: d.identifier || d.pointerId };
      }
      if (d.x != null) {
        return { x: d.x, y: d.y, pointerId: d.identifier || d.pointerId };
      }
    }
    return { x: 0, y: 0, pointerId: 0 };
  }

  // ---- H5 event handling (pointer + mouse/touch fallbacks) ----

  function onPointerDown(e: PointerEvent) {
    if (!engine.value || activePointer.value) return;
    const p = getPointer(e);
    if (p.pointerId == null) {
      p.pointerId = 1;
    }
    activePointer.value = { id: p.pointerId, type: 'pointer' };
    try {
      const captureTarget = h5CanvasNode.value || (e.currentTarget as Element);
      if (captureTarget && typeof captureTarget.setPointerCapture === 'function') {
        captureTarget.setPointerCapture(p.pointerId);
      }
    } catch (err) {
      // Ignore
    }
    // console.log('[game-canvas] pointerdown', { x: p.x, y: p.y, id: p.pointerId });
    engine.value.handlePointerDown(p);
  }

  function onMouseDown(e: MouseEvent) {
    // Only used as a fallback when PointerEvent is not supported or did not fire
    if (!engine.value || activePointer.value) return;
    activePointer.value = { id: -1, type: 'mouse' };
    const p = getPointer(e);
    // console.log('[game-canvas] mousedown', { x: p.x, y: p.y });
    engine.value.handlePointerDown(p);
  }

  function onH5PointerMove(e: PointerEvent) {
    if (!engine.value || !activePointer.value) return;
    if (activePointer.value.type !== 'pointer' || activePointer.value.id !== e.pointerId) return;
    e.preventDefault();
    const p = getPointer(e);
    // console.log('[game-canvas] pointermove', { x: p.x, y: p.y, id: e.pointerId });
    engine.value.handlePointerMove(p);
  }

  function onH5PointerUp(e: PointerEvent) {
    if (!engine.value || !activePointer.value) return;
    if (activePointer.value.type !== 'pointer' || activePointer.value.id !== e.pointerId) return;
    const p = getPointer(e);
    // console.log('[game-canvas] pointerup', { x: p.x, y: p.y, id: e.pointerId });
    engine.value.handlePointerUp(p);
    activePointer.value = null;
  }

  function onWindowMouseMove(e: MouseEvent) {
    if (!engine.value || !activePointer.value || activePointer.value.type !== 'mouse') return;
    e.preventDefault();
    engine.value.handlePointerMove(getPointer(e));
  }

  function onWindowMouseUp(e: MouseEvent) {
    if (!engine.value || !activePointer.value || activePointer.value.type !== 'mouse') return;
    engine.value.handlePointerUp(getPointer(e));
    activePointer.value = null;
  }

  function onTouchStart(e: TouchEvent) {
    if (!engine.value || activePointer.value) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    activePointer.value = { id: touch.identifier, type: 'touch' };
    const p = getPointer(e);
    // console.log('[game-canvas] touchstart', { x: p.x, y: p.y, id: touch.identifier });
    engine.value.handlePointerDown(p);
  }

  function onWindowTouchMove(e: TouchEvent) {
    if (!engine.value || !activePointer.value || activePointer.value.type !== 'touch') return;
    e.preventDefault();
    engine.value.handlePointerMove(getPointer(e));
  }

  function onWindowTouchEnd(e: TouchEvent) {
    if (!engine.value || !activePointer.value || activePointer.value.type !== 'touch') return;
    engine.value.handlePointerUp(getPointer(e));
    activePointer.value = null;
  }

  // WeChat canvas component touch events (kept as additional fallback)
  function onTouchMove(e: TouchEvent) {
    if (!engine.value) return;
    e.preventDefault();
    engine.value.handlePointerMove(getPointer(e));
  }

  function onTouchEnd(e: TouchEvent) {
    if (!engine.value) return;
    engine.value.handlePointerUp(getPointer(e));
    activePointer.value = null;
  }

  function onWindowResize() {
    if (h5ResizeCallback.value) {
      h5ResizeCallback.value();
    }
  }

  function resizeH5Canvas() {
    onWindowResize();
  }

  function addH5WindowListeners() {
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('pointermove', onH5PointerMove as any, { passive: false });
    window.addEventListener('pointerup', onH5PointerUp as any, { passive: false });
    window.addEventListener('pointercancel', onH5PointerUp as any, { passive: false });
    window.addEventListener('mousemove', onWindowMouseMove as any, { passive: false });
    window.addEventListener('mouseup', onWindowMouseUp as any, { passive: false });
    window.addEventListener('touchmove', onWindowTouchMove as any, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd as any, { passive: false });
    window.addEventListener('touchcancel', onWindowTouchEnd as any, { passive: false });
  }

  function removeH5WindowListeners() {
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('pointermove', onH5PointerMove as any);
    window.removeEventListener('pointerup', onH5PointerUp as any);
    window.removeEventListener('pointercancel', onH5PointerUp as any);
    window.removeEventListener('mousemove', onWindowMouseMove as any);
    window.removeEventListener('mouseup', onWindowMouseUp as any);
    window.removeEventListener('touchmove', onWindowTouchMove as any);
    window.removeEventListener('touchend', onWindowTouchEnd as any);
    window.removeEventListener('touchcancel', onWindowTouchEnd as any);
  }

  function addH5CanvasListeners(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', onPointerDown as any, { passive: false });
    canvas.addEventListener('pointermove', onH5PointerMove as any, { passive: false });
    canvas.addEventListener('pointerup', onH5PointerUp as any, { passive: false });
    canvas.addEventListener('pointercancel', onH5PointerUp as any, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown as any, { passive: false });
    canvas.addEventListener('mousemove', onWindowMouseMove as any, { passive: false });
    canvas.addEventListener('mouseup', onWindowMouseUp as any, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart as any, { passive: false });
    canvas.addEventListener('touchmove', onWindowTouchMove as any, { passive: false });
    canvas.addEventListener('touchend', onWindowTouchEnd as any, { passive: false });
    canvas.addEventListener('touchcancel', onWindowTouchEnd as any, { passive: false });
  }

  function removeH5CanvasListeners() {
    const canvas = h5CanvasNode.value;
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', onPointerDown as any);
    canvas.removeEventListener('pointermove', onH5PointerMove as any);
    canvas.removeEventListener('pointerup', onH5PointerUp as any);
    canvas.removeEventListener('pointercancel', onH5PointerUp as any);
    canvas.removeEventListener('mousedown', onMouseDown as any);
    canvas.removeEventListener('mousemove', onWindowMouseMove as any);
    canvas.removeEventListener('mouseup', onWindowMouseUp as any);
    canvas.removeEventListener('touchstart', onTouchStart as any);
    canvas.removeEventListener('touchmove', onWindowTouchMove as any);
    canvas.removeEventListener('touchend', onWindowTouchEnd as any);
    canvas.removeEventListener('touchcancel', onWindowTouchEnd as any);
  }

  defineExpose({ engine });
</script>

<style scoped>
  .game-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: auto;
    position: relative;
    touch-action: none;
  }
  .canvas-host {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .game-canvas {
    width: 100%;
    height: 100%;
    touch-action: none;
    pointer-events: auto;
    cursor: pointer;
    display: block;
  }
</style>
