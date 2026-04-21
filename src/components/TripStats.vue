<script setup lang="ts">
import { computed } from 'vue'
import { useTripStore } from '@/stores/trip'
import { formatDistance } from '@/utils/formatters'

const tripStore = useTripStore()

const props = defineProps<{
  totalDistance: number
  totalDuration: string
}>()

const distanceLabel = computed(() => formatDistance(props.totalDistance))
</script>

<template>
  <div class="trip-stats">
    <div class="stat">
      <span class="stat-value">{{ tripStore.count }}</span>
      <span class="stat-label">地点</span>
    </div>
    <div class="stat-divider" />
    <div class="stat">
      <span class="stat-value">{{ distanceLabel }}</span>
      <span class="stat-label">总里程</span>
    </div>
    <div class="stat-divider" />
    <div class="stat">
      <span class="stat-value">{{ totalDuration }}</span>
      <span class="stat-label">总时长</span>
    </div>
  </div>
</template>

<style scoped>
.trip-stats {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 60px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brand);
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--color-border);
}
</style>
