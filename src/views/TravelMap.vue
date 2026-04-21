<script setup lang="ts">
/**
 * TravelMap — 行程地图主视图
 *
 * 职责：
 * - 初始化地图 + 动画系统
 * - 编排所有子组件
 * - 转发子组件事件到 player/trip store
 *
 * 地图逻辑全部委托给 composables，组件本身只做组合 + 事件转发。
 */

import { ref, computed, onMounted, watch } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { usePlayerStore } from '@/stores/player'
import { useTripStore } from '@/stores/trip'
import { useTripAnimation } from '@/composables/useTripAnimation'
import MapView from '@/components/MapView.vue'
import TripHeader from '@/components/TripHeader.vue'
import TripStats from '@/components/TripStats.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import StopList from '@/components/StopList.vue'
import AddPointDialog from '@/components/AddPointDialog.vue'

// — Stores —
const player = usePlayerStore()
const tripStore = useTripStore()

// — Refs —
const mapContainerRef = ref<HTMLDivElement | null>(null)
let   mapInstance: any = null

// — Animation composable —
const {
  ringState,
  ringVisible,
  initPolyline,
  initMarker,
  startPlay,
  cancelAnim,
  resetAll,
} = useTripAnimation(mapInstance)

// — Trip stats (computed from points) —
const tripStats = computed(() => {
  let totalDist = 0
  let totalDur = 0
  const pts = tripStore.points
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = calcStraightDist(pts[i].position, pts[i + 1].position)
    totalDist += dist
    const dur = dist / (pts[i + 1].travelTypeToHere === 'fly' ? 222 : 16.7) // m/s
    totalDur += dur
  }
  const h = Math.floor(totalDur / 3600)
  const m = Math.floor((totalDur % 3600) / 60)
  const durStr = h > 0 ? `${h} 小时${m > 0 ? ` ${m} 分钟` : ''}` : `${m} 分钟`
  return {
    totalDistance: totalDist,
    totalDuration: durStr,
  }
})

function calcStraightDist(p1: [number, number], p2: [number, number]): number {
  const R = 6371000
  const dLat = (p2[1] - p1[1]) * Math.PI / 180
  const dLon = (p2[0] - p1[0]) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// — Map init —
onMounted(async () => {
  const key = import.meta.env.VITE_AMAP_KEY || ''
  const secCode = import.meta.env.VITE_AMAP_SECURITY_CODE || ''

  window._AMapSecurityConfig = { securityJsCode: secCode }

  const AMap = await AMapLoader.load({
    key,
    version: '2.0',
    plugins: [],
  })

  // Make AMap available globally for driving plugin
  ;(window as any).AMap = AMap

  mapInstance = new AMap.Map('amap-container', {
    zoom: 5,
    center: [105, 36],
    mapStyle: 'amap://styles/whitesmoke',
    viewMode: '3D',
    pitch: 30,
  })

  // Init polyline + marker
  initPolyline()
  initMarker()

  // Fit view to all points
  if (tripStore.count > 0) {
    const points = tripStore.points.map(p => new AMap.LngLat(p.position[0], p.position[1]))
    mapInstance.setFitView(points, false, [60, 60, 60, 60])
  }

  player.setMapReady(true)
})

// — Watch index changes to re-center map —
watch(() => player.currentIndex, (idx) => {
  if (!mapInstance) return
  const pt = tripStore.points[idx]
  if (pt) {
    mapInstance.setCenter([pt.position[0], pt.position[1]])
  }
})

// — Player controls —
function handleStart() { startPlay() }
function handlePause()  { player.pause(); cancelAnim() }
function handleNext()   { player.nextStep() }
function handleReset() { player.reset(); resetAll() }

// — Add point (via Pinia store, AddPointDialog handles it directly) —
</script>

<template>
  <div class="travel-map">
    <!-- Header -->
    <TripHeader />

    <!-- Stats -->
    <div class="stats-row">
      <TripStats
        :totalDistance="tripStats.totalDistance"
        :totalDuration="tripStats.totalDuration"
      />
    </div>

    <!-- Main content: map + sidebar -->
    <div class="main-content">
      <!-- Map -->
      <div class="map-area">
        <MapView
          :ringState="ringState"
          :ringVisible="ringVisible"
        />
      </div>

      <!-- Sidebar -->
      <aside class="sidebar">
        <StopList />

        <!-- Add point dialog (manages its own open/close state via Pinia) -->
        <AddPointDialog :mapReady="player.mapReady" />
      </aside>
    </div>

    <!-- Control panel -->
    <ControlPanel
      @start="handleStart"
      @pause="handlePause"
      @next="handleNext"
      @reset="handleReset"
    />
  </div>
</template>

<style scoped>
.travel-map {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  overflow: hidden;
}

.stats-row {
  padding: var(--space-4) var(--space-6) 0;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
  min-height: 0;
}

.map-area {
  flex: 1;
  min-width: 0;
  position: relative;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--space-4);
  gap: var(--space-3);
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  .map-area {
    height: 50vh;
  }
  .sidebar {
    width: 100%;
    height: 50vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
