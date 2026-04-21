<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useTripStore } from '@/stores/trip'

const player    = usePlayerStore()
const tripStore = useTripStore()

const fillStyle = computed(() => ({
  width: `${player.progressPercent}%`,
}))
</script>

<template>
  <div class="progress-wrap">
    <div class="progress-track">
      <div class="progress-fill" :style="fillStyle" />
    </div>
    <span class="progress-label">
      {{ player.currentIndex }} / {{ tripStore.count }}
    </span>
  </div>
</template>

<style scoped>
.progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-track {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-brand);
  border-radius: 2px;
  transition: width 400ms var(--ease-out-quart);
}

.progress-label {
  font-size: 13px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
