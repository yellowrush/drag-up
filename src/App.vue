<template>
  <div class="page">
    <!-- 顶部操作栏 -->
    <div class="top-bar" :style="{ paddingTop: topBarPadding, minHeight: '44px' }">
      <span class="instruction">{{ instruction }}</span>
      <span class="btn" @click="onLevelsTap">关卡选择</span>
      <span class="btn" @click="onResetTap">重置</span>
    </div>

    <div class="game-area">
      <game-canvas :paused="showLevelSelect" @ready="onGameReady" @instruction="onInstruction" />
    </div>

    <!-- 关卡选择弹窗 -->
    <div v-if="showLevelSelect" class="modal-mask" @click.self="showLevelSelect = false">
      <div class="modal-box">
        <div class="modal-title">选择关卡</div>
        <div class="level-grid">
          <div
            v-for="lv in levels"
            :key="lv.id"
            class="level-cell"
            :class="{ completed: completedLevels.includes(lv.id) }"
            @click="onSelectLevel(lv.id)"
          >
            {{ lv.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 下一关按钮 -->
    <div v-if="showNext" class="next-btn" @click="onNextLevel">
      下一关
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gameCanvas from '@/components/game-canvas.vue'
import { GameStorage } from '@/utils/storage.js'
import { LEVELS, getNextLevel } from '@/utils/levels-data.js'

const engine = ref<any>(null)
const instruction = ref('')
const showLevelSelect = ref(false)
const showNext = ref(false)
const levels = ref(LEVELS)
const completedLevels = ref<string[]>([])
const topBarPadding = ref('56px') // 默认安全值
let currentLevelId = ''

onMounted(() => {
  completedLevels.value = GameStorage.getCompletedLevels()
  // 动态获取状态栏高度，没有则用 44px 兜底
  try {
    const sH = uni.getSystemInfoSync().statusBarHeight || 44
    topBarPadding.value = `${sH + 12}px`
  } catch (e) { /* keep default */ }
})

function onGameReady(eng: any) {
  engine.value = eng
  // 如果已有记录当前关卡（组件被 v-if 重建），恢复到该关卡
  if (currentLevelId && currentLevelId !== eng.maze.id) {
    eng.loadLevel(currentLevelId)
  }
  currentLevelId = eng.maze.id
  instruction.value = eng.maze.instruction || ''

  eng.onLevelComplete = () => {
    showNext.value = true
    GameStorage.markLevelCompleted(eng.maze.id)
    completedLevels.value = GameStorage.getCompletedLevels()
  }

  eng.onInstructionChange = (text: string) => {
    instruction.value = text
  }
}

function onInstruction(text: string) {
  instruction.value = text
}

function onLevelsTap() {
  completedLevels.value = GameStorage.getCompletedLevels()
  showLevelSelect.value = true
}

function onSelectLevel(id: string) {
  if (!engine.value) return
  engine.value.loadLevel(id)
  currentLevelId = id
  showLevelSelect.value = false
  showNext.value = false
}

function onNextLevel() {
  if (!engine.value) return
  const next = getNextLevel(engine.value.maze.id)
  if (next) {
    engine.value.loadLevel(next)
    currentLevelId = next
  } else {
    // 已通关所有关卡，显示选关弹窗
    completedLevels.value = GameStorage.getCompletedLevels()
    showLevelSelect.value = true
  }
  showNext.value = false
}

function onResetTap() {
  if (!engine.value) return
  engine.value.loadLevel(currentLevelId)
  showNext.value = false
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
  padding: 0 16px;
  background: rgba(26, 26, 46, 0.95);
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
.btn {
  color: #ccc;
  font-size: 15px;
  padding: 8px 16px;
  border: 1px solid #555;
  border-radius: 8px;
  margin-left: 10px;
  cursor: pointer;
  user-select: none;
  min-width: 72px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.btn:active {
  background: #444;
  color: #fff;
}
.btn:hover {
  color: #fff;
  border-color: #888;
}
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-box {
  width: min(360px, 85vw);
  background: #2a2a40;
  border-radius: 14px;
  padding: 28px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
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
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, color 0.15s, transform 0.15s;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  padding: 4px;
}
.level-cell:active {
  background: #555;
  color: #fff;
  transform: scale(0.95);
}
.level-cell:hover {
  background: #555;
  color: #fff;
}
.level-cell.completed {
  background: #3a6b2a;
  color: #fff;
}
.next-btn {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0) + 48px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: #7b2;
  color: #fff;
  font-size: 18px;
  padding: 14px 44px;
  border-radius: 30px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(119,187,34,0.3);
}
.next-btn:active {
  transform: translateX(-50%) scale(0.95);
  box-shadow: 0 2px 8px rgba(119,187,34,0.2);
}
.next-btn:hover {
  transform: translateX(-50%) scale(1.05);
  box-shadow: 0 4px 16px rgba(119,187,34,0.4);
}
</style>
