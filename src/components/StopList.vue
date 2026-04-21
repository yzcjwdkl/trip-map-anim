<script setup lang="ts">
import { ref } from 'vue'
import { useTripStore } from '@/stores/trip'
import { usePlayerStore } from '@/stores/player'
import StopItem from './StopItem.vue'

const tripStore = useTripStore()
const player    = usePlayerStore()

const dragFrom = ref(-1)

function onDragStart(idx: number) {
  dragFrom.value = idx
}

function onDrop(idx: number) {
  if (dragFrom.value !== -1 && dragFrom.value !== idx) {
    tripStore.reorderPoints(dragFrom.value, idx)
  }
  dragFrom.value = -1
}

function handleJump(index: number) {
  player.jumpTo(index)
}
</script>

<template>
  <div class="stop-list">
    <div class="list-header">
      <span class="list-title">行程安排</span>
      <span class="list-count">{{ tripStore.count }}</span>
    </div>

    <div class="list-body">
      <div
        v-for="(point, index) in tripStore.points"
        :key="point.id"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent="() => {}"
        @drop="onDrop(index)"
      >
        <StopItem
          :point="point"
          :index="index"
          @jump="handleJump"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stop-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-2);
}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.list-count {
  font-size: 12px;
  color: var(--color-text-3);
  background: var(--color-surface);
  padding: 2px 8px;
  border-radius: 10px;
}

.list-body {
  display: flex;
  flex-direction: column;
}
</style>
