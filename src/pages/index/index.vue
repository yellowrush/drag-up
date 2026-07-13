<template>
  <view class="page">
    <view class="top-bar" :style="{ paddingTop: safeTop + 'px' }">
      <view class="btn-group">
        <view class="tool-btn" @tap="onResetTap">
          <view class="tool-icon retry-icon">
            <view class="retry-mark">
              <view class="retry-head"></view>
            </view>
          </view>
          <text class="tool-label">&#37325;&#35797;</text>
        </view>
        <view class="tool-btn" @tap="onLevelsTap">
          <view class="tool-icon settings-icon">
            <view class="gear-mark">
              <view class="gear-hole"></view>
            </view>
          </view>
          <text class="tool-label">&#35774;&#32622;</text>
        </view>
      </view>
      <view class="instruction">
        <text>{{ instruction }}</text>
      </view>
    </view>

    <view class="game-area">
      <game-canvas
        :paused="showLevelSelect"
        @ready="onGameReady"
        @instruction="onInstruction"
      />
    </view>

    <view
      v-if="showLevelSelect"
      class="modal-mask"
      @tap.self="showLevelSelect = false"
    >
      <view class="modal-box">
        <text class="modal-title">&#36873;&#25321;&#20851;&#21345;</text>
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

    <view v-show="showNext" class="next-btn" @tap="onNextLevel">
      &#19979;&#19968;&#20851;
    </view>
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
  const safeTop = ref(44);
  let currentLevelId = '';

  onMounted(() => {
    completedLevels.value = GameStorage.getCompletedLevels();
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
    padding: 0 24rpx 10rpx;
    background: rgba(26, 26, 46, 0.72);
  }
  .btn-group {
    display: flex;
    align-items: center;
    gap: 26rpx;
  }
  .instruction {
    color: #ddd;
    font-size: 24rpx;
    text-align: center;
    margin-top: 12rpx;
  }
  .tool-btn {
    width: 92rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
  }
  .tool-icon {
    width: 68rpx;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20rpx;
    box-sizing: border-box;
    font-weight: 800;
    line-height: 1;
  }
  .retry-icon {
    color: #fff;
    background: linear-gradient(180deg, #ffd970 0%, #f2a92e 100%);
    border: 4rpx solid #9f6a18;
    box-shadow:
      inset 0 4rpx 0 rgba(255, 255, 255, 0.45),
      0 3rpx 0 rgba(74, 44, 12, 0.2);
  }
  .retry-mark {
    width: 38rpx;
    height: 38rpx;
    border: 8rpx solid #fff;
    border-right-color: transparent;
    border-radius: 50%;
    position: relative;
    box-sizing: border-box;
  }
  .retry-head {
    position: absolute;
    right: -8rpx;
    top: -9rpx;
    width: 0;
    height: 0;
    border-left: 15rpx solid #fff;
    border-top: 9rpx solid transparent;
    border-bottom: 9rpx solid transparent;
    transform: rotate(18deg);
  }
  .settings-icon {
    color: #f5f5f5;
    background: #b9b9b9;
    border: 4rpx solid #4a4a4a;
    box-shadow: inset 0 4rpx 0 rgba(255, 255, 255, 0.38);
  }
  .gear-mark {
    width: 44rpx;
    height: 44rpx;
    border: 8rpx solid #4a4a4a;
    border-radius: 50%;
    background:
      linear-gradient(90deg, transparent 37%, #4a4a4a 37%, #4a4a4a 63%, transparent 63%),
      linear-gradient(0deg, transparent 37%, #4a4a4a 37%, #4a4a4a 63%, transparent 63%),
      #d9d9d9;
    position: relative;
    box-sizing: border-box;
  }
  .gear-mark::before {
    content: '';
    position: absolute;
    inset: -15rpx;
    background:
      linear-gradient(90deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%),
      linear-gradient(0deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%);
    transform: rotate(45deg);
    z-index: -1;
  }
  .gear-hole {
    width: 20rpx;
    height: 20rpx;
    border: 5rpx solid #4a4a4a;
    border-radius: 50%;
    background: #f5f5f5;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
  }
  .tool-label {
    color: #eeeeee;
    font-size: 24rpx;
    font-weight: 700;
    line-height: 1.1;
    text-shadow: 0 2rpx 2rpx rgba(0, 0, 0, 0.45);
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
    min-width: 260rpx;
    height: 78rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffe1a2 0%, #f2b653 100%);
    color: #5f3713;
    font-size: 32rpx;
    font-weight: 800;
    padding: 0 58rpx;
    border: 5rpx solid #98621f;
    border-radius: 24rpx;
    box-shadow:
      inset 0 5rpx 0 rgba(255, 255, 255, 0.45),
      0 8rpx 0 rgba(68, 39, 12, 0.18);
  }
</style>
