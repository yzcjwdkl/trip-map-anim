<template>
  <div class="trip-card-list">
    <div class="trips-header">
      <div class="header-left">
        <h2 class="header-title">行程</h2>
        <span class="header-count">{{ trips.length }}</span>
      </div>
      <button class="new-btn" @click="handleCreateTrip">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        新建行程
      </button>
    </div>

    <div class="gallery" ref="galleryRef">
      <ul class="cards" ref="cardsRef">
        <li
            v-for="(trip, index) in trips"
            :key="trip.id"
            class="trip-card"
            :data-index="index"
            @click="handleCardClick(trip.id)"
        >
          <div class="card-inner">
            <div class="card-header-band" :style="{ '--trip-hue': getTripHue(index) }">
              <div class="band-texture"></div>
              <span class="card-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="band-meta">
                <span class="band-label">TRIP</span>
                <span class="band-date">{{ getTripDate(trip) }}</span>
              </div>
            </div>

            <div class="perforation">
              <div class="perforation-hole left"></div>
              <div class="perforation-line">
                <span v-for="n in 24" :key="n" class="dash"></span>
              </div>
              <div class="perforation-hole right"></div>
            </div>

            <div class="card-body">
              <div class="card-main">
                <h3 class="card-name">{{ trip.name }}</h3>
                <div class="card-stats">
                  <div class="stat">
                    <span class="stat-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ trip.points.length }}</span>
                    <span class="stat-label">地点</span>
                  </div>
                  <div class="stat-divider"></div>
                  <div v-if="trip.points.length > 1" class="stat">
                    <span class="stat-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v20M2 12h20"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ trip.points.length - 1 }}</span>
                    <span class="stat-label">段行程</span>
                  </div>
                </div>
                <p v-if="trip.points.length > 0" class="card-route">
                  <span class="route-label">路线</span>
                  <span class="route-text">{{ getRouteSummary(trip) }}</span>
                </p>
                <div v-else class="card-empty">
                  <span>点击添加第一个地点</span>
                </div>
              </div>
            </div>

            <div class="notch top-left"></div>
            <div class="notch top-right"></div>
            <div class="notch bottom-left"></div>
            <div class="notch bottom-right"></div>
          </div>
        </li>
      </ul>

      <div class="indicators">
        <button
            v-for="(_, i) in trips"
            :key="i"
            class="indicator"
            :class="{ active: i === currentIndex }"
            @click="goTo(i)"
            :aria-label="`跳转到第 ${i + 1} 个行程`"
        >
          <span class="indicator-track"></span>
          <span class="indicator-fill"></span>
        </button>
      </div>

      <div class="actions">
        <button class="action-btn prev-btn" @click="prev" :disabled="currentIndex === 0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button class="action-btn next-btn" @click="next" :disabled="currentIndex === trips.length - 1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="drag-proxy" ref="dragProxyRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { useTripStore } from '../composables/useTripStore.js'

gsap.registerPlugin(Draggable)

const { trips, createTrip, getRouteSummary, enterDetail } = useTripStore()

const galleryRef   = ref(null)
const cardsRef     = ref(null)
const dragProxyRef = ref(null)
const currentIndex = ref(0)

let cardW      = 0
let draggable  = null
let isDragging = false
let isCreating = false   // 区分"新建"和其他数量变化

const TRIP_HUES = [25, 45, 160, 200, 280, 340]
function getTripHue(index) { return TRIP_HUES[index % TRIP_HUES.length] }
function getTripDate(trip) {
  const d = new Date(trip.id)
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}`
}
function handleCardClick(id) {
  if (isDragging) return
  enterDetail(id)
}

// ── 核心：所有卡片移动到 index 位置 ──────────────────────
function goTo(index, instant = false) {
  const total = trips.value.length
  if (total === 0) return
  const clamped = Math.max(0, Math.min(total - 1, index))
  currentIndex.value = clamped

  const cardEls = cardsRef.value?.querySelectorAll('li')
  if (!cardEls?.length) return

  cardEls.forEach((el, i) => {
    const dist  = Math.abs(i - clamped)
    const props = {
      x:       (i - clamped) * cardW,
      scale:   i === clamped ? 1 : Math.max(0.7, 0.88 - dist * 0.06),
      opacity: Math.max(0.25, 1 - dist * 0.3),
      zIndex:  total - dist,
    }
    instant
        ? gsap.set(el, props)
        : gsap.to(el, { ...props, duration: 0.55, ease: 'power3.out', overwrite: 'auto' })
  })
}

function prev() { goTo(currentIndex.value - 1) }
function next() { goTo(currentIndex.value + 1) }

// ── 新建行程：绕过 watch 重建，自己做动画 ────────────────
async function handleCreateTrip() {
  isCreating = true
  createTrip()           // push 新行程到 trips

  await nextTick()       // 等 Vue 渲染新 <li>

  const total   = trips.value.length
  const newIdx  = total - 1
  const cardEls = cardsRef.value?.querySelectorAll('li')
  if (!cardEls?.length) { isCreating = false; return }

  // 旧卡瞬间移到"以 newIdx 为中心"的位置（无动画，不闪）
  cardEls.forEach((el, i) => {
    if (i === newIdx) {
      // 新卡先藏在右侧
      gsap.set(el, { x: cardW * 1.5, scale: 0.9, opacity: 0, zIndex: total })
    } else {
      const dist = Math.abs(i - newIdx)
      gsap.set(el, {
        x:       (i - newIdx) * cardW,
        scale:   Math.max(0.7, 0.88 - dist * 0.06),
        opacity: Math.max(0.25, 1 - dist * 0.3),
        zIndex:  total - dist,
      })
    }
  })

  currentIndex.value = newIdx

  // 新卡飞入
  gsap.to(cardEls[newIdx], {
    x: 0, scale: 1, opacity: 1,
    duration: 0.45, ease: 'power3.out',
  })

  // 首次出现第二张卡时补初始化 Draggable
  if (total === 2 && !draggable) initDraggable()

  isCreating = false
}

// ── Draggable（可独立初始化）────────────────────────────
function initDraggable() {
  if (draggable || !dragProxyRef.value || !galleryRef.value) return
  draggable = Draggable.create(dragProxyRef.value, {
    type: 'x',
    trigger: galleryRef.value,
    minimumMovement: 6,
    onPress()   { isDragging = false },
    onDrag() {
      isDragging = true
      const delta   = this.x - this.startX
      const cardEls = cardsRef.value?.querySelectorAll('li')
      if (!cardEls) return
      cardEls.forEach((el, i) => {
        const dist = Math.abs(i - currentIndex.value)
        gsap.set(el, {
          x:       (i - currentIndex.value) * cardW + delta,
          scale:   i === currentIndex.value ? 1 : Math.max(0.7, 0.88 - dist * 0.06),
          opacity: Math.max(0.25, 1 - dist * 0.3),
        })
      })
    },
    onDragEnd() {
      const delta = this.endX - this.startX
      if      (delta < -cardW * 0.25) goTo(currentIndex.value + 1)
      else if (delta >  cardW * 0.25) goTo(currentIndex.value - 1)
      else                            goTo(currentIndex.value)
      gsap.set(dragProxyRef.value, { x: 0 })
      setTimeout(() => { isDragging = false }, 50)
    },
  })[0]
}

// ── 完整初始化（首次 mount 或删除行程后）──────────────────
function initGSAP() {
  const cardEls = cardsRef.value?.querySelectorAll('li')
  if (!cardEls?.length) return

  cardW = cardEls[0].getBoundingClientRect().width + 32   // 32px gap

  currentIndex.value = Math.min(currentIndex.value, trips.value.length - 1)
  goTo(currentIndex.value, true)

  gsap.fromTo(
      '.trip-card-list',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
  )

  if (trips.value.length > 1) initDraggable()

  const onWheel = (e) => {
    if (!galleryRef.value?.contains(e.target)) return
    e.preventDefault()
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (d > 30) next(); else if (d < -30) prev()
  }
  galleryRef.value.addEventListener('wheel', onWheel, { passive: false })
  galleryRef.value._onWheel = onWheel
}

function cleanupGSAP() {
  draggable?.kill()
  draggable = null
  const onWheel = galleryRef.value?._onWheel
  if (onWheel) galleryRef.value?.removeEventListener('wheel', onWheel)
  gsap.killTweensOf(cardsRef.value?.querySelectorAll('li') ?? [])
  isDragging = false
}

onMounted(() => { nextTick(initGSAP) })
onUnmounted(() => { cleanupGSAP() })

// watch 只处理删除等非新建的数量变化
watch(
    () => trips.value.length,
    () => {
      if (isCreating) return
      nextTick(() => { cleanupGSAP(); initGSAP() })
    }
)
</script>

<style scoped>
.trip-card-list {
  --tc-bg: oklch(98% 0.004 290);
  --tc-surface: oklch(100% 0 0);
  --tc-ink: oklch(25% 0.02 290);
  --tc-ink-muted: oklch(50% 0.025 290);
  --tc-ink-faint: oklch(65% 0.02 290);
  --tc-border: oklch(88% 0.015 290);
  --tc-accent: oklch(55% 0.15 290);
  --space-xs: 4px; --space-sm: 8px; --space-md: 12px;
  --space-lg: 16px; --space-xl: 24px; --space-2xl: 32px;

  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  opacity: 1;
  background: var(--tc-bg);
}

.trips-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; flex-shrink: 0; z-index: 10;
  border-bottom: 1px solid oklch(90% 0.01 80);
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.8125rem; font-weight: 600; color: var(--tc-ink-muted);
  letter-spacing: 0.12em; margin: 0; text-transform: uppercase;
}
.header-count {
  font-size: 0.6875rem; font-weight: 500; color: var(--tc-ink-faint);
  background: oklch(93% 0.008 80); padding: 2px 8px; border-radius: 4px;
  border: 1px solid oklch(88% 0.01 80);
}
.new-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 6px;
  border: 1px solid oklch(82% 0.04 290);
  background: transparent; color: var(--tc-ink-muted);
  font-size: 0.75rem; font-weight: 500; cursor: pointer;
  transition: all 0.18s ease; letter-spacing: 0.03em;
}
.new-btn:hover { background: oklch(55% 0.15 290); border-color: oklch(55% 0.15 290); color: oklch(99% 0.01 290); }
.new-btn:active { background: oklch(48% 0.15 290); border-color: oklch(48% 0.15 290); color: oklch(99% 0.01 290); }

.gallery {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  touch-action: none;
}

.cards {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 17rem; height: 26rem;
  list-style: none; margin: 0; padding: 0;
}

.trip-card {
  position: absolute; width: 17rem; height: 26rem;
  border-radius: 1rem; overflow: hidden; cursor: pointer;
  will-change: transform, opacity; transform-origin: center center;
}

.card-inner {
  width: 100%; height: 100%; background: var(--tc-surface);
  border-radius: 1rem; overflow: hidden; position: relative;
  display: flex; flex-direction: column; transition: box-shadow 0.35s ease;
  box-shadow: 0 1px 2px oklch(20% 0.01 290 / 0.04), 0 4px 8px oklch(20% 0.01 290 / 0.04), 0 12px 24px oklch(20% 0.01 290 / 0.06);
}
.trip-card:hover .card-inner {
  box-shadow: 0 1px 2px oklch(20% 0.01 290 / 0.04), 0 8px 16px oklch(20% 0.01 290 / 0.06), 0 24px 48px oklch(20% 0.01 290 / 0.1);
}

.card-header-band {
  --band-color: oklch(62% 0.11 var(--trip-hue, 290));
  position: relative; height: 42%; background: var(--band-color);
  display: flex; flex-direction: column; justify-content: space-between;
  padding: var(--space-xl); overflow: hidden;
}
.band-texture {
  position: absolute; inset: 0; opacity: 0.06; pointer-events: none;
  background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, oklch(100% 0 0) 2px, oklch(100% 0 0) 4px);
}
.card-index {
  font-size: 3.5rem; font-weight: 800; color: oklch(100% 0 0 / 0.25);
  line-height: 1; letter-spacing: -0.04em; user-select: none; pointer-events: none; position: relative; z-index: 1;
}
.band-meta { display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; }
.band-label { font-size: 0.625rem; font-weight: 700; color: oklch(100% 0 0 / 0.7); letter-spacing: 0.15em; }
.band-date  { font-size: 0.75rem; font-weight: 500; color: oklch(100% 0 0 / 0.85); }

.perforation { position: relative; height: 14px; flex-shrink: 0; background: var(--tc-surface); }
.perforation-hole {
  position: absolute; top: 50%; width: 14px; height: 14px;
  background: var(--tc-bg); border-radius: 50%; transform: translateY(-50%); z-index: 2;
}
.perforation-hole.left  { left: -7px; }
.perforation-hole.right { right: -7px; }
.perforation-line {
  position: absolute; top: 50%; left: 10px; right: 10px;
  transform: translateY(-50%); display: flex; justify-content: space-between; align-items: center;
}
.dash { width: 4px; height: 1.5px; background: var(--tc-border); border-radius: 1px; }

.card-body {
  flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 var(--space-xl) var(--space-xl); background: var(--tc-surface);
}
.card-main { position: relative; z-index: 1; }
.card-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.375rem; font-weight: 700; color: var(--tc-ink);
  letter-spacing: 0.03em; line-height: 1.35; margin: 0 0 var(--space-md) 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.card-stats { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md); }
.stat { display: flex; align-items: center; gap: var(--space-xs); }
.stat-icon { display: flex; align-items: center; color: var(--tc-ink-faint); }
.stat-value { font-size: 0.9375rem; font-weight: 700; color: var(--tc-ink); }
.stat-label { font-size: 0.75rem; font-weight: 500; color: var(--tc-ink-faint); }
.stat-divider { width: 1px; height: 14px; background: var(--tc-border); }

.card-route { display: flex; align-items: baseline; gap: var(--space-sm); margin: 0; }
.route-label { font-size: 0.625rem; font-weight: 600; color: var(--tc-ink-faint); letter-spacing: 0.1em; text-transform: uppercase; flex-shrink: 0; }
.route-text  { font-size: 0.8125rem; color: var(--tc-ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-empty span { font-size: 0.8125rem; color: var(--tc-ink-faint); font-style: italic; }

.notch { position: absolute; width: 10px; height: 10px; background: var(--tc-bg); border-radius: 50%; z-index: 3; }
.notch.top-left     { top: -5px;    left: -5px;  }
.notch.top-right    { top: -5px;    right: -5px; }
.notch.bottom-left  { bottom: -5px; left: -5px;  }
.notch.bottom-right { bottom: -5px; right: -5px; }

.indicators {
  position: absolute; bottom: 84px; left: 50%; transform: translateX(-50%);
  display: flex; gap: var(--space-sm); z-index: 20;
}
.indicator {
  position: relative; width: 28px; height: 4px; padding: 0;
  border: none; background: none; cursor: pointer; border-radius: 2px; overflow: hidden;
}
.indicator-track { position: absolute; inset: 0; background: oklch(85% 0.015 80); border-radius: 2px; }
.indicator-fill {
  position: absolute; inset: 0; background: var(--tc-accent); border-radius: 2px;
  transform: scaleX(0); transform-origin: left center;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.indicator.active .indicator-fill { transform: scaleX(1); }

.actions {
  position: absolute; bottom: var(--space-xl); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: var(--space-md); z-index: 20;
}
.action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid var(--tc-border); background: var(--tc-surface);
  color: var(--tc-ink-muted); cursor: pointer; transition: all 0.25s ease;
  box-shadow: 0 1px 3px oklch(20% 0.01 290 / 0.04);
}
.action-btn:hover:not(:disabled) {
  border-color: oklch(75% 0.06 290); color: var(--tc-accent);
  box-shadow: 0 4px 12px oklch(20% 0.01 290 / 0.08); transform: translateY(-1px);
}
.action-btn:active:not(:disabled) { transform: translateY(0) scale(0.95); }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.drag-proxy { visibility: hidden; position: absolute; width: 1px; height: 1px; top: 0; left: 0; }

@media (max-width: 768px) {
  .trips-header { padding: var(--space-xl) var(--space-lg) var(--space-md); }
  .cards, .trip-card { width: 14rem; height: 22rem; }
  .card-header-band { padding: var(--space-lg); }
  .card-index { font-size: 3rem; }
  .card-body  { padding: 0 var(--space-lg) var(--space-lg); }
  .card-name  { font-size: 1.125rem; }
  .action-btn { width: 40px; height: 40px; }
}
</style>