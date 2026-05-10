<template>
  <svg
      ref="svgRef"
      class="transition-wave"
      :class="`phase-${phase}`"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
  >
    <defs>
      <!-- 下层渐变：浅紫 → 紫罗兰 -->
      <linearGradient id="wv-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="oklch(72% 0.1 290)" />
        <stop offset="100%" stop-color="oklch(52% 0.15 290)" />
      </linearGradient>
      <!-- 上层渐变：薰衣草 → 深紫 -->
      <linearGradient id="wv-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="oklch(78% 0.09 290)" />
        <stop offset="100%" stop-color="oklch(60% 0.12 290)" />
      </linearGradient>
    </defs>

    <path ref="path1Ref" class="wave-path" fill="url(#wv-grad-1)" />
    <path ref="path2Ref" class="wave-path" fill="url(#wv-grad-2)" />
  </svg>
</template>

<script setup>
import { ref, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  phase: { type: String, default: 'idle' }
})

const emit = defineEmits(['canHideList'])

const svgRef   = ref(null)
const path1Ref = ref(null)
const path2Ref = ref(null)

const NUM_PATHS        = 2
const NUM_POINTS       = 10
const DURATION         = 0.9
const DELAY_PER_PATH   = 0.25
const DELAY_POINTS_MAX = 0.3

let allPoints = []

function initPoints () {
  allPoints = []
  for (let i = 0; i < NUM_PATHS; i++) {
    const points = []
    for (let j = 0; j < NUM_POINTS; j++) points.push(100)
    allPoints.push(points)
  }
}

function renderPath (pathEl, points, isOpened) {
  let d = ''
  if (isOpened) {
    d += `M 0 0 V ${points[0]} C`
  } else {
    d += `M 0 ${points[0]} C`
  }

  for (let j = 0; j < NUM_POINTS - 1; j++) {
    const p  = ((j + 1) / (NUM_POINTS - 1)) * 100
    const cp = p - ((1 / (NUM_POINTS - 1)) * 100) / 2
    d += ` ${cp} ${points[j]} ${cp} ${points[j + 1]} ${p} ${points[j + 1]}`
  }

  d += isOpened ? ` V 100 H 0` : ` V 0 H 0`
  pathEl.setAttribute('d', d)
}

function renderAll (isOpened) {
  renderPath(path1Ref.value, allPoints[0], isOpened)
  renderPath(path2Ref.value, allPoints[1], isOpened)
}

function initPaths () {
  initPoints()
  renderAll(false)
}

/* ─── 进入动画（不变） ─── */
function runEnter () {
  const tl = gsap.timeline({
    onUpdate: () => renderAll(true),
    defaults: { ease: 'power2.inOut', duration: DURATION }
  })

  const pointsDelay = []
  for (let i = 0; i < NUM_POINTS; i++) {
    pointsDelay[i] = Math.random() * DELAY_POINTS_MAX
  }

  for (let i = 0; i < NUM_PATHS; i++) {
    const points    = allPoints[i]
    const pathDelay = DELAY_PER_PATH * i
    for (let j = 0; j < NUM_POINTS; j++) {
      tl.to(points, { [j]: 0 }, pointsDelay[j] + pathDelay)
    }
  }
}

/* ─── 退出动画（按 HTML 效果改写） ─── */
function runExit (onComplete) {
  // 先重置为 100，并用 isOpened=false 的格式渲染，
  // 这样首帧仍是全屏覆盖，与 cover 状态无缝衔接
  for (let i = 0; i < NUM_PATHS; i++) allPoints[i].fill(100)
  renderAll(false)

  const tl = gsap.timeline({
    onUpdate: () => renderAll(false),
    defaults: { ease: 'power2.inOut', duration: DURATION },
    onComplete
  })

  const pointsDelay = []
  for (let i = 0; i < NUM_POINTS; i++) {
    pointsDelay[i] = Math.random() * DELAY_POINTS_MAX
  }

  for (let i = 0; i < NUM_PATHS; i++) {
    const points    = allPoints[i]
    // 退出时从内层到外层依次触发（与进入相反）
    const pathDelay = DELAY_PER_PATH * (NUM_PATHS - i - 1)

    for (let j = 0; j < NUM_POINTS; j++) {
      const delay = pointsDelay[j] + pathDelay
      // 从 100 → 0，波浪向顶部收起，露出背景
      tl.to(points, { [j]: 0 }, delay)
    }
  }
}

watch(() => props.phase, (next) => {
  if (next === 'entering') {
    initPoints()
    renderAll(false)
    gsap.set(svgRef.value, { opacity: 1 })
    runEnter()
  } else if (next === 'exiting') {
    runExit(() => {
      gsap.set(svgRef.value, { opacity: 0 })
      emit('canHideList')
    })
  } else if (next === 'cover') {
    initPoints()
    allPoints[0].fill(0)
    allPoints[1].fill(0)
    renderAll(true)
    gsap.set(svgRef.value, { opacity: 1 })
  } else if (next === 'idle') {
    gsap.set(svgRef.value, { opacity: 0 })
    initPaths()
  }
})
</script>

<style scoped>
.transition-wave {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.phase-idle     { z-index: 1;    opacity: 0; }
.phase-entering { z-index: 9999; opacity: 1; }
.phase-cover    { z-index: 1;    opacity: 1; pointer-events: none; }
.phase-exiting  { z-index: 9999; opacity: 1; }

.wave-path {
  stroke-width: 0.3px;
}
</style>