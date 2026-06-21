<template>
  <div class="page">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <span class="instruction">{{ instruction }}</span>
      <span class="btn" @click="onLevelsTap">Levels</span>
      <span class="btn" @click="onResetTap">Reset</span>
    </div>

    <!-- 游戏画布 -->
    <game-canvas @ready="onGameReady" @instruction="onInstruction" />

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
      Next Level
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
let currentLevelId = ''

onMounted(() => {
  completedLevels.value = GameStorage.getCompletedLevels()
})

function onGameReady(eng: any) {
  engine.value = eng
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
  overflow: hidden;
  background: #1a1a2e;
  position: relative;
}
.top-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  padding-top: calc(env(safe-area-inset-top, 0) + 8px);
  background: rgba(26, 26, 46, 0.85);
}
.instruction {
  color: #aaa;
  font-size: 13px;
  flex: 1;
}
.btn {
  color: #aaa;
  font-size: 14px;
  padding: 4px 12px;
  border: 1px solid #444;
  border-radius: 6px;
  margin-left: 10px;
  cursor: pointer;
  user-select: none;
}
.btn:hover {
  color: #fff;
  border-color: #666;
}
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-box {
  width: min(360px, 85vw);
  background: #222;
  border-radius: 14px;
  padding: 28px;
  max-height: 80vh;
  overflow-y: auto;
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
  background: #333;
  color: #bbb;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  padding: 4px;
}
.level-cell:hover {
  background: #444;
  color: #fff;
}
.level-cell.completed {
  background: #4a3;
  color: #fff;
}
.next-btn {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0) + 40px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: #7b2;
  color: #fff;
  font-size: 18px;
  padding: 12px 40px;
  border-radius: 30px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.next-btn:hover {
  transform: translateX(-50%) scale(1.05);
  box-shadow: 0 4px 16px rgba(119,187,34,0.4);
}
</style>
