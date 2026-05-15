<template>
  <div class="map-container" :class="{ 'is-fullscreen': fullscreen }" ref="containerRef">
    <!-- 全屏按钮 -->
    <el-button class="fullscreen-btn" link @click="emit('toggle-fullscreen')" title="全屏">⛶</el-button>

    <!-- 高德地图容器 -->
    <div id="amap-container" ref="amapContainerRef"></div>

    <!-- 天空遮罩 -->
    <div class="sky-mask"></div>

    <!-- 地图加载遮罩 -->
    <div class="map-loading" ref="loadingRef" v-show="!mapReady">
      <div class="loading-inner">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      <span class="loading-text">地图加载中</span>
    </div>

    <!-- 到达涟漪 SVG 遮罩 -->
    <svg class="ring-overlay" ref="ringOverlayRef" style="display:none">
      <defs>
        <mask :id="'rm-' + uid">
          <rect width="100%" height="100%" fill="white"/>
          <circle :cx="ringState.screenX" :cy="ringState.screenY" :r="ringState.outerR" fill="black"/>
          <circle :cx="ringState.screenX" :cy="ringState.screenY" :r="ringState.innerR" fill="white"/>
        </mask>
      </defs>
      <circle
        :cx="ringState.screenX"
        :cy="ringState.screenY"
        :r="ringState.outerR"
        fill="oklch(55% 0.18 290 / 0.15)"
        :mask="'url(#rm-' + uid + ')'"
      />
    </svg>

    <!-- 移动中光点 -->
    <div class="moving-dot" ref="movingDotRef" :class="{ visible: isPlaying }">
      <div class="dot-ring"></div>
      <div class="dot-core"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  fullscreen:  { type: Boolean, default: false },
  isPlaying:   { type: Boolean, default: false },
  mapReady:    { type: Boolean, default: false },
  ringState:   { type: Object, default: () => ({ active: false, screenX: 0, screenY: 0, outerR: 0, innerR: 0 }) },
})

const emit = defineEmits(['toggle-fullscreen', 'map-ready'])

// DOM refs
const containerRef    = ref(null)
const amapContainerRef = ref(null)
const loadingRef     = ref(null)
const ringOverlayRef = ref(null)
const movingDotRef   = ref(null)

const uid = Date.now()

let ctx = null

onMounted(() => {
  ctx = gsap.context(() => {}, containerRef.value)
})

// ── 到达涟漪动画 ───────────────────────────────────────────────
watch(() => props.ringState?.active, (active) => {
  if (!ringOverlayRef.value) return
  ctx ??= gsap.context(() => {}, containerRef.value)

  if (active) {
    ringOverlayRef.value.style.display = 'block'
    const ring = ringOverlayRef.value.querySelector('circle')
    if (ring) {
      gsap.fromTo(ring,
        { attr: { r: 6 }, opacity: 0.65 },
        {
          attr: { r: 32 },
          opacity: 0,
          duration: 0.9,
          ease: 'power2.out',
        }
      )
    }
  } else {
    gsap.set(ringOverlayRef.value, { display: 'none' })
  }
})

// ── Marker 高亮动画 ─────────────────────────────────────────────
function animateMarkerTo(markerInstance, toPos) {
  if (!containerRef.value) return
  if (!ctx) ctx = gsap.context(() => {}, containerRef.value)

  const dot = movingDotRef.value
  if (dot) {
    gsap.fromTo(dot,
      { scale: 1 },
      { scale: 1.2, duration: 0.3, ease: 'back.out(1.8)', yoyo: true, repeat: 1 }
    )
  }
}

// ── 地图加载完成动画 ───────────────────────────────────────────
watch(() => props.mapReady, (ready) => {
  if (!ready || !loadingRef.value) return
  if (!ctx) ctx = gsap.context(() => {}, containerRef.value)
  gsap.to(loadingRef.value, {
    opacity: 0,
    duration: 0.45,
    ease: 'power2.out',
    onComplete() {
      if (loadingRef.value) loadingRef.value.style.display = 'none'
    }
  })
})

onUnmounted(() => ctx?.revert())

// 暴露给父组件
defineExpose({ animateMarkerTo, amapContainerRef, ringOverlayRef })
</script>

<style scoped>
.map-container {
  flex: 1;
  min-height: 0;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 0 0 1px oklch(86% 0.008 55 / 0.3),
    0 0 40px 6px oklch(96% 0.005 55),
    0 0 80px 20px oklch(96% 0.005 55 / 0.6),
    0 8px 32px oklch(30% 0.01 55 / 0.06),
    0 2px 8px oklch(30% 0.01 55 / 0.04);
  display: flex;
  flex-direction: column;
}

.map-container.is-fullscreen {
  border-radius: 0 !important;
  box-shadow: none !important;
  height: 100vh;
}

#amap-container {
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 0;
}

/* 天空遮罩 — z-index 2 */
.sky-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(to bottom, oklch(96% 0.005 55 / 0.7) 0%, transparent 25%);
  pointer-events: none;
  border-radius: 18px;
}
.map-container.is-fullscreen .sky-mask { display: none; }

/* 全屏按钮 — z-index 20 */
.fullscreen-btn {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 20;
  width: 36px; height: 36px;
  background: oklch(100% 0 0 / 0.9);
  border: 1px solid oklch(86% 0.008 55);
  border-radius: 9px;
  cursor: pointer;
  font-size: 17px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}
.fullscreen-btn:hover {
  background: oklch(100% 0 0);
  box-shadow: 0 4px 14px oklch(30% 0.01 55 / 0.1);
  transform: scale(1.06);
}

/* 加载遮罩 */
.map-loading {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: oklch(96% 0.005 55);
  pointer-events: none;
}
.loading-inner { display: flex; align-items: center; gap: 7px; }
.loading-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: oklch(62% 0.13 25);
  animation: loadPulse 1.3s ease-in-out infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes loadPulse {
  0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
  40%            { transform: scale(1);   opacity: 1; }
}
.loading-text {
  font-size: 0.6875rem; color: oklch(52% 0.01 55);
  letter-spacing: 0.08em; font-weight: 500;
}

/* Ring overlay — z-index 10 */
.ring-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* Moving dot — z-index 50 */
.moving-dot {
  position: absolute;
  left: 0; top: 0;
  width: 18px; height: 18px;
  pointer-events: none;
  z-index: 50;
  display: none;
}
.moving-dot.visible { display: block; }
.dot-ring {
  position: absolute;
  left: 50%; top: 50%;
  width: 18px; height: 18px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid oklch(62% 0.13 25 / 0.35);
  animation: dotRing 1.6s ease-out infinite;
}
.dot-core {
  position: absolute;
  left: 50%; top: 50%;
  width: 7px; height: 7px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: oklch(62% 0.13 25);
}
@keyframes dotRing {
  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
}

/* ── 移动端降级 ────────────────────────────────────── */
@media (max-width: 767px) {
  .map-container {
    border-radius: 14px;
    min-height: 280px;
    max-height: 340px;
  }
  .map-container.is-fullscreen { height: 100vh; max-height: none; }
  #amap-container { min-height: 280px; }
}
</style>