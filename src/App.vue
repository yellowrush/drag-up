<template>
  <div id="app">
    <game-canvas @ready="onGameReady" @instruction="onInstruction" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import gameCanvas from '@/components/game-canvas.vue'
import { GameStorage } from '@/utils/storage'

const engine = ref<any>(null)
const instruction = ref('')

function onGameReady(gameEngine: any) {
  engine.value = gameEngine
  GameStorage.saveCurrentLevel(gameEngine.maze.id)
  // 通关回调
  gameEngine.onLevelComplete = () => {
    GameStorage.markLevelCompleted(gameEngine.maze.id)
  }
}

function onInstruction(text: string) {
  instruction.value = text
}
</script>

<style>
page, html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #1a1a2e;
}
#app {
  width: 100%;
  height: 100%;
}
</style>
