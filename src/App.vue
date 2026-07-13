<template>
  <view class="page">
    <view
      class="top-bar"
      :style="{ paddingTop: topBarPadding, minHeight: '44px' }"
    >
      <text class="instruction">{{ instruction }}</text>
      <view class="tool-actions">
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
        <view class="modal-title">选择关卡</view>
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

    <view v-show="showNext" class="next-btn" @tap="onNextLevel">&#19979;&#19968;&#20851;</view>
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
  const topBarPadding = ref('56px'); // 默认安全值
  let currentLevelId = '';

  onMounted(() => {
    completedLevels.value = GameStorage.getCompletedLevels();
    // 动态获取状态栏高度，没有则用 44px 兜底
    try {
      const sH = uni.getSystemInfoSync().statusBarHeight || 44;
      topBarPadding.value = `${sH + 12}px`;
    } catch (e) {
      /* keep default */
    }
  });

  function onGameReady(eng: any) {
    engine.value = markRaw(eng);
    // 如果已有记录当前关卡（组件被 v-if 重建），恢复到该关卡
    if (currentLevelId && currentLevelId !== eng.maze.id) {
      eng.loadLevel(currentLevelId);
    }
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
    const next = getNextLevel(engine.value.maze.id);
    if (next) {
      engine.value.loadLevel(next);
      currentLevelId = next;
    } else {
      // 已通关所有关卡，显示选关弹窗
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
    position: relative;
  }
  .top-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px 8px;
    background: rgba(26, 26, 46, 0.72);
    box-sizing: border-box;
  }
  .game-area {
    flex: 1;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  .instruction {
    color: #aaa;
    font-size: 13px;
    flex: 1;
  }
  .tool-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-left: 12px;
  }
  .tool-btn {
    width: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .tool-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    box-sizing: border-box;
    font-weight: 800;
    line-height: 1;
  }
  .retry-icon {
    color: #fff;
    background: linear-gradient(180deg, #ffd970 0%, #f2a92e 100%);
    border: 2px solid #9f6a18;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.45),
      0 2px 0 rgba(74, 44, 12, 0.2);
  }
  .retry-mark {
    width: 20px;
    height: 20px;
    border: 4px solid #fff;
    border-right-color: transparent;
    border-radius: 50%;
    position: relative;
    box-sizing: border-box;
  }
  .retry-head {
    position: absolute;
    right: -4px;
    top: -5px;
    width: 0;
    height: 0;
    border-left: 8px solid #fff;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    transform: rotate(18deg);
  }
  .settings-icon {
    color: #f5f5f5;
    background: #b9b9b9;
    border: 2px solid #4a4a4a;
    text-shadow:
      -1px 0 #4a4a4a,
      0 1px #4a4a4a,
      1px 0 #4a4a4a,
      0 -1px #4a4a4a;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.38);
  }
  .gear-mark {
    width: 24px;
    height: 24px;
    border: 4px solid #4a4a4a;
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
    inset: -8px;
    background:
      linear-gradient(90deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%),
      linear-gradient(0deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%);
    transform: rotate(45deg);
    z-index: -1;
  }
  .gear-hole {
    width: 11px;
    height: 11px;
    border: 3px solid #4a4a4a;
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
    font-size: 12px;
    font-weight: 700;
    line-height: 1.1;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
  .modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-box {
    width: 360px;
    max-width: 85vw;
    background: #2a2a40;
    border-radius: 14px;
    padding: 28px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .modal-title {
    color: #fff;
    font-size: 18px;
    text-align: center;
    margin-bottom: 20px;
  }
  .level-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .level-cell {
    width: 72px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3a3a55;
    color: #bbb;
    border-radius: 10px;
    font-size: 12px;
    text-align: center;
    line-height: 1.2;
    word-break: break-word;
    padding: 4px;
  }
  .level-cell.completed {
    background: #3a6b2a;
    color: #fff;
  }
  .next-btn {
    position: fixed;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    min-width: 132px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffe1a2 0%, #f2b653 100%);
    color: #5f3713;
    font-size: 18px;
    font-weight: 800;
    padding: 0 32px;
    border: 3px solid #98621f;
    border-radius: 14px;
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.45),
      0 5px 0 rgba(68, 39, 12, 0.18);
  }
</style>
