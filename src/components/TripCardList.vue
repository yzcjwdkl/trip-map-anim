<template>
  <div class="trip-card-list">
    <div class="trips-header">
      <div class="header-left">
        <h2 class="header-title">行程</h2>
        <span class="header-count">{{ trips.length }}</span>
      </div>
      <el-button type="primary" size="small" class="new-btn" @click="createTrip()">
        + 新建
      </el-button>
    </div>

    <div class="trips-scroll" ref="scrollRef">
      <div class="trips-grid" ref="gridRef">
        <div
          v-for="(trip, index) in trips"
          :key="trip.id"
          class="trip-card"
          :class="{ active: trip.id === activeTripId, expanded: expandedTripIds.has(trip.id) }"
          :data-index="index"
          @click="enterDetail(trip.id)"
        >
          <div class="card-accent"></div>
          <span class="card-index">{{ String(index + 1).padStart(2, '0') }}</span>

          <div class="card-body">
            <div class="card-main">
              <h3 class="card-name">{{ trip.name }}</h3>
              <p class="card-meta">
                <span class="meta-dot"></span>
                {{ trip.points.length }} 个地点
                <span v-if="trip.points.length > 0" class="meta-separator">·</span>
                <span v-if="trip.points.length > 0" class="meta-route">{{ getRouteSummary(trip) }}</span>
              </p>
            </div>

            <div class="card-actions" @click.stop>
              <button class="action-icon-btn" @click.stop="toggleTripCard(trip.id)" :title="expandedTripIds.has(trip.id) ? '收起' : '展开'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron" :class="{ expanded: expandedTripIds.has(trip.id) }">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <button class="action-icon-btn" @click.stop="startRenameTrip(trip)" title="重命名">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="action-icon-btn danger" v-if="trips.length > 1" @click.stop="deleteTrip(trip.id)" title="删除">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="card-expand" v-show="expandedTripIds.has(trip.id)">
            <div class="expand-inner">
              <div v-if="trip.points.length === 0" class="expand-empty">暂无路线，进入行程添加地点</div>
              <div v-else class="route-flow">
                <div
                  v-for="(point, pi) in trip.points.slice(0, 6)"
                  :key="point.id"
                  class="flow-item"
                >
                  <span class="flow-emoji">{{ markerIcons[point.type] || '📍' }}</span>
                  <span class="flow-name">{{ point.name }}</span>
                  <span v-if="pi < trip.points.length - 1 && pi < 5" class="flow-arrow">→</span>
                </div>
                <span v-if="trip.points.length > 6" class="flow-more">+{{ trip.points.length - 6 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名弹窗 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名行程"
      width="360px"
      :close-on-click-modal="true"
    >
      <el-input
        v-model="renameInput"
        placeholder="行程名称"
        @keydown.enter="confirmRename"
        ref="renameInputEl"
      />
      <template #footer>
        <el-button @click="cancelRename">取消</el-button>
        <el-button type="primary" @click="confirmRename">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTripStore } from '../composables/useTripStore.js'
import { markerIcons } from '../data/sampleTrip.js'
import gsap from 'gsap'

const { trips, activeTripId, expandedTripIds, createTrip, deleteTrip, toggleTripCard, getRouteSummary, enterDetail } = useTripStore()

const scrollRef = ref(null)
const gridRef = ref(null)
let expandAnimMap = new Map()
let cardAnims = []

// 重命名行程
const renameDialogVisible = ref(false)
const renamingTrip = ref(null)
const renameInput = ref('')
const renameInputEl = ref(null)

function startRenameTrip(trip) {
  renamingTrip.value = trip
  renameInput.value = trip.name
  renameDialogVisible.value = true
}

function confirmRename() {
  if (renamingTrip.value && renameInput.value.trim()) {
    renamingTrip.value.name = renameInput.value.trim()
  }
  renameDialogVisible.value = false
  renamingTrip.value = null
  renameInput.value = ''
}

function cancelRename() {
  renameDialogVisible.value = false
  renamingTrip.value = null
  renameInput.value = ''
}

// ===== GSAP 动画 =====

// 卡片进入 stagger 动画
function animateCardsEntrance() {
  if (!gridRef.value) return
  const cards = gridRef.value.querySelectorAll('.trip-card')
  gsap.fromTo(cards,
    { y: 40, opacity: 0, scale: 0.96 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform,opacity'
    }
  )
}

// hover 动效已移除，待后续设计

// 展开/收起动画
watch(expandedTripIds, async () => {
  await nextTick()
  if (!gridRef.value) return
  const cards = gridRef.value.querySelectorAll('.trip-card')
  cards.forEach(card => {
    const tripId = Number(card.getAttribute('data-trip-id') || trips.value[card.getAttribute('data-index')]?.id)
    const expandEl = card.querySelector('.card-expand')
    if (!expandEl) return

    const isExpanded = expandedTripIds.value.has(tripId)
    const existing = expandAnimMap.get(tripId)
    if (existing) existing.kill()

    if (isExpanded) {
      gsap.set(expandEl, { display: 'block', height: 'auto', opacity: 1 })
      const h = expandEl.offsetHeight
      gsap.fromTo(expandEl,
        { height: 0, opacity: 0, overflow: 'hidden' },
        { height: h, opacity: 1, duration: 0.35, ease: 'power2.out',
          onComplete: () => { gsap.set(expandEl, { height: 'auto', overflow: 'visible' }) }
        }
      )
      const flowItems = expandEl.querySelectorAll('.flow-item, .flow-more, .expand-empty')
      gsap.fromTo(flowItems,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, delay: 0.1, ease: 'power2.out' }
      )
    } else {
      const h = expandEl.offsetHeight
      gsap.fromTo(expandEl,
        { height: h, opacity: 1, overflow: 'hidden' },
        { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in',
          onComplete: () => { gsap.set(expandEl, { display: 'none' }) }
        }
      )
    }
  })
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    animateCardsEntrance()
  })
})

onUnmounted(() => {
  expandAnimMap.forEach(anim => anim && anim.kill())
  gsap.killTweensOf('.trip-card')
})
</script>

<style scoped>
.trip-card-list {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 32px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== Header (Fixed) ===== */
.trips-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 0 24px;
  flex-shrink: 0;
  background: #f8fafc;
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin: 0;
}

.header-count {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 20px;
}

.new-btn {
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ===== Scroll Area ===== */
.trips-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  padding-bottom: 24px;
}

/* ===== Grid Layout ===== */
.trips-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  align-content: start;
  align-items: start;
}

@media (min-width: 1024px) {
  .trips-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (max-width: 640px) {
  .trips-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* ===== Trip Card ===== */
.trip-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.trip-card.active {
  border-color: rgba(99, 102, 241, 0.35);
  background: linear-gradient(135deg, rgba(99,102,241,0.03) 0%, rgba(255,255,255,1) 60%);
}

/* 底部渐变条 */
.trip-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.trip-card:hover::after,
.trip-card.active::after {
  transform: scaleX(1);
}

.trip-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

/* 装饰色块 */
.card-accent {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0.1;
  will-change: transform, opacity;
}

/* 序号装饰 */
.card-index {
  position: absolute;
  bottom: 10px;
  right: 16px;
  font-size: 48px;
  font-weight: 800;
  color: rgba(99, 102, 241, 0.06);
  line-height: 1;
  letter-spacing: -0.04em;
  pointer-events: none;
  user-select: none;
  will-change: color;
}

/* Card Body */
.card-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.card-main {
  flex: 1;
  min-width: 0;
  padding-right: 40px;
}

.card-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  margin: 0;
  flex-wrap: wrap;
}

.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
}

.meta-separator {
  color: #cbd5e1;
}

.meta-route {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Actions */
.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0.35;
  transition: opacity 0.25s ease;
}

.trip-card:hover .card-actions {
  opacity: 1;
}

.action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-icon-btn:hover {
  background: #f1f5f9;
  color: #6366f1;
}

.action-icon-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.chevron {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chevron.expanded {
  transform: rotate(180deg);
}

/* Expand Section */
.card-expand {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
  display: none;
  overflow: hidden;
}

.expand-inner {
  padding: 4px 0;
}

.expand-empty {
  font-size: 13px;
  color: #94a3b8;
  font-style: italic;
}

.route-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 6px;
}

.flow-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.flow-emoji {
  font-size: 14px;
}

.flow-name {
  white-space: nowrap;
}

.flow-arrow {
  color: #cbd5e1;
  font-weight: 400;
  margin: 0 2px;
}

.flow-more {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  padding: 3px 10px;
  border-radius: 12px;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .trip-card-list {
    padding: 0 20px 20px;
  }

  .trips-header {
    padding: 24px 0 16px;
  }

  .header-title {
    font-size: 26px;
  }

  .trip-card {
    padding: 20px;
  }

  .card-name {
    font-size: 18px;
  }

  .card-index {
    font-size: 36px;
    bottom: 6px;
    right: 12px;
  }

  .meta-route {
    max-width: 120px;
  }

  .card-actions {
    opacity: 1;
  }
}
</style>
