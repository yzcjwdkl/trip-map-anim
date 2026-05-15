<template>
  <header class="detail-header" ref="headerRef">
    <!-- Z 第一横：左上（行程标识）→ 右上（核心操作） -->
    <div class="z-start">
      <button class="ctrl-icon-btn back-btn" @click="emit('back')" title="返回">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <div class="trip-identity">
        <span class="trip-label">行程</span>
        <span class="detail-trip-name">{{ tripName }}</span>
      </div>
    </div>
    <div class="z-end">
      <span class="count-badge">{{ pointCount }} 个地点</span>
      <div class="player-controls-mini" ref="controlsRef">
        <button class="ctrl-icon-btn" @click="emit('reset')" title="重置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button
          class="ctrl-icon-btn play"
          :class="{ active: isPlaying }"
          :disabled="!mapReady"
          @click="emit('toggle-play')"
          :title="isPlaying ? '暂停' : '播放'"
        >
          <svg v-if="!isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        <button class="ctrl-icon-btn" @click="emit('next-step')" title="下一步">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  tripName: { type: String, default: '' },
  pointCount: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  mapReady: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'toggle-play', 'next-step', 'reset'])

const headerRef = ref(null)
const controlsRef = ref(null)
let ctx = null

onMounted(() => {
  if (!headerRef.value) return
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ delay: 0.1 })

    // 左上角返回+身份标识 → 从左滑入+淡入
    tl.fromTo('.detail-header .z-start',
      { opacity: 0, x: -18 },
      { opacity: 1, x: 0, duration: 0.65, ease: 'back.out(1.4)' },
      0
    )

    // 右上角控制区 → 从右滑入+淡入，稍晚一点
    tl.fromTo('.detail-header .z-end',
      { opacity: 0, x: 18 },
      { opacity: 1, x: 0, duration: 0.65, ease: 'back.out(1.4)' },
      0.08
    )
  }, headerRef)
})

onUnmounted(() => {
  ctx?.revert()
})

// 暴露方法给父组件控制动画重入
function entrance() {
  if (!headerRef.value) return
  ctx?.revert()
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ delay: 0 })
    tl.fromTo('.detail-header .z-start',
      { opacity: 0, x: -18 },
      { opacity: 1, x: 0, duration: 0.65, ease: 'back.out(1.4)' },
      0
    )
    tl.fromTo('.detail-header .z-end',
      { opacity: 0, x: 18 },
      { opacity: 1, x: 0, duration: 0.65, ease: 'back.out(1.4)' },
      0.08
    )
  }, headerRef)
}

defineExpose({ entrance })
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px 12px;
  flex-shrink: 0;
  opacity: 1; /* GSAP will animate from opacity:0 */
}

.z-start {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
}

.z-end {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.trip-identity {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.2;
}

.trip-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(58% 0.12 25);
}

.detail-trip-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: oklch(22% 0.012 55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.count-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(58% 0.12 25);
  background: oklch(95% 0.02 25);
  padding: 5px 12px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.player-controls-mini {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctrl-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid oklch(88% 0.008 55);
  background: oklch(97% 0.005 55);
  color: oklch(40% 0.012 55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.ctrl-icon-btn:hover:not(:disabled) {
  background: oklch(62% 0.13 25);
  border-color: oklch(62% 0.13 25);
  color: oklch(99% 0 0);
}

.ctrl-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-icon-btn.play {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: oklch(62% 0.13 25);
  border-color: oklch(62% 0.13 25);
  color: oklch(99% 0 0);
}

.ctrl-icon-btn.play:hover:not(:disabled) {
  background: oklch(54% 0.14 25);
  transform: scale(1.05);
}

.ctrl-icon-btn.play.active {
  background: oklch(45% 0.1 55);
  border-color: oklch(45% 0.1 55);
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}
</style>