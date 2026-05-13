<template>
  <div class="trip-card-list">
    <!-- Header -->
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

    <!-- Gallery -->
    <div class="gallery" ref="galleryRef">

      <!-- Left hover zone: full height, 60px -->
      <div class="hover-zone left-zone" @mouseenter="prevHoverEnter" @mouseleave="prevHoverLeave"></div>

      <!-- Right hover zone: full height, 60px -->
      <div class="hover-zone right-zone" @mouseenter="nextHoverEnter" @mouseleave="nextHoverLeave"></div>

      <!-- Cards -->
      <ul class="cards" ref="cardsRef">
        <li
            v-for="(trip, index) in trips"
            :key="trip.id"
            class="trip-card"
            :data-index="index"
            @click="handleCardClick(trip.id)"
        >
          <div class="card-inner">
            <!-- Top: trip number + date row -->
            <div class="card-top">
              <span class="trip-num">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="trip-date">{{ getTripDate(trip) }}</span>
            </div>

            <!-- Middle: name + stats -->
            <div class="card-center">
              <h3 class="card-name">{{ trip.name }}</h3>
              <div class="card-meta">
                <div class="meta-stat">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{{ trip.points.length }} 地点</span>
                </div>
                <div v-if="trip.points.length > 1" class="meta-stat">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span>{{ trip.points.length - 1 }} 段</span>
                </div>
              </div>
              <p v-if="trip.points.length > 0" class="card-route">{{ getRouteSummary(trip) }}</p>
              <p v-else class="card-empty">点击添加第一个地点</p>
            </div>

            <!-- Bottom: accent bar -->
            <div class="card-bottom" :style="{ '--trip-accent': getTripAccent(index) }">
              <div class="accent-line"></div>
              <span class="view-label">查看行程</span>
            </div>
          </div>
        </li>
      </ul>

      <!-- Indicators -->
      <div class="indicators">
        <button
            v-for="(_, i) in trips"
            :key="i"
            class="indicator"
            :class="{ active: i === currentIndex }"
            @click="goTo(i)"
            :aria-label="`跳转到第 ${i + 1} 个行程`"
        >
          <span class="indicator-dot"></span>
        </button>
      </div>

      <div class="drag-proxy" ref="dragProxyRef"></div>
    </div>
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
let isCreating = false


const ACCENTS = [
  'oklch(62% 0.12 25)',   // warm amber
  'oklch(58% 0.14 155)',  // sage green
  'oklch(65% 0.12 235)',  // slate blue
  'oklch(60% 0.14 280)',  // dusty violet
  'oklch(55% 0.15 340)',  // rose
]
function getTripAccent(index) { return ACCENTS[index % ACCENTS.length] }

function getTripDate(trip) {
  const d = new Date(trip.id)
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}`
}
function handleCardClick(id) {
  if (isDragging) return
  enterDetail(id)
}

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
      scale:   i === clamped ? 1 : Math.max(0.72, 0.90 - dist * 0.07),
      opacity: Math.max(0.2, 1 - dist * 0.32),
      zIndex:  total - dist,
    }
    instant
        ? gsap.set(el, props)
        : gsap.to(el, { ...props, duration: 0.55, ease: 'power3.out', overwrite: 'auto' })
  })
}

function prev() { goTo(currentIndex.value - 1) }
function next() { goTo(currentIndex.value + 1) }

let nextHoverTimer = null
let prevHoverTimer = null
const HOVER_INTERVAL = 500

function nextHoverEnter() {
  clearInterval(nextHoverTimer)
  next()
  nextHoverTimer = setInterval(() => {
    if (currentIndex.value < trips.value.length - 1) next()
    else clearInterval(nextHoverTimer)
  }, HOVER_INTERVAL)
}
function nextHoverLeave() {
  clearInterval(nextHoverTimer)
  nextHoverTimer = null
}
function prevHoverEnter() {
  clearInterval(prevHoverTimer)
  prev()
  prevHoverTimer = setInterval(() => {
    if (currentIndex.value > 0) prev()
    else clearInterval(prevHoverTimer)
  }, HOVER_INTERVAL)
}
function prevHoverLeave() {
  clearInterval(prevHoverTimer)
  prevHoverTimer = null
}

async function handleCreateTrip() {
  isCreating = true
  createTrip()
  await nextTick()

  const total   = trips.value.length
  const newIdx  = total - 1
  const cardEls = cardsRef.value?.querySelectorAll('li')
  if (!cardEls?.length) { isCreating = false; return }

  cardEls.forEach((el, i) => {
    if (i === newIdx) {
      gsap.set(el, { x: cardW * 1.5, scale: 0.9, opacity: 0, zIndex: total })
    } else {
      const dist = Math.abs(i - newIdx)
      gsap.set(el, {
        x:       (i - newIdx) * cardW,
        scale:   Math.max(0.72, 0.90 - dist * 0.07),
        opacity: Math.max(0.2, 1 - dist * 0.32),
        zIndex:  total - dist,
      })
    }
  })

  currentIndex.value = newIdx
  gsap.to(cardEls[newIdx], { x: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' })
  if (total === 2 && !draggable) initDraggable()
  isCreating = false
}

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
          scale:   i === currentIndex.value ? 1 : Math.max(0.72, 0.90 - dist * 0.07),
          opacity: Math.max(0.2, 1 - dist * 0.32),
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

function initGSAP() {
  const cardEls = cardsRef.value?.querySelectorAll('li')
  if (!cardEls?.length) return

  cardW = cardEls[0].getBoundingClientRect().width + 32

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
  clearInterval(nextHoverTimer)
  clearInterval(prevHoverTimer)
  nextHoverTimer = null
  prevHoverTimer = null
  const onWheel = galleryRef.value?._onWheel
  if (onWheel) galleryRef.value?.removeEventListener('wheel', onWheel)
  gsap.killTweensOf(cardsRef.value?.querySelectorAll('li') ?? [])
  isDragging = false
}

onMounted(() => { nextTick(initGSAP) })
onUnmounted(() => { cleanupGSAP() })

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
  --tc-bg: oklch(98% 0.003 60);
  --tc-surface: oklch(100% 0 0);
  --tc-ink: oklch(22% 0.015 60);
  --tc-ink-muted: oklch(48% 0.018 60);
  --tc-ink-faint: oklch(62% 0.015 60);
  --tc-border: oklch(86% 0.008 60);
  --tc-accent: oklch(62% 0.12 25);
  --space-xs: 4px; --space-sm: 8px; --space-md: 12px;
  --space-lg: 16px; --space-xl: 24px; --space-2xl: 32px;

  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: var(--tc-bg);
}

/* ── Header ─────────────────────────────────────────────── */
.trips-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px var(--space-2xl); flex-shrink: 0; z-index: 10;
  border-bottom: 1px solid var(--tc-border);
}
.header-left { display: flex; align-items: baseline; gap: 10px; }
.header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.75rem; font-weight: 600; color: var(--tc-ink-muted);
  letter-spacing: 0.14em; margin: 0; text-transform: uppercase;
}
.header-count {
  font-size: 0.6875rem; font-weight: 500; color: var(--tc-ink-faint);
  background: oklch(93% 0.006 60); padding: 2px 8px; border-radius: 4px;
  border: 1px solid var(--tc-border);
}
.new-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 6px;
  border: 1px solid var(--tc-border); background: transparent;
  color: var(--tc-ink-muted); font-size: 0.75rem; font-weight: 500;
  cursor: pointer; transition: all 0.18s ease; letter-spacing: 0.02em;
}
.new-btn:hover {
  background: var(--tc-ink); border-color: var(--tc-ink);
  color: oklch(99% 0 0);
}
.new-btn:active { opacity: 0.85; }

/* ── Gallery ─────────────────────────────────────────────── */
.gallery {
  flex: 1; min-height: 0; position: relative;
  overflow: hidden; touch-action: none;
}
/* ── Hover Zones (60px, full height) ─────────────────────── */
.hover-zone {
  position: absolute; top: 0; bottom: 0;
  width: 60px; z-index: 30;
  cursor: default;
}
.left-zone  { left: 0; }
.right-zone { right: 0; }

/* ── Cards ───────────────────────────────────────────────── */
.cards {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 18rem; height: 26rem;
  list-style: none; margin: 0; padding: 0;
}

.trip-card {
  position: absolute; width: 18rem; height: 26rem;
  cursor: pointer;
  will-change: transform, opacity;
}

.card-inner {
  width: 100%; height: 100%;
  background: var(--tc-surface);
  border-radius: 14px;
  border: 1px solid var(--tc-border);
  overflow: hidden;
  display: flex; flex-direction: column;
  position: relative;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow:
    0 1px 2px oklch(30% 0.01 60 / 0.04),
    0 4px 12px oklch(30% 0.01 60 / 0.04),
    0 16px 32px oklch(30% 0.01 60 / 0.06);
}
.trip-card:hover .card-inner {
  border-color: oklch(80% 0.02 60);
  box-shadow:
    0 2px 4px oklch(30% 0.01 60 / 0.05),
    0 8px 24px oklch(30% 0.01 60 / 0.08),
    0 32px 64px oklch(30% 0.01 60 / 0.10);
}

/* Top row */
.card-top {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 22px 22px 0;
}
.trip-num {
  font-family: 'Noto Serif SC', serif;
  font-size: 3.25rem; font-weight: 800;
  color: var(--tc-border);
  line-height: 1; letter-spacing: -0.04em;
}
.trip-date {
  font-size: 0.6875rem; font-weight: 500;
  color: var(--tc-ink-faint); letter-spacing: 0.08em;
}

/* Center */
.card-center {
  flex: 1; padding: 10px 22px 0;
  display: flex; flex-direction: column; gap: 8px;
}
.card-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3125rem; font-weight: 700; color: var(--tc-ink);
  letter-spacing: 0.01em; line-height: 1.3; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.card-meta { display: flex; align-items: center; gap: 14px; }
.meta-stat {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.75rem; color: var(--tc-ink-muted); font-weight: 500;
}
.meta-stat svg { color: var(--tc-ink-faint); flex-shrink: 0; }

.card-route {
  font-size: 0.8rem; color: var(--tc-ink-faint);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0; line-height: 1.4;
}
.card-empty {
  font-size: 0.8rem; color: var(--tc-ink-faint); font-style: italic;
  margin: 0;
}

/* Bottom accent */
.card-bottom {
  padding: 0 22px 20px;
  display: flex; flex-direction: column; gap: 10px;
}
.accent-line {
  width: 100%; height: 2px;
  background: var(--trip-accent, var(--tc-accent));
  border-radius: 1px;
  transform-origin: left center;
  transform: scaleX(0.3);
  opacity: 0.6;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
.trip-card:hover .accent-line {
  transform: scaleX(1);
  opacity: 1;
}
.view-label {
  font-size: 0.6875rem; font-weight: 600;
  color: var(--tc-ink-faint); letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.trip-card:hover .view-label {
  opacity: 1; transform: translateY(0);
}

/* ── Indicators ──────────────────────────────────────────── */
.indicators {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 7px; z-index: 20;
}
.indicator {
  padding: 6px; border: none; background: none;
  cursor: pointer; border-radius: 50%;
}
.indicator-dot {
  display: block; width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--tc-border);
  transition: background 0.3s ease, transform 0.3s ease;
}
.indicator.active .indicator-dot {
  background: var(--tc-ink-muted);
  transform: scale(1.3);
}

/* ── Drag proxy ──────────────────────────────────────────── */
.drag-proxy { visibility: hidden; position: absolute; width: 1px; height: 1px; top: 0; left: 0; }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .trips-header { padding: var(--space-lg) var(--space-xl); }
  .cards, .trip-card { width: 15rem; height: 22rem; }
  .card-top { padding: 18px 18px 0; }
  .card-center { padding: 8px 18px 0; }
  .card-name { font-size: 1.125rem; }
  .card-bottom { padding: 0 18px 16px; }

}
</style>