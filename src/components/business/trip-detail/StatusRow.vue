<template>
  <!-- Z 型第二横：左下（进度状态）→ 右下（点位流向） -->
  <div class="status-row" ref="rowRef">
    <!-- 左下：进度状态 -->
    <div class="status-block" ref="statusBlockRef">
      <div class="progress-ring-wrap" ref="ringWrapRef">
        <svg class="ring-svg" viewBox="0 0 44 44" fill="none">
          <!-- 底环 -->
          <circle
            class="ring-bg"
            cx="22" cy="22" r="18"
            stroke="oklch(88% 0.006 55)"
            stroke-width="3.5"
          />
          <!-- 进度环 -->
          <circle
            class="ring-progress"
            cx="22" cy="22" r="18"
            stroke="oklch(58% 0.14 25)"
            stroke-width="3.5"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 22 22)"
            ref="ringRef"
          />
        </svg>
        <!-- 环内文字 -->
        <div class="ring-inner">
          <span class="ring-fraction">{{ currentIndex + 1 }}<span class="ring-divider">/</span>{{ total }}</span>
        </div>
      </div>
      <div class="status-text">
        <span class="status-primary">已游览</span>
        <span class="status-sub">{{ progressLabel }}</span>
      </div>
    </div>

    <!-- 中间：点位流向 -->
    <div class="flow-block" ref="flowBlockRef">
      <span v-if="prevPoint" class="nav-chip prev">{{ prevPoint.name }}</span>
      <span v-else class="nav-chip origin">起点</span>

      <div class="flow-arrow">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
          <line x1="0" y1="5" x2="16" y2="5" stroke="oklch(58% 0.14 25)" stroke-width="1.5" stroke-linecap="round"/>
          <polyline points="13,2 17,5 13,8" stroke="oklch(58% 0.14 25)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>

      <span v-if="currentPoint" class="nav-chip current">{{ currentPoint.name }}</span>
      <span v-else class="nav-chip placeholder">—</span>

      <div class="flow-arrow">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
          <line x1="0" y1="5" x2="16" y2="5" stroke="oklch(58% 0.14 25)" stroke-width="1.5" stroke-linecap="round"/>
          <polyline points="13,2 17,5 13,8" stroke="oklch(58% 0.14 25)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>

      <span v-if="nextPoint" class="nav-chip next">{{ nextPoint.name }}</span>
      <span v-else class="nav-chip terminus">终点</span>
    </div>

    <!-- 右下：百分比 -->
    <div class="percent-block" ref="percentBlockRef">
      <span class="percent-value" :style="{ '--pct': Math.round(progressPercent) + '%' }">
        {{ Math.round(progressPercent) }}%
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  currentPoint: { type: Object, default: null },
  prevPoint: { type: Object, default: null },
  nextPoint: { type: Object, default: null },
  currentIndex: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
})

const rowRef = ref(null)
const statusBlockRef = ref(null)
const flowBlockRef = ref(null)
const percentBlockRef = ref(null)
const ringRef = ref(null)

let ctx = null

// 环形进度
const circumference = 2 * Math.PI * 18 // r=18
const dashOffset = computed(() => {
  const pct = props.progressPercent / 100
  return circumference * (1 - pct)
})

// 进度文案
const progressLabel = computed(() => {
  const remaining = Math.max(0, props.total - props.currentIndex - 1)
  if (remaining === 0) return '全部完成！'
  if (remaining === 1) return '最后 1 处'
  return `剩余 ${remaining} 处`
})

onMounted(() => {
  if (!rowRef.value) return
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ delay: 0.15 })

    // 左侧进度环形：从上方滑入
    tl.fromTo(statusBlockRef.value,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.3)' },
      0
    )

    // 中间流向标签：从下往上错开
    tl.fromTo(flowBlockRef.value,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
      0.06
    )

    // 右侧百分比：从右滑入
    tl.fromTo(percentBlockRef.value,
      { opacity: 0, x: 12 },
      { opacity: 1, x: 0, duration: 0.55, ease: 'back.out(1.4)' },
      0.04
    )

    // 环形进度填充动画
    if (ringRef.value) {
      const ring = ringRef.value
      gsap.fromTo(ring,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: dashOffset.value,
          duration: 1.2,
          ease: 'power2.out',
          delay: 0.35,
        }
      )
    }
  }, rowRef)
})

onUnmounted(() => {
  ctx?.revert()
})

// 监听进度变化 → 动画更新环形
watch(() => props.progressPercent, (newPct, oldPct) => {
  if (newPct === oldPct || !ringRef.value) return
  gsap.to(ringRef.value, {
    strokeDashoffset: dashOffset.value,
    duration: 0.6,
    ease: 'power2.inOut',
  })

  // 数字跳动效果
  const pctEl = rowRef.value?.querySelector('.percent-value')
  if (pctEl) {
    gsap.fromTo(pctEl,
      { scale: 1.15, color: 'oklch(58% 0.14 25)' },
      { scale: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.5)' }
    )
  }
})
</script>

<style scoped>
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 20px 10px;
  flex-shrink: 0;
}

/* ── 左：环形进度 ── */
.status-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  opacity: 1; /* GSAP animates from 0 */
}

.progress-ring-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.ring-svg {
  width: 44px;
  height: 44px;
}

.ring-progress {
  transition: stroke-dashoffset 0.6s ease;
  transform-origin: center;
}

.ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-fraction {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.625rem;
  font-weight: 700;
  color: oklch(22% 0.012 55);
  line-height: 1;
}

.ring-divider {
  color: oklch(78% 0.006 55);
  font-weight: 400;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.status-primary {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(22% 0.012 55);
  letter-spacing: 0.02em;
}

.status-sub {
  font-size: 0.625rem;
  color: oklch(55% 0.008 55);
  letter-spacing: 0.03em;
}

/* ── 中：流向 ── */
.flow-block {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  opacity: 1;
}

.nav-chip {
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  flex-shrink: 0;
  display: inline-block;
}

.nav-chip.prev {
  background: oklch(92% 0.005 55);
  color: oklch(50% 0.01 55);
}

.nav-chip.current {
  background: oklch(55% 0.15 25 / 0.1);
  color: oklch(52% 0.14 25);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px oklch(55% 0.15 25 / 0.18);
  transform: scale(1.06);
}

.nav-chip.next {
  background: oklch(92% 0.005 55);
  color: oklch(50% 0.01 55);
}

.nav-chip.origin,
.nav-chip.terminus {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(65% 0.008 55);
  background: transparent;
  padding: 4px 6px;
}

.nav-chip.placeholder {
  color: oklch(78% 0.006 55);
  background: transparent;
  padding: 4px 6px;
}

.flow-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.7;
}

/* ── 右：百分比 ── */
.percent-block {
  flex-shrink: 0;
  opacity: 1;
}

.percent-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: oklch(58% 0.12 25);
  min-width: 40px;
  text-align: right;
  display: block;
  letter-spacing: -0.02em;
}
</style>