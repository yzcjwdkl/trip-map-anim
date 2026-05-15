<template>
  <div class="trip-detail" :class="{ 'is-fullscreen': fullscreen }">
    <!-- 顶部信息栏 —— Z 型视觉模式布局 -->
    <div class="top-info-bar" v-show="!fullscreen">
      <!-- Z 第一横：左上（行程标识）→ 右上（核心操作） -->
      <div class="z-row z-row-top">
        <div class="z-start">
          <button class="ctrl-icon-btn back-btn" @click="emit('back')" title="返回">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div class="trip-identity">
            <span class="trip-label">行程</span>
            <span class="detail-trip-name">{{ trip.name }}</span>
          </div>
        </div>
        <div class="z-end">
          <span class="count-badge">{{ trip.points.length }} 个地点</span>
          <div class="player-controls-mini">
            <button class="ctrl-icon-btn" @click="resetTrip" title="重置">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button class="ctrl-icon-btn play" :class="{ active: isPlaying }" :disabled="!mapReady" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
              <svg v-if="!isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="ctrl-icon-btn" @click="nextStep" title="下一步">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Z 对角线：进度条作为视线引导 -->
      <div class="z-diagonal">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>

      <!-- Z 第二横：左下（进度状态）→ 右下（点位流向） -->
      <div class="z-row z-row-bottom">
        <div class="z-start">
          <div class="progress-status">
            <span class="progress-fraction">{{ currentIndex + 1 }}<span class="fraction-divider">/</span>{{ trip.points.length }}</span>
            <span class="progress-label">已游览</span>
          </div>
        </div>
        <div class="z-flow">
          <span v-if="prevPoint" class="nav-point prev">{{ prevPoint.name }}</span>
          <span v-else class="nav-point origin">起点</span>
          <span class="nav-arrow">→</span>
          <span v-if="currentPoint" class="nav-point current">{{ currentPoint.name }}</span>
          <span v-else class="nav-point placeholder">—</span>
          <span class="nav-arrow">→</span>
          <span v-if="nextPoint" class="nav-point next">{{ nextPoint.name }}</span>
          <span v-else class="nav-point terminus">终点</span>
        </div>
        <div class="z-end">
          <span class="percent-value" :style="{ '--p': progressPercent + '%' }">{{ Math.round(progressPercent) }}%</span>
        </div>
      </div>
    </div>

    <!-- 地图容器 -->
    <div class="map-container" :class="{ 'is-fullscreen': fullscreen }">
      <el-button class="fullscreen-btn" link @click="emit('toggle-fullscreen')" title="全屏">⛶</el-button>
      <div id="amap-container" ref="mapContainer"></div>
      <div class="sky-mask"></div>

      <!-- 地图加载遮罩 -->
      <div class="map-loading" ref="mapLoadingRef" v-show="!mapReady">
        <div class="loading-inner">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <span class="loading-text">地图加载中</span>
      </div>

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
      <div class="moving-dot" ref="movingDot" :class="{ visible: isPlaying }">
        <div class="dot-ring"></div>
        <div class="dot-core"></div>
      </div>
    </div>

    <!-- 底部工具栏（独立组件） -->
    <BottomToolbar
      v-show="!fullscreen"
      @add-point="openAddPointDialog"
      @toggle-list="showPointList = !showPointList; showSettings = false"
      @toggle-settings="showSettings = !showSettings; showPointList = false"
    />

    <!-- 点位列表面板 -->
    <PointListPanel
      v-model:visible="showPointList"
      @close="showPointList = false"
    >
      <!-- 批量操作栏 -->
      <div class="stops-header">
        <div class="stops-header-left">
          <span class="stops-title">地点</span>
          <span class="stops-count">{{ trip.points.length }}</span>
        </div>
        <div class="stops-header-right">
          <el-button size="small" v-if="!showBatchMode && !detailEmpty" @click="enterBatchMode">☰ 批量</el-button>
          <el-button size="small" v-if="showBatchMode && selectedCount > 0" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</el-button>
          <el-button size="small" v-if="showBatchMode" @click="exitBatchMode">取消</el-button>
          <el-button type="danger" size="small" v-if="showBatchBar" @click="batchDeletePoints">🗑 删除 ({{ selectedCount }})</el-button>
        </div>
      </div>

      <!-- 点位时间线 -->
      <div class="stops-timeline" v-if="!detailEmpty">
        <div
          v-for="(point, index) in trip.points"
          :key="point.id"
          class="stop-row panel-item"
          :draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
          :class="{ 'drag-over': dragOverIndex === index, 'dragging': dragIndex === index }"
        >
          <div class="stop-timeline">
            <div class="timeline-dot" :class="{ active: index === currentIndex, visited: index < currentIndex }"></div>
            <div v-if="index < trip.points.length - 1" class="timeline-line" :class="{ visited: index < currentIndex }"></div>
          </div>
          <div class="stop-content" :class="{ visited: index < currentIndex, current: index === currentIndex }" @click="jumpTo(index)">
            <div class="stop-main">
              <div class="stop-name-row">
                <el-checkbox
                  v-if="showBatchMode"
                  class="stop-checkbox"
                  :model-value="selectedIndexes.has(index)"
                  @click.stop
                  @change="toggleSelect(index)"
                />
                <span class="stop-name">{{ point.name }}</span>
              </div>
              <div class="stop-meta">
                <span class="stop-type">{{ getTypeName(point.type) }}</span>
                <span v-if="point.description" class="stop-desc">{{ point.description }}</span>
              </div>
            </div>
            <div class="stop-actions">
              <el-button class="action-btn" link @click.stop="openEditDialog(index, point)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </el-button>
              <el-button class="action-btn" link @click.stop="deletePoint(index)" title="删除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </el-button>
            </div>
            <div v-if="index < trip.points.length - 1" class="travel-toggle" @click.stop="toggleSegmentTravelType(index)">
              <span class="travel-icon">{{ point.travelTypeToHere === 'drive' ? '🚗' : '✈️' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="detailEmpty" class="stops-empty">
        <div class="empty-illustration">
          <div class="empty-dot dot-1"></div>
          <div class="empty-dot dot-2"></div>
          <div class="empty-dot dot-3"></div>
          <div class="empty-dash-line"></div>
        </div>
        <div class="empty-content">
          <div class="empty-badge">地点列表</div>
          <h3 class="empty-title">还没有添加地点</h3>
          <p class="empty-hint">在地图上点击或搜索来添加你的旅行目的地</p>
        </div>
      </div>
    </PointListPanel>

    <!-- 设置面板 -->
    <SettingsPanel
      v-model:visible="showSettings"
      @close="showSettings = false"
    >
      <div class="setting-item">
        <span class="setting-label">播放速度</span>
        <div class="speed-slider-wrap">
          <el-slider
            v-model="speedIndex"
            :marks="speedMarks"
            step="mark"
            :show-tooltip="false"
            @change="handleSpeedChange"
          />
        </div>
      </div>
    </SettingsPanel>

    <!-- 添加点位弹窗 -->
    <AddPointDialog ref="addPointDialogRef" @add="onAddPoint" :map-ready="mapReady" />

    <!-- 编辑点位弹窗 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑点位"
      width="420px"
      :close-on-click-modal="true"
    >
      <div class="point-form">
        <div class="form-row">
          <label>名称</label>
          <el-input v-model="editForm.name" placeholder="点位名称" />
        </div>
        <div class="form-row">
          <label>类型</label>
          <el-select v-model="editForm.type" placeholder="选择类型" style="width: 100%">
            <el-option value="food" label="🍜 美食" />
            <el-option value="attraction" label="🏛️ 景点" />
            <el-option value="activity" label="🎉 活动" />
            <el-option value="hotel" label="🏨 住宿" />
            <el-option value="transport" label="🚗 交通" />
          </el-select>
        </div>
        <div class="form-row">
          <label>描述</label>
          <el-input v-model="editForm.description" placeholder="简短描述（可选）" />
        </div>
        <div class="form-row coords-row">
          <label>坐标</label>
          <span class="coords">{{ editForm.position[0].toFixed(6) }}, {{ editForm.position[1].toFixed(6) }}</span>
        </div>
        <div class="form-row">
          <label>到这里</label>
          <el-select v-model="editForm.travelTypeToHere" placeholder="出行方式" style="width: 100%">
            <el-option value="fly" label="✈️ 飞机" />
            <el-option value="drive" label="🚗 驾车" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="closeEditDialog">取消</el-button>
        <el-button type="primary" @click="saveEdit">✓ 保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ElMessage } from 'element-plus'
import AMapLoader from '@amap/amap-jsapi-loader'
import { markerIcons } from '../data/sampleTrip.js'
import AddPointDialog from './AddPointDialog.vue'
import { useTripStore } from '../composables/useTripStore.js'
import {
  getBearing, calcFitZoom, getSegmentDuration,
  interpolatePathCoord, buildTrailPath, makeArcPath,
  isPosInView, haversineDistance
} from '../utils/mapUtils.js'
import {
  createDotMarker, createLabelMarker, clearMarkers,
  safeSetPath, FLY_SVG_CONTENT, CAR_SVG_CONTENT, INVISIBLE_MARKER_ICON
} from '../utils/mapMarkers.js'
import {
  default as BottomToolbar,
} from './business/trip-detail/BottomToolbar.vue'
import {
  default as PointListPanel,
} from './business/trip-detail/PointListPanel.vue'
import {
  default as SettingsPanel,
} from './business/trip-detail/SettingsPanel.vue'

const props = defineProps({
  fullscreen: Boolean,
  tripId: Number
})
const emit = defineEmits(['toggle-fullscreen', 'back'])

// ── Device / perf detection ──────────────────────────────────
const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0
const isLowPerf = (() => {
  try { return devicePixelRatio > 2 || !window.WebGLRenderingContext } catch (_) { return true }
})()
const GSAP_STAGGER  = isLowPerf ? 0.18 : 0.07
const MAP_PITCH     = isMobile ? 0 : 45

let mainCtx = null

const { currentDetailTrip, detailEmpty: storeDetailEmpty, getTypeName, addPointToTrip, deletePointFromTrip, batchDeletePointsFromTrip, updatePointInTrip, movePointInTrip, toggleSegmentTravelType: storeToggleSegmentTravelType } = useTripStore()

// 当前详情页直接操作 props 传入的 trip，但我们需要拿到引用
const trip = computed(() => currentDetailTrip.value)
const detailEmpty = computed(() => storeDetailEmpty.value)

// ── 新组件状态（props 驱动）───────────────────────────────────
const showPointList = ref(false)
const showSettings  = ref(false)

function openAddPointDialog() {
  addPointDialogRef.value?.openDialog?.()
}

// ── 保留地图相关状态 ──────────────────────────────────────────
const prevPoint = computed(() => {
  if (!trip.value?.points?.length) return null
  return currentIndex.value > 0 ? trip.value.points[currentIndex.value - 1] : null
})
const nextPoint = computed(() => {
  if (!trip.value?.points?.length) return null
  return currentIndex.value < trip.value.points.length - 1 ? trip.value.points[currentIndex.value + 1] : null
})

// ==================== 地图实例 ====================
let map = null
let AMap = null
let mainPolyline = null
let trailLine = null
let movingMarker = null
let traveledPath = []
let allDotMarkers = []
let allLabelMarkers = []
let routeDirMap = {}
let arrivalRingAnimId = null
let mapResizeObserver = null
const ringOverlayRef = ref(null)
const uid = Date.now()
const ringState = ref({
  active: false,
  screenX: 0, screenY: 0,
  outerR: 0, innerR: 0,
  opacity: 0, strokeW: 8,
})
let anim = {
  active: false, rafId: null, startTime: 0, duration: 0,
  to: null, toIdx: 0, departureIdx: 0,
  driving: null, zoomInterval: null, rotInterval: null, pendingStart: null,
}

const mapLoadingRef = ref(null)
const mapReady = ref(false)
// map container is accessed via document.getElementById

function cancelAnim() {
  anim.active = false
  if (anim.rafId) cancelAnimationFrame(anim.rafId)
  anim.rafId = null
  if (anim.zoomInterval) clearInterval(anim.zoomInterval)
  if (anim.rotInterval) clearInterval(anim.rotInterval)
  anim.zoomInterval = null
  anim.rotInterval = null
  if (anim.driving) { anim.driving.search(null); anim.driving = null }
  if (anim.pendingStart) { clearTimeout(anim.pendingStart); anim.pendingStart = null }
  ringState.value.active = false
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
  if (ringOverlayRef.value) ringOverlayRef.value.style.display = 'none'
  if (!isPlaying.value) { traveledPath = []; return }
}

function clearMap() {
  allDotMarkers = clearMarkers(allDotMarkers)
  allLabelMarkers = clearMarkers(allLabelMarkers)
  safeSetPath(mainPolyline, [])
  safeSetPath(trailLine, [])
  if (mainPolyline) mainPolyline.hide()
  if (trailLine) trailLine.hide()
}

// ==================== 播放控制 ====================
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentSpeed = ref(1)
const speeds = [0.5, 1, 2, 4]
const speedIndex = ref((speeds.indexOf(currentSpeed.value) / (speeds.length - 1)) * 100)
const speedMarks = ref({ 0: '0.5x', 33.33: '1x', 66.67: '2x', 100: '4x' })
let animTimer = null

const addPointDialogRef = ref(null)

const currentPoint = computed(() => trip.value?.points ? trip.value.points[currentIndex.value] : null)
const progressPercent = computed(() => trip.value?.points && trip.value.points.length ? (currentIndex.value / trip.value.points.length) * 100 : 0)

function togglePlay() {
  isPlaying.value ? pausePlay() : startPlay()
}

function startPlay() {
  if (!trip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  if (currentIndex.value >= trip.value.points.length) {
    currentIndex.value = 0
    traveledPath = []
  }
  if (currentIndex.value >= trip.value.points.length - 1) resetTrip()
  if (anim.pendingStart) { clearTimeout(anim.pendingStart); anim.pendingStart = null }
  cancelAnim()
  if (currentIndex.value > 0) {
    traveledPath = trip.value.points.slice(0, currentIndex.value + 1).map(p => p.position)
    if (traveledPath.length < 2) traveledPath = []
  } else {
    traveledPath = []
  }
  if (traveledPath.length >= 2) safeSetPath(mainPolyline, traveledPath)
  isPlaying.value = true
  syncDots()
  const curPos = trip.value.points[currentIndex.value].position
  if (!isPosInView(map, curPos)) {
    map && map.panTo(curPos)
    anim.pendingStart = setTimeout(() => {
      anim.pendingStart = null
      if (isPlaying.value) planAndAnimate()
    }, 350)
  } else {
    planAndAnimate()
  }
}

function pausePlay() {
  cancelAnim()
  isPlaying.value = false
  if (animTimer) { clearTimeout(animTimer); animTimer = null }
}

function resetTrip() {
  if (!trip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  pausePlay()
  routeDirMap = {}
  currentIndex.value = 0
  traveledPath = []
  safeSetPath(mainPolyline, [])
  safeSetPath(trailLine, [])
  movingMarker && movingMarker.setPosition(trip.value.points[0].position)
  allLabelMarkers.forEach((l, i) => i === 0 ? triggerLabelAppear(l) : l.hide())
  allDotMarkers.forEach((dot, i) => dot && (i === 0 ? dot.show() : dot.hide()))
  map && map.setCenter(trip.value.points[0].position)
  map && map.setZoom(14)
}

function nextStep() {
  if (!trip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  pausePlay()
  if (currentIndex.value < trip.value.points.length - 1) {
    const pts = trip.value.points
    const newIdx = currentIndex.value + 1
    currentIndex.value = newIdx
    const pos = pts[newIdx].position
    movingMarker && movingMarker.setPosition(pos)
    map && map.panTo(pos)
    triggerLabelAppear(allLabelMarkers[newIdx])
    if (allDotMarkers[newIdx]) allDotMarkers[newIdx].show()
  }
  syncDots()
}

function jumpTo(index) {
  if (!trip.value?.points?.length) return
  pausePlay()
  allLabelMarkers.forEach((l, i) => i === index ? triggerLabelAppear(l) : l.hide())
  currentIndex.value = index
  movingMarker && movingMarker.setPosition(trip.value.points[index].position)
  map && map.panTo(trip.value.points[index].position)
  if (allDotMarkers[index]) allDotMarkers[index].show()
  syncDots()
}

function syncDots() {
  allDotMarkers.forEach((dot, i) => {
    if (!dot) return
    const isDeparture = anim.active && i === anim.departureIdx
    const visible = !isPlaying.value || isDeparture || i <= currentIndex.value
    visible ? dot.show() : dot.hide()
  })
}

// ==================== 核心动画 ====================
function planAndAnimate() {
  if (!isPlaying.value || !map || !AMap) return
  if (currentIndex.value >= trip.value.points.length - 1) { pausePlay(); return }

  const from = trip.value.points[currentIndex.value].position
  const to = trip.value.points[currentIndex.value + 1].position
  const prevIdx = currentIndex.value
  if (!allLabelMarkers[prevIdx]) { console.warn('label marker not found', prevIdx); return }
  allLabelMarkers[prevIdx].hide()

  function doZoomStep() {
    if (!isPlaying.value) return
    const span = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
    const targetZoom = span > 2 ? calcFitZoom(from, to) : null
    if (targetZoom !== null) map.setZoom(targetZoom, false, 600)

    function waitZoomDone(callback) {
      if (targetZoom === null) { setTimeout(callback, 400); return }
      const startTime = Date.now()
      anim.zoomInterval = setInterval(() => {
        if (!isPlaying.value) { clearInterval(anim.zoomInterval); anim.zoomInterval = null; return }
        if (Math.abs(map.getZoom() - targetZoom) < 0.5) {
          clearInterval(anim.zoomInterval); anim.zoomInterval = null; setTimeout(callback, 400)
        } else if (Date.now() - startTime > 1500) {
          clearInterval(anim.zoomInterval); anim.zoomInterval = null; setTimeout(callback, 0)
        }
      }, 50)
    }

    waitZoomDone(() => {
      if (!isPlaying.value) return
      map.setCenter(from, false, 400)
      setTimeout(() => {
        if (!isPlaying.value) return
        const segmentTravelType = trip.value.points[currentIndex.value].travelTypeToHere || 'fly'
        if (segmentTravelType === 'fly') {
          animateSegment(makeArcPath(from, to, currentIndex.value, 30, routeDirMap), 'fly')
        } else {
          const driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME, extensions: 'all', hideMarkers: true })
          if (!from || !to || from.some(v => isNaN(v)) || to.some(v => isNaN(v))) {
            animateSegment([from, to], 'drive')
          } else {
            driving.search(from, to, function(status, result) {
              if (!isPlaying.value) return
              if (status === 'complete' && result && result.routes && result.routes[0]) {
                const pathPoints = []
                result.routes[0].steps.forEach(step => {
                  if (step.path) step.path.forEach(p => pathPoints.push([p.lng, p.lat]))
                })
                animateSegment(pathPoints.length > 1 ? (pathPoints[0] = from, pathPoints) : [from, to], 'drive')
              } else {
                animateSegment([from, to], 'drive')
              }
            })
          }
        }
      }, 400)
    })
  }

  setTimeout(doZoomStep, 400)
}

function animateSegment(pathCoords, travelType) {
  if (!isPlaying.value || !pathCoords || pathCoords.length < 1) return
  const iconContent = travelType === 'drive' ? CAR_SVG_CONTENT : FLY_SVG_CONTENT
  movingMarker && movingMarker.setContent(iconContent)
  movingMarker && movingMarker.setOffset(new AMap.Pixel(-16, -16))
  cancelAnim()
  anim.active = true
  anim.departureIdx = currentIndex.value
  anim.toIdx = currentIndex.value + 1
  anim.to = pathCoords[pathCoords.length - 1]
  const span = Math.max(Math.abs(anim.to[0] - pathCoords[0][0]), Math.abs(anim.to[1] - pathCoords[0][1]))
  if (span > 2) map && map.setZoom(calcFitZoom(pathCoords[0], anim.to), true)
  if (pathCoords.length === 2) map && map.setRotation(getBearing(pathCoords[0], anim.to))
  anim.duration = getSegmentDuration(pathCoords[0], anim.to) / currentSpeed.value
  anim.startTime = performance.now()
  anim.rafId = requestAnimationFrame((now) => animLoop(now, pathCoords))
}

function animLoop(now, pathCoords) {
  if (!anim.active || !pathCoords || pathCoords.length < 1) return
  const elapsed = now - anim.startTime
  const rawT = Math.min(elapsed / anim.duration, 1)
  const eased = 1 - (1 - rawT) * (1 - rawT)
  const pos = interpolatePathCoord(pathCoords, eased)
  if (!pos) { anim.rafId = requestAnimationFrame((t) => animLoop(t, pathCoords)); return }
  const trailPath = buildTrailPath(pathCoords, eased)
  if (trailPath && trailPath.length >= 2) trailLine && trailLine.setPath(trailPath)
  movingMarker && movingMarker.setPosition(pos)
  maybePan(pos)
  if (rawT >= 1) {
    const arrivedIdx = anim.toIdx
    cancelAnim()
    anim.active = true
    anim.departureIdx = arrivedIdx
    safeSetPath(trailLine, pathCoords)
    if (isPlaying.value) {
      triggerArrivalRing(anim.to)
      if (allDotMarkers[arrivedIdx]) allDotMarkers[arrivedIdx].show()
      triggerLabelAppear(allLabelMarkers[arrivedIdx])
    }
    movingMarker && movingMarker.setContent(INVISIBLE_MARKER_ICON)
    animTimer = setTimeout(() => {
      if (!isPlaying.value) return
      traveledPath = [...traveledPath, ...pathCoords]
      safeSetPath(mainPolyline, traveledPath)
      currentIndex.value = arrivedIdx
      syncDots()
      animTimer = setTimeout(() => { if (isPlaying.value) planAndAnimate() }, 800)
    }, 0)
  } else {
    anim.rafId = requestAnimationFrame((t) => animLoop(t, pathCoords))
  }
}

function maybePan(pos) {
  if (!map) return
  const bounds = map.getBounds()
  if (!bounds) return
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const padding = 0.45
  const lngRange = ne.lng - sw.lng
  const latRange = ne.lat - sw.lat
  const minLng = sw.lng + lngRange * padding
  const maxLng = ne.lng - lngRange * padding
  const minLat = sw.lat + latRange * padding
  const maxLat = ne.lat - latRange * padding
  if (pos[0] < minLng || pos[0] > maxLng || pos[1] < minLat || pos[1] > maxLat) map.panTo(pos)
}

// ==================== arrival ring ====================
function triggerArrivalRing(pos) {
  if (!map) return
  if (ringState.value.active) {
    if (arrivalRingAnimId) cancelAnimationFrame(arrivalRingAnimId)
    ringState.value.active = false
    if (ringOverlayRef.value) ringOverlayRef.value.style.display = 'none'
  }
  if (!pos || !Array.isArray(pos) || pos.length < 2 || isNaN(pos[0]) || isNaN(pos[1])) {
    console.warn('triggerArrivalRing: 无效坐标', pos)
    return
  }
  const mapPos = new AMap.LngLat(pos[0], pos[1])
  const pixel = map.lngLatToContainer(mapPos)
  if (isNaN(pixel.x) || isNaN(pixel.y)) return
  const svgEl = ringOverlayRef.value
  if (!svgEl) return
  svgEl.style.display = 'block'
  ringState.value.active = true
  ringState.value.screenX = pixel.x
  ringState.value.screenY = pixel.y
  ringState.value.outerR = 6
  ringState.value.innerR = 0
  ringState.value.opacity = 0.65
  ringState.value.strokeW = 8
  if (arrivalRingAnimId) cancelAnimationFrame(arrivalRingAnimId)
  ringState.value._start = performance.now()
  arrivalRingAnimId = requestAnimationFrame(animRing)
}

function animRing(now) {
  const DURATION = 900
  const MAX_OUTER = 32
  const easeOut = t => 1 - Math.pow(1 - t, 3)
  if (!ringState.value.active) {
    if (ringOverlayRef.value) ringOverlayRef.value.style.display = 'none'
    arrivalRingAnimId = null
    return
  }
  const rawT = Math.min((now - ringState.value._start) / DURATION, 1)
  ringState.value.outerR = 6 + (MAX_OUTER - 6) * easeOut(rawT)
  ringState.value.innerR = ringState.value.outerR * easeOut(rawT)
  ringState.value.opacity = Math.max(0, 0.65 * (1 - easeOut(rawT)))
  if (rawT >= 1) {
    ringState.value.active = false
    if (ringOverlayRef.value) ringOverlayRef.value.style.display = 'none'
    arrivalRingAnimId = null
  } else {
    arrivalRingAnimId = requestAnimationFrame(animRing)
  }
}

function triggerLabelAppear(label) {
  if (!label) return
  label.show()
  const el = label.getContentDom()
  if (el) {
    el.style.opacity = '0'
    el.style.transition = 'none'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.45s ease-out'
        el.style.opacity = '1'
      })
    })
  }
}

// ==================== 点位操作 ====================
function onAddPoint(point) {
  const newPoint = addPointToTrip(props.tripId, point)
  if (!newPoint || !map || !AMap || !movingMarker) return
  const dot = createDotMarker(AMap, newPoint.position)
  dot.setMap(map)
  const newIdx = trip.value.points.length - 1
  if (isPlaying.value && newIdx > currentIndex.value) dot.hide()
  allDotMarkers.push(dot)
  const label = createLabelMarker(AMap, newPoint, {
    hidden: true,
    onClick: () => jumpTo(newIdx)
  })
  label.setMap(map)
  allLabelMarkers.push(label)
}

function deletePoint(index) {
  const ok = deletePointFromTrip(props.tripId, index)
  if (!ok) return
  // 同步地图标记
  if (allLabelMarkers[index]) {
    allLabelMarkers[index].off && allLabelMarkers[index].off('click')
    allLabelMarkers[index].setMap(null)
    allLabelMarkers.splice(index, 1)
  }
  if (allDotMarkers[index]) {
    allDotMarkers[index].setMap(null)
    allDotMarkers.splice(index, 1)
  }
  mainPolyline && mainPolyline.setPath(trip.value.points.map(p => p.position))
  if (currentIndex.value >= trip.value.points.length) currentIndex.value = trip.value.points.length - 1
}

function toggleSegmentTravelType(index) {
  storeToggleSegmentTravelType(props.tripId, index)
}

// 拖拽排序
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}
function onDragOver(index) {
  if (dragIndex.value === -1 || dragIndex.value === index) return
  dragOverIndex.value = index
}
function onDrop(index) {
  if (dragIndex.value === -1 || dragIndex.value === index) return
  pausePlay()
  movePointInTrip(props.tripId, dragIndex.value, index)

  const [movedDot] = allDotMarkers.splice(dragIndex.value, 1)
  allDotMarkers.splice(index, 0, movedDot)
  const [movedLabel] = allLabelMarkers.splice(dragIndex.value, 1)
  allLabelMarkers.splice(index, 0, movedLabel)

  allDotMarkers.forEach((dot, i) => dot.setCenter(trip.value.points[i].position))
  allLabelMarkers.forEach((label, i) => label.setPosition(trip.value.points[i].position))
  const positions = trip.value.points.map(p => p.position)
  safeSetPath(mainPolyline, positions)
  safeSetPath(trailLine, positions)

  if (currentIndex.value === dragIndex.value) {
    currentIndex.value = index
  } else if (dragIndex.value < currentIndex.value && index > currentIndex.value) {
    currentIndex.value--
  } else if (dragIndex.value > currentIndex.value && index < currentIndex.value) {
    currentIndex.value++
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}
function onDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

// 批量删除
const selectedIndexes = ref(new Set())
const showBatchMode = ref(false)
const showBatchBar = computed(() => selectedIndexes.value.size > 0)
const selectedCount = computed(() => selectedIndexes.value.size)
const allSelected = computed(() =>
  selectedIndexes.value.size > 0 &&
  selectedIndexes.value.size === trip.value.points.length
)

function enterBatchMode() { showBatchMode.value = true }
function exitBatchMode() { showBatchMode.value = false; selectedIndexes.value = new Set() }
function toggleSelect(index) {
  const s = new Set(selectedIndexes.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  selectedIndexes.value = s
}
function toggleSelectAll() {
  if (allSelected.value) selectedIndexes.value = new Set()
  else selectedIndexes.value = new Set(trip.value.points.map((_, i) => i))
}
function batchDeletePoints() {
  const ok = batchDeletePointsFromTrip(props.tripId, selectedIndexes.value)
  if (!ok) return
  pausePlay()
  const delSet = new Set(selectedIndexes.value)
  // 从后往前清理地图标记
  for (let i = allLabelMarkers.length - 1; i >= 0; i--) {
    if (delSet.has(i)) {
      if (allLabelMarkers[i]) {
        allLabelMarkers[i].off && allLabelMarkers[i].off('click')
        allLabelMarkers[i].setMap(null)
      }
      allLabelMarkers.splice(i, 1)
    }
  }
  for (let i = allDotMarkers.length - 1; i >= 0; i--) {
    if (delSet.has(i)) {
      allDotMarkers[i] && allDotMarkers[i].setMap(null)
      allDotMarkers.splice(i, 1)
    }
  }
  mainPolyline && mainPolyline.setPath(trip.value.points.map(p => p.position))
  trailLine && trailLine.setPath([])
  movingMarker && movingMarker.hide()
  currentIndex.value = 0
  selectedIndexes.value = new Set()
  showBatchMode.value = false
  if (trip.value.points.length === 0) {
    allLabelMarkers = []
    allDotMarkers = []
  }
}

// 编辑弹窗
const showEditDialog = ref(false)
const editingIndex = ref(-1)
const editForm = ref({ name: '', type: 'attraction', description: '', position: [0, 0], travelTypeToHere: 'fly' })

function openEditDialog(index, point) {
  editingIndex.value = index
  editForm.value = {
    name: point.name,
    type: point.type,
    description: point.description || '',
    position: [...point.position],
    travelTypeToHere: point.travelTypeToHere || 'fly'
  }
  showEditDialog.value = true
}
function handleSpeedChange() {
  const idx = Math.round(speedIndex.value / (100 / (speeds.length - 1)))
  currentSpeed.value = speeds[idx]
}
function closeEditDialog() { showEditDialog.value = false }
function saveEdit() {
  const idx = editingIndex.value
  if (idx < 0) return
  const newPos = editForm.value.position
  updatePointInTrip(props.tripId, idx, {
    name: editForm.value.name,
    type: editForm.value.type,
    description: editForm.value.description,
    travelTypeToHere: editForm.value.travelTypeToHere
  })
  allDotMarkers[idx].setCenter(newPos)
  allLabelMarkers[idx].setPosition(newPos)
  allLabelMarkers[idx].setContent(`<div class="label-tag">${markerIcons[editForm.value.type] || '📍'} ${editForm.value.name}</div>`)
  safeSetPath(mainPolyline, trip.value.points.map(p => p.position))
  closeEditDialog()
}

// ==================== 地图初始化 ====================
window._AMapSecurityConfig = {
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE
}

onMounted(async () => {
  // All GSAP tweens live in child components — child ctx.revert() handles cleanup.
  // TripDetail onUnmounted just calls mainCtx?.revert() which kills
  // the loading animation started here.
  mainCtx = gsap.context(() => {}, document.body)

  try {
    AMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.InfoWindow', 'AMap.Driving']
    })
    const container = document.getElementById('amap-container')
    const waitForSize = (el) => {
      return new Promise(resolve => {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) { resolve(); return }
        const ro = new ResizeObserver(() => {
          if (el.offsetWidth > 0 && el.offsetHeight > 0) { ro.disconnect(); resolve() }
        })
        ro.observe(el)
        setTimeout(() => { ro.disconnect(); resolve() }, 500)
      })
    }
    await waitForSize(container)

    const initialCenter = trip.value?.points?.length > 0 ? trip.value.points[0].position : [98.5865, 24.4336]
    map = new AMap.Map('amap-container', {
      zoom: 14, pitch: MAP_PITCH, center: initialCenter, viewMode: '3D'
    })

    mainPolyline = new AMap.Polyline({ strokeColor: '#D96B1A', strokeWeight: 4, lineJoin: 'round' })
    map.add(mainPolyline)
    trailLine = new AMap.Polyline({ strokeColor: '#B05A30', strokeWeight: 4, lineJoin: 'round' })
    map.add(trailLine)

    if (trip.value?.points?.length) {
      trip.value.points.forEach((point) => {
        const dot = createDotMarker(AMap, point.position)
        map.add(dot)
        allDotMarkers.push(dot)
      })
      trip.value.points.forEach((point, index) => {
        const label = createLabelMarker(AMap, point, {
          hidden: true,
          onClick: () => jumpTo(index)
        })
        map.add(label)
        allLabelMarkers.push(label)
      })
      // 初始化显示第一个点
      allDotMarkers.forEach((dot, i) => { if (dot && i > 0) dot.hide() })
      safeSetPath(mainPolyline, [trip.value.points[0].position])
      safeSetPath(trailLine, [trip.value.points[0].position])
      triggerLabelAppear(allLabelMarkers[0])
    }

    if (!movingMarker) {
      movingMarker = new AMap.Marker({
        position: trip.value?.points?.length > 0 ? trip.value.points[0].position : [98.5865, 24.4336],
        content: FLY_SVG_CONTENT,
        offset: new AMap.Pixel(-16, -16),
        zIndex: 100
      })
      map.add(movingMarker)
    }

    mapReady.value = true
    if (mapLoadingRef.value) {
      gsap.to(mapLoadingRef.value, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        onComplete() {
          if (mapLoadingRef.value) mapLoadingRef.value.style.display = 'none'
        }
      })
    }

    mapResizeObserver = new ResizeObserver(() => { if (map) map.resize() })
    mapResizeObserver.observe(document.getElementById('amap-container'))
  } catch (e) {
    console.error('地图加载失败:', e)
  }
})

onUnmounted(() => {
  mainCtx?.revert()
  pausePlay()
  cancelAnim()
  allLabelMarkers.forEach(l => l.off && l.off('click'))
  if (map) {
    map.off && map.off()
    map.destroy()
  }
  if (mapResizeObserver) { mapResizeObserver.disconnect(); mapResizeObserver = null }
  ringState.value.active = false
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
})
</script>

<style scoped>
/* ─── Base layout ─────────────────────────────────── */
.trip-detail {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 96px);
  overflow: hidden;
  position: relative;
}
.trip-detail.is-fullscreen { height: 100vh; }

/* ─── Map ─────────────────────────────────────────── */
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
}
#amap-container { width: 100%; height: 100%; min-height: 0; position: relative; z-index: 0; }
.sky-mask {
  position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(to bottom, oklch(96% 0.005 55 / 0.7) 0%, transparent 25%);
  pointer-events: none;
  border-radius: 18px;
}
.map-container.is-fullscreen { border-radius: 0 !important; box-shadow: none !important; }
.map-container.is-fullscreen #amap-container { height: 100vh !important; }
.map-container.is-fullscreen .sky-mask { display: none; }

/* Fullscreen button */
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

/* Map loading */
.map-loading {
  position: absolute;
  inset: 0;
  z-index: 50;
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

/* Ring overlay */
.ring-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; }

/* Moving dot */
.moving-dot {
  position: absolute; left: 0; top: 0;
  width: 18px; height: 18px; pointer-events: none; z-index: 50; display: none;
}
.moving-dot.visible { display: block; }
.dot-ring {
  position: absolute; left: 50%; top: 50%;
  width: 18px; height: 18px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid oklch(62% 0.13 25 / 0.35);
  animation: dotRing 1.6s ease-out infinite;
}
.dot-core {
  position: absolute; left: 50%; top: 50%;
  width: 7px; height: 7px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: oklch(62% 0.13 25);
}
@keyframes dotRing {
  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
}

/* ─── Control Panel ─────────────────────────────────── */
.control-panel {
  width: 340px;
  flex-shrink: 0;
  background: oklch(100% 0 0);
  border: 1px solid oklch(88% 0.008 55);
  border-radius: 18px;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Back bar */
.detail-back-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 0 2px 16px;
  border-bottom: 1px solid oklch(88% 0.008 55);
  margin-bottom: 16px;
}
.detail-trip-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9375rem; font-weight: 700;
  color: oklch(22% 0.012 55); letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.detail-back-bar .el-button {
  font-size: 0.75rem; font-weight: 500;
  color: oklch(55% 0.01 55);
  transition: color 0.15s ease;
}
.detail-back-bar .el-button:hover { color: oklch(30% 0.012 55); }

/* Status bar */
.status-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border: 1px solid oklch(88% 0.008 55);
  border-radius: 12px;
  margin-bottom: 14px;
  background: oklch(97% 0.005 55);
  transition: border-color 0.2s ease;
}
.status-bar:hover { border-color: oklch(72% 0.015 55); }
.status-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.status-icon {
  font-size: 16px; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: oklch(62% 0.13 25 / 0.1);
  border-radius: 9px; flex-shrink: 0;
}
.status-info { flex: 1; min-width: 0; }
.status-name {
  font-size: 0.8125rem; font-weight: 600;
  color: oklch(22% 0.012 55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.status-desc {
  font-size: 0.6875rem; color: oklch(52% 0.01 55);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.status-count { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.count-num {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.375rem; font-weight: 700;
  color: oklch(62% 0.13 25); line-height: 1; letter-spacing: -0.03em;
}
.count-unit { font-size: 0.625rem; color: oklch(52% 0.01 55); margin-top: 2px; }
.add-in-status { flex-shrink: 0; }

/* Progress section */
.progress-section { margin-bottom: 14px; }
.progress-bar {
  height: 4px; background: oklch(88% 0.008 55);
  border-radius: 2px; overflow: hidden; margin-bottom: 8px;
}
.progress-fill {
  height: 100%; background: oklch(62% 0.13 25);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.progress-text {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.6875rem; color: oklch(52% 0.01 55);
}
.progress-text span:last-child { font-weight: 700; color: oklch(62% 0.13 25); }

/* Controls row */
.controls-row { margin-bottom: 14px; }
.player-controls { display: flex; align-items: center; gap: 8px; }
.ctrl-icon-btn {
  width: 38px; height: 38px;
  border-radius: 10px;
  border: 1px solid oklch(88% 0.008 55);
  background: oklch(97% 0.005 55);
  color: oklch(40% 0.012 55);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}
.ctrl-icon-btn:hover:not(:disabled) {
  background: oklch(62% 0.13 25);
  border-color: oklch(62% 0.13 25);
  color: oklch(99% 0 0);
}
.ctrl-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ctrl-icon-btn.play {
  width: 44px; height: 44px;
  border-radius: 12px;
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

/* Speed control */
.speed-control {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px; padding-top: 12px;
  border-top: 1px solid oklch(88% 0.008 55);
}
.speed-label {
  font-size: 0.625rem; font-weight: 600;
  color: oklch(52% 0.01 55);
  text-transform: uppercase; letter-spacing: 0.08em;
  flex-shrink: 0;
}
.speed-slider-wrap { flex: 1; min-width: 0; }
.speed-slider-wrap :deep(.el-slider__runway) { background: oklch(88% 0.008 55); border-radius: 2px; }
.speed-slider-wrap :deep(.el-slider__bar) { background: oklch(62% 0.13 25); border-radius: 2px; }
.speed-slider-wrap :deep(.el-slider__button) {
  width: 13px; height: 13px;
  background: oklch(100% 0 0);
  border: 2px solid oklch(62% 0.13 25);
  border-radius: 50%;
  box-shadow: 0 0 0 3px oklch(62% 0.13 25 / 0.14);
}
.speed-slider-wrap :deep(.el-slider__stop) { background-color: oklch(72% 0.08 25); }
.speed-slider-wrap :deep(.el-slider__marks-text) { font-size: 11px; color: oklch(52% 0.01 55); font-weight: 500; }
.speed-slider-wrap :deep(.el-slider__marks-text-active) { color: oklch(62% 0.13 25); font-weight: 700; }

/* ─── Stops list ──────────────────────────────────── */
.stops-list { flex: 1; overflow-y: auto; padding-right: 2px; min-height: 0; }
.stops-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2px; margin-bottom: 14px;
}
.stops-header-left { display: flex; align-items: center; gap: 8px; }
.stops-title {
  font-size: 0.625rem; font-weight: 600; color: oklch(40% 0.012 55);
  text-transform: uppercase; letter-spacing: 0.1em;
}
.stops-count {
  font-size: 0.625rem; font-weight: 600; color: oklch(62% 0.13 25);
  background: oklch(95% 0.02 25);
  padding: 2px 8px; border-radius: 20px;
}
.stops-header-right { display: flex; align-items: center; gap: 5px; }

.stops-timeline { display: flex; flex-direction: column; }
.stop-row { display: flex; gap: 10px; transition: opacity 0.15s ease; }
.stop-row.dragging { opacity: 0.2; }
.stop-row.drag-over .stop-content {
  border-color: oklch(62% 0.13 25 / 0.3);
  background: oklch(62% 0.13 25 / 0.03);
}

/* Timeline — ultra-subtle */
.stop-timeline {
  display: flex; flex-direction: column; align-items: center;
  width: 18px; flex-shrink: 0; padding-top: 16px;
}
.timeline-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: oklch(88% 0.008 55);
  border: 2px solid oklch(100% 0 0);
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.timeline-dot.active {
  background: oklch(62% 0.13 25);
  box-shadow: 0 0 0 3px oklch(62% 0.13 25 / 0.14);
  transform: scale(1.35);
}
.timeline-dot.visited { background: oklch(72% 0.06 145); }
.timeline-line {
  width: 1.5px; flex: 1; min-height: 20px;
  background: oklch(88% 0.008 55);
  margin: 3px 0; border-radius: 1px;
  transition: background 0.3s ease;
}
.timeline-line.visited { background: oklch(72% 0.06 145); }

/* Stop content card */
.stop-content {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid oklch(88% 0.008 55);
  background: oklch(100% 0 0);
  cursor: pointer;
  margin-bottom: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.stop-content:hover {
  border-color: oklch(72% 0.012 55);
  box-shadow: 0 2px 8px oklch(30% 0.01 55 / 0.05);
  transform: translateY(-1px);
}
.stop-content.visited { opacity: 0.45; }
.stop-content.current {
  background: oklch(62% 0.13 25 / 0.04);
  border-color: oklch(62% 0.13 25 / 0.15);
}

/* Primary: name — dominant */
.stop-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.stop-name-row { display: flex; align-items: baseline; gap: 7px; }
.stop-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem; font-weight: 700;
  color: oklch(22% 0.012 55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  letter-spacing: 0.01em; line-height: 1.2;
}
.stop-emoji { font-size: 15px; flex-shrink: 0; align-self: center; }

/* Secondary: type — subdued, no background, just text */
.stop-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.stop-type {
  font-size: 0.6875rem; font-weight: 500;
  color: oklch(52% 0.01 55);
  letter-spacing: 0.02em;
}
.stop-desc {
  font-size: 0.6875rem; color: oklch(68% 0.008 55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
}

/* Actions — appear on hover */
.stop-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s ease; flex-shrink: 0; }
.stop-content:hover .stop-actions { opacity: 1; }
.action-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: 7px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: oklch(58% 0.01 55); transition: all 0.15s ease; padding: 0;
}
.action-btn:hover { background: oklch(94% 0.008 55); color: oklch(30% 0.012 55); }

/* Travel badge */
.travel-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  background: oklch(97% 0.004 55);
  border: 1px solid oklch(88% 0.008 55);
  border-radius: 6px; cursor: pointer; transition: all 0.15s ease;
  white-space: nowrap; flex-shrink: 0;
}
.travel-badge:hover { background: oklch(92% 0.01 55); border-color: oklch(78% 0.012 55); }
.badge-icon { font-size: 12px; }
.badge-text { font-size: 0.6875rem; font-weight: 500; color: oklch(35% 0.012 55); }

.batch-checkbox { flex-shrink: 0; }

/* Empty state */
.stops-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 40px 16px; min-height: 200px;
}
.empty-visual { margin-bottom: 20px; }
.empty-route { position: relative; width: 80px; height: 32px; display: flex; align-items: center; justify-content: space-between; }
.route-dot { width: 8px; height: 8px; border-radius: 50%; background: oklch(82% 0.01 55); border: 2px solid oklch(100% 0 0); }
.route-dot.highlight { background: oklch(62% 0.13 25); box-shadow: 0 0 0 3px oklch(62% 0.13 25 / 0.15); }
.route-dash { position: absolute; top: 50%; left: 10px; right: 10px; height: 0; border-top: 1.5px dashed oklch(82% 0.01 55); transform: translateY(-50%); }
.empty-content { text-align: center; margin-bottom: 24px; }
.empty-badge { display: inline-block; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: oklch(62% 0.13 25); background: oklch(95% 0.02 25); padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; }
.empty-title { font-family: 'Noto Serif SC', serif; font-size: 1rem; font-weight: 600; color: oklch(22% 0.012 55); margin: 0 0 6px 0; }
.empty-hint { font-size: 0.75rem; color: oklch(52% 0.01 55); margin: 0; line-height: 1.6; max-width: 180px; }
.add-in-empty :deep(.add-point-btn) { padding: 10px 20px; font-size: 0.8125rem; border-radius: 10px; }

.stops-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 40px 16px; min-height: 200px;
}
.empty-visual { margin-bottom: 20px; }
.empty-route { position: relative; width: 80px; height: 32px; display: flex; align-items: center; justify-content: space-between; }
.route-dot { width: 8px; height: 8px; border-radius: 50%; background: oklch(82% 0.01 55); border: 2px solid oklch(100% 0 0); }
.route-dot.highlight { background: oklch(62% 0.13 25); box-shadow: 0 0 0 3px oklch(62% 0.13 25 / 0.15); }
.route-dash { position: absolute; top: 50%; left: 10px; right: 10px; height: 0; border-top: 1.5px dashed oklch(82% 0.01 55); transform: translateY(-50%); }
.empty-content { text-align: center; margin-bottom: 24px; }
.empty-badge { display: inline-block; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: oklch(62% 0.13 25); background: oklch(95% 0.02 25); padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; }
.empty-title { font-family: 'Noto Serif SC', serif; font-size: 1rem; font-weight: 600; color: oklch(22% 0.012 55); margin: 0 0 6px 0; }
.empty-hint { font-size: 0.75rem; color: oklch(52% 0.01 55); margin: 0; line-height: 1.6; max-width: 180px; }
.add-in-empty :deep(.add-point-btn) { padding: 10px 20px; font-size: 0.8125rem; border-radius: 10px; }

/* ─── Label tag (AMap markers) ────────────────────── */
:deep(.label-tag) {
  background: oklch(62% 0.13 25) !important;
  color: oklch(99% 0 0) !important;
  box-shadow: 0 2px 10px oklch(45% 0.1 25 / 0.25) !important;
  text-shadow: none !important;
}

/* ─── Control Panel (legacy, kept for compatibility) ─────────────────────────────────── */
.control-panel { display: none; }

/* ─── Top info bar —— Z 型视觉模式布局 ─────────────── */
.top-info-bar {
  display: flex;
  flex-direction: column;
  padding: 12px 24px;
  background: oklch(100% 0 0 / 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid oklch(88% 0.008 55);
  flex-shrink: 0;
  z-index: 30;
  gap: 0;
}

/* Z 型通用行 */
.z-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.z-row-top {
  padding-bottom: 10px;
}
.z-row-bottom {
  padding-top: 10px;
}

/* Z 起点（左上 / 左下） */
.z-start {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
}

/* Z 终点（右上 / 右下） */
.z-end {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 行程标识区 */
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

/* 对角线进度条 —— Z 型的视觉脊柱 */
.z-diagonal {
  position: relative;
  padding: 0;
  margin: 0 -4px;
}
.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: oklch(90% 0.006 55);
  border-radius: 2px;
  overflow: hidden;
}
.progress-track::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    oklch(85% 0.008 55) 0px,
    oklch(85% 0.008 55) 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.5;
}
.progress-fill {
  height: 100%;
  background: oklch(58% 0.14 25);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  position: relative;
  z-index: 1;
}
.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: oklch(58% 0.14 25);
  box-shadow: 0 0 0 3px oklch(100% 0 0), 0 0 0 5px oklch(58% 0.14 25 / 0.2);
}

/* 进度状态 —— Z 左下 */
.progress-status {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.progress-fraction {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  font-weight: 700;
  color: oklch(22% 0.012 55);
}
.fraction-divider {
  color: oklch(70% 0.008 55);
  font-weight: 400;
  margin: 0 1px;
}
.progress-label {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: oklch(55% 0.01 55);
  text-transform: uppercase;
}

/* 点位流向 —— Z 底部中间，视觉落点 */
.z-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  font-size: 0.8125rem;
  min-width: 0;
}
.nav-point {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}
.nav-point.prev {
  background: oklch(92% 0.005 55);
  color: oklch(50% 0.01 55);
}
.nav-point.current {
  background: oklch(55% 0.15 25 / 0.1);
  color: oklch(52% 0.14 25);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px oklch(55% 0.15 25 / 0.15);
}
.nav-point.next {
  background: oklch(92% 0.005 55);
  color: oklch(50% 0.01 55);
}
.nav-point.origin,
.nav-point.terminus {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: oklch(65% 0.01 55);
  background: transparent;
  padding: 4px 8px;
}
.nav-point.placeholder {
  color: oklch(78% 0.008 55);
  background: transparent;
}
.nav-arrow {
  color: oklch(62% 0.13 25);
  font-size: 0.625rem;
  font-weight: 700;
  opacity: 0.7;
}

/* 百分比 —— Z 右下终点 */
.percent-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  font-weight: 700;
  color: oklch(58% 0.12 25);
  min-width: 40px;
  text-align: right;
  position: relative;
}

/* 地点徽章 */
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

/* 播放控制 */
.player-controls-mini {
  display: flex;
  align-items: center;
  gap: 6px;
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

/* ─── Bottom toolbar ──────────────────────────────── */
.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.bottom-toolbar > * {
  pointer-events: auto;
}
.toolbar-list {
  display: inline-flex;
  justify-content: center;
  align-items: flex-end;
  height: 40px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  margin: 0;
  padding: 10px;
  background-color: rgba(55, 66, 77, 0.25);
  list-style: none;
  backdrop-filter: blur(8px);
}
.toolbar-item {
  width: 40px;
  height: 40px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: oklch(99% 0 0);
}
.toolbar-icon-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  padding: 6px;
}

/* ─── Side overlay & panels ───────────────────────── */
.side-overlay {
  position: fixed;
  inset: 0;
  background: oklch(15% 0.01 55 / 0.35);
  z-index: 50;
  backdrop-filter: blur(3px);
}
.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: oklch(100% 0 0);
  z-index: 60;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px oklch(30% 0.01 55 / 0.1);
}
.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid oklch(88% 0.008 55);
  flex-shrink: 0;
}
.side-panel-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  font-weight: 700;
  color: oklch(22% 0.012 55);
}
.side-panel-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: oklch(96% 0.005 55);
  color: oklch(40% 0.012 55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}
.side-panel-close:hover {
  background: oklch(88% 0.008 55);
}
.side-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

/* Settings panel */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.setting-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(40% 0.012 55);
}

/* ─── Responsive ───────────────────────────────────── */
@media (max-width: 768px) {
  .trip-detail { flex-direction: column; min-height: 0; gap: 14px; height: auto; }
  .trip-detail.is-fullscreen { height: 100vh; }
  .map-container { min-height: 280px; max-height: 340px; border-radius: 14px; }
  #amap-container { height: 100%; min-height: 280px; }
  .control-panel { width: 100%; max-height: none; overflow-y: visible; padding: 16px 14px; border-radius: 14px; }
  .player-controls { flex-wrap: wrap; gap: 6px; }
  .speed-control { flex-wrap: wrap; }
  .speed-slider-wrap { width: 100%; }
}
</style>