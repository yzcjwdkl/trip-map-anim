<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()
const mapContainer = useTemplateRef<HTMLDivElement>('mapContainer')

defineExpose({ mapContainer })

const uid = Math.random().toString(36).slice(2, 8)

const props = defineProps<{
  ringState: {
    screenX: number; screenY: number
    outerR: number; innerR: number
    opacity: number; strokeW: number
  }
  ringVisible: boolean
}>()
</script>

<template>
  <div class="map-wrapper">
    <div id="amap-container" ref="mapContainer" class="map-container" />

    <!-- Arrival ring overlay -->
    <svg
      class="ring-overlay"
      :style="{ display: ringVisible ? 'block' : 'none' }"
    >
      <defs>
        <mask :id="'rm-' + uid">
          <rect width="100%" height="100%" fill="white" />
          <circle
            :cx="ringState.screenX"
            :cy="ringState.screenY"
            :r="ringState.outerR"
            fill="black"
          />
          <circle
            :cx="ringState.screenX"
            :cy="ringState.screenY"
            :r="ringState.innerR"
            fill="white"
          />
        </mask>
      </defs>
      <circle
        :cx="ringState.screenX"
        :cy="ringState.screenY"
        :r="ringState.outerR"
        fill="none"
        :stroke="`rgba(193,127,89,${ringState.opacity})`"
        :stroke-width="ringState.strokeW"
        :mask="`url(#rm-${uid})`"
      />
    </svg>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.ring-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}
</style>
