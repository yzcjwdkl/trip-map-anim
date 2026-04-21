<script setup lang="ts">
import { computed } from 'vue'
import type { TripPoint } from '@/types/trip'
import { usePlayerStore } from '@/stores/player'

const props = defineProps<{
  point: TripPoint
  index: number
}>()

const emit = defineEmits<{
  jump:  [index: number]
  edit:  [point: TripPoint]
  remove:[id: number]
}>()

const player = usePlayerStore()

const isActive   = computed(() => player.currentIndex === props.index)
const isVisited  = computed(() => player.currentIndex >  props.index)

const typeIcon: Record<string, string> = {
  food:       '🍜',
  attraction: '🏛',
  activity:   '🎉',
  hotel:      '🏨',
  transport:  '🚗',
}

const travelIcon = computed(() =>
  props.point.travelTypeToHere === 'fly' ? '✈' : '🚗'
)
</script>

<template>
  <div
    class="stop-item"
    :class="{ active: isActive, visited: isVisited }"
    @click="emit('jump', index)"
  >
    <!-- Travel line -->
    <div class="stop-line">
      <span class="travel-icon">{{ travelIcon }}</span>
      <div class="connector" />
    </div>

    <!-- Content -->
    <div class="stop-content">
      <span class="point-icon">{{ typeIcon[point.type] || '📍' }}</span>
      <div class="point-info">
        <span class="point-name">{{ point.name }}</span>
        <span v-if="point.description" class="point-desc">{{ point.description }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stop-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.stop-item:hover {
  background: var(--color-surface);
}

.stop-item.active {
  background: var(--color-accent-bg);
}

.stop-item.visited .point-name {
  color: var(--color-text-2);
}

.stop-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 24px;
  flex-shrink: 0;
}

.travel-icon {
  font-size: 12px;
  color: var(--color-text-3);
}

.connector {
  flex: 1;
  width: 1px;
  min-height: 16px;
  background: var(--color-border);
}

.stop-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
  padding-bottom: var(--space-2);
}

.point-icon {
  font-size: 16px;
  flex-shrink: 0;
  line-height: 1;
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.point-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.point-desc {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
