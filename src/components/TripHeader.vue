<script setup lang="ts">
import { useTripStore } from '@/stores/trip'
import { usePlayerStore } from '@/stores/player'

const tripStore = useTripStore()
const player    = usePlayerStore()

const typeIcon: Record<string, string> = {
  food:       '🍜',
  attraction: '🏛',
  activity:   '🎉',
  hotel:      '🏨',
  transport:  '🚗',
}
</script>

<template>
  <header class="trip-header">
    <div class="header-top">
      <h1 class="trip-title">{{ tripStore.title }}</h1>
      <span class="trip-date">{{ tripStore.date }}</span>
    </div>

    <Transition name="fade-slide">
      <div v-if="player.currentPoint" class="current-stop">
        <span class="stop-emoji">{{ typeIcon[player.currentPoint.type] || '📍' }}</span>
        <div class="stop-text">
          <span class="stop-name">{{ player.currentPoint.name }}</span>
          <span v-if="player.currentPoint.description" class="stop-desc">
            {{ player.currentPoint.description }}
          </span>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.trip-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
}

.header-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}

.trip-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
  margin: 0;
}

.trip-date {
  font-size: 13px;
  color: var(--color-text-3);
  white-space: nowrap;
}

.current-stop {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.stop-emoji {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.stop-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stop-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.stop-desc {
  font-size: 13px;
  color: var(--color-text-2);
}

/* Transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 300ms var(--ease-out-quart);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
