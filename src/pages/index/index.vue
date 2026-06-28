<template>
  <view class="page">
    <view class="top-bar" :style="{ paddingTop: safeTop + 'px' }">
      <view class="btn-group">
        <view class="btn" @tap="onLevelsTap">关卡选择</view>
        <view class="btn" @tap="onResetTap">重置</view>
      </view>
      <view class="instruction">
        <text>{{ instruction }}</text>
      </view>
    </view>

    <view class="game-area">
      <game-canvas :paused="showLevelSelect" @ready="onGameReady" @instruction="onInstruction" />
    </view>

    <view
      v-if="showLevelSelect"
      class="modal-mask"
      @tap.self="showLevelSelect = false"
    >
      <view class="modal-box">
        <text class="modal-title">选择关卡</text>
        <view class="level-grid">
          <view
            v-for="lv in levels"
            :key="lv.id"
            class="level-cell"
            :class="{ completed: completedLevels.includes(lv.id) }"
            @tap="onSelectLevel(lv.id)"
          >
            {{ lv.label }}
          </view>
        </view>
      </view>
    </view>

    <view v-show="showNext" class="next-btn" @tap="onNextLevel"> 下一关 </view>
  </view>
</template>

<script setup lang="ts">
  import { ref, shallowRef, markRaw, onMounted } from 'vue';
  import gameCanvas from '@/components/game-canvas.vue';
  import { GameStorage } from '@/utils/storage.js';
  import { LEVELS, getNextLevel } from '@/utils/levels-data.js';

  const engine = shallowRef<any>(null);
  const instruction = ref('');
  const showLevelSelect = ref(false);
  const showNext = ref(false);
  const levels = shallowRef(LEVELS);
  const completedLevels = ref<string[]>([]);
  const safeTop = ref(44); // 默认安全值
  let currentLevelId = '';

  onMounted(() => {
    completedLevels.value = GameStorage.getCompletedLevels();
    // 动态获取状态栏高度，确保不被手机原生状态栏遮挡
    try {
      const sys = uni.getSystemInfoSync();
      safeTop.value = (sys.statusBarHeight || 44) + 8;
    } catch (e) {
      /* keep default */
    }
  });

  function onGameReady(eng: any) {
    engine.value = markRaw(eng);
    currentLevelId = eng.maze.id;
    instruction.value = eng.maze.instruction || '';

    eng.onLevelComplete = () => {
      showNext.value = true;
      GameStorage.markLevelCompleted(eng.maze.id);
      completedLevels.value = GameStorage.getCompletedLevels();
    };

    eng.onInstructionChange = (text: string) => {
      instruction.value = text;
    };
  }

  function onInstruction(text: string) {
    instruction.value = text;
  }

  function onLevelsTap() {
    completedLevels.value = GameStorage.getCompletedLevels();
    showLevelSelect.value = true;
  }

  function onSelectLevel(id: string) {
    if (!engine.value) return;
    engine.value.loadLevel(id);
    currentLevelId = id;
    showLevelSelect.value = false;
    showNext.value = false;
  }

  function onNextLevel() {
    if (!engine.value) return;
    const nextId = getNextLevel(engine.value.maze.id);
    if (nextId) {
      engine.value.loadLevel(nextId);
      currentLevelId = nextId;
    } else {
      completedLevels.value = GameStorage.getCompletedLevels();
      showLevelSelect.value = true;
    }
    showNext.value = false;
  }

  function onResetTap() {
    if (!engine.value) return;
    engine.value.loadLevel(currentLevelId);
    showNext.value = false;
  }
</script>

<style>
  .page {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #1a1a2e;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .top-bar {
    padding: 0 20rpx 12rpx;
    background: rgba(26, 26, 46, 0.85);
  }
  .btn-group {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  .instruction {
    color: #aaa;
    font-size: 24rpx;
    text-align: left;
    margin-left: 20rpx;
  }
  .btn {
    color: #aaa;
    font-size: 26rpx;
    padding: 8rpx 20rpx;
    border: 1rpx solid #444;
    border-radius: 8rpx;
  }
  .game-area {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  .modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-box {
    width: 600rpx;
    background: #222;
    border-radius: 16rpx;
    padding: 40rpx;
  }
  .modal-title {
    color: #fff;
    font-size: 32rpx;
    display: block;
    text-align: center;
    margin-bottom: 30rpx;
  }
  .level-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    justify-content: center;
  }
  .level-cell {
    width: 100rpx;
    height: 100rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #333;
    color: #aaa;
    border-radius: 12rpx;
    font-size: 28rpx;
  }
  .level-cell.completed {
    background: #4a3;
    color: #fff;
  }
  .next-btn {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0) + 60rpx);
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    background: #7b2;
    color: #fff;
    font-size: 32rpx;
    padding: 20rpx 60rpx;
    border-radius: 40rpx;
  }
</style>
