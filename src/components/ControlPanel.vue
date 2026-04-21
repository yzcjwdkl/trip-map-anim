<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import ProgressBar from './ProgressBar.vue'

const player = usePlayerStore()

const emit = defineEmits<{
  start: []
  pause: []
  next:  []
  reset: []
}>()

function handleToggle() {
  if (player.isPlaying) {
    emit('pause')
  } else {
    emit('start')
  }
}
</script>

<template>
  <div class="control-panel">
    <ProgressBar />

    <!-- Main controls -->
    <div class="player-row">
      <button class="btn btn-ghost btn-sm" @click="emit('reset')">
        ⏮ 重置
      </button>
      <button
        class="btn btn-primary play-btn"
        :disabled="!player.mapReady"
        @click="handleToggle"
      >
        {{ player.isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="!player.hasNext"
        @click="emit('next')"
      >
        下一步 ⏭
      </button>
    </div>

    <!-- Speed + rotation -->
    <div class="secondary-row">
      <div class="speed-group">
        <span class="ctrl-label">速度</span>
        <button
          v-for="s in player.speeds"
          :key="s"
          class="speed-btn"
          :class="{ active: player.currentSpeed === s }"
          @click="player.setSpeed(s)"
        >
          {{ s }}x
        </button>
      </div>

      <button
        class="btn btn-ghost btn-sm rotation-btn"
        :class="{ active: player.enableMapRotation }"
        @click="player.toggleRotation()"
      >
        🧭 旋转
      </button>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.play-btn {
  min-width: 100px;
  justify-content: center;
  font-size: 15px;
  padding: var(--space-2) var(--space-6);
  height: 40px;
  border-radius: var(--radius-md);
}

.secondary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.speed-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ctrl-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-right: var(--space-1);
}

.speed-btn {
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.speed-btn.active {
  background: var(--color-brand);
  color: #fff;
  border-color: var(--color-brand);
}

.speed-btn:hover:not(.active) {
  border-color: var(--color-border-2);
  color: var(--color-text);
}

.rotation-btn.active {
  color: var(--color-brand);
  border-color: var(--color-brand);
  background: var(--color-accent-bg);
}
</style>
