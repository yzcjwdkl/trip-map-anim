<template>
  <div class="trip-detail" :class="{ 'is-fullscreen': fullscreen }">
    <div class="map-container" :class="{ 'is-fullscreen': fullscreen }">
      <el-button class="fullscreen-btn" link @click="emit('toggle-fullscreen')" title="全屏">⛶</el-button>
      <div id="amap-container" ref="mapContainer"></div>

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

    <div class="control-panel" v-show="!fullscreen">
      <div class="detail-back-bar">
        <span class="detail-trip-name">{{ trip.name }}</span>
        <el-button link @click="emit('back')">← 返回</el-button>
      </div>

      <div class="status-bar" v-if="currentPoint">
        <div class="status-main">
          <div class="status-icon">{{ markerIcons[currentPoint.type] || '📍' }}</div>
          <div class="status-info">
            <div class="status-name">{{ currentPoint.name }}</div>
            <div class="status-desc">{{ currentPoint.description }}</div>
          </div>
        </div>
        <div class="status-count">
          <span class="count-num">{{ trip.points.length }}</span>
          <span class="count-unit">个地点</span>
        </div>
        <AddPointDialog @add="onAddPoint" :map-ready="mapReady" class="add-in-status" />
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-text">
          <span>当前进度</span>
          <span>{{ currentIndex + 1 }} / {{ trip.points.length }}</span>
        </div>
      </div>

      <div class="controls-row">
        <div class="player-controls">
          <el-button size="small" @click="resetTrip">重置</el-button>
          <el-button type="primary" size="small" :disabled="!mapReady" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</el-button>
          <el-button size="small" @click="nextStep">下一步</el-button>
        </div>
      </div>

      <div class="speed-control">
        <span class="speed-label">速度</span>
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

      <div class="stops-list">
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

        <div class="stops-timeline" v-if="!detailEmpty">
          <div
            v-for="(point, index) in trip.points"
            :key="point.id"
            class="stop-row"
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
                  <span class="stop-emoji">{{ markerIcons[point.type] || '📍' }}</span>
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
                <span class="travel-text">{{ point.travelTypeToHere === 'drive' ? '驾车' : '飞机' }}</span>
              </div>
            </div>
          </div>
        </div>

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
          <AddPointDialog @add="onAddPoint" :map-ready="mapReady" class="add-in-empty" />
        </div>
      </div>
    </div>

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

const props = defineProps({
  fullscreen: Boolean,
  tripId: Number
})
const emit = defineEmits(['toggle-fullscreen', 'back'])

const { currentDetailTrip, detailEmpty: storeDetailEmpty, getTypeName, addPointToTrip, deletePointFromTrip, batchDeletePointsFromTrip, updatePointInTrip, movePointInTrip, toggleSegmentTravelType: storeToggleSegmentTravelType } = useTripStore()

// 当前详情页直接操作 props 传入的 trip，但我们需要拿到引用
const trip = computed(() => currentDetailTrip.value)
const detailEmpty = computed(() => storeDetailEmpty.value)

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
      zoom: 14, pitch: 45, center: initialCenter, viewMode: '3D'
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
.trip-detail {
  display: flex;
  gap: 24px;
  width: 100%;
  height: calc(100vh - 96px);
  overflow: hidden;
}
.trip-detail.is-fullscreen {
  height: 100vh;
}
.map-container {
  flex: 1;
  min-height: 0;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
  position: relative;
  border: 1px solid rgba(0,0,0,0.04);
}
.map-container.is-fullscreen {
  border-radius: 0 !important;
  box-shadow: none !important;
  border: none !important;
  min-height: 100vh !important;
  max-height: 100vh !important;
  height: 100vh !important;
  flex: 1 !important;
  position: relative;
}
.map-container.is-fullscreen #amap-container {
  height: 100vh !important;
}

/* ─── 地图加载遮罩 ─── */
.map-loading {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: oklch(98% 0.004 290);
  pointer-events: none;
}

.loading-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: oklch(55% 0.18 290);
  animation: loadingPulse 1.2s ease-in-out infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes loadingPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%            { transform: scale(1);   opacity: 1;   }
}

.loading-text {
  font-family: 'Noto Sans SC', -apple-system, sans-serif;
  font-size: 0.75rem;
  color: oklch(60% 0.02 290);
  letter-spacing: 0.06em;
}

.ring-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
}
.fullscreen-btn {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 20;
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.fullscreen-btn:hover {
  background: white;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: scale(1.05);
}
#amap-container { width: 100%; height: 100%; min-height: 0; }

/* ─── 控制面板 ─── */
.control-panel {
  width: 360px;
  flex-shrink: 0;
  background: oklch(99.5% 0.003 80);
  border-radius: 1rem;
  padding: 20px;
  border: 1px solid oklch(88% 0.01 80);
  box-shadow: 0 2px 16px oklch(25% 0.01 80 / 0.04), 0 1px 4px oklch(25% 0.01 80 / 0.03);
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* ─── 顶部返回栏 ─── */
.detail-back-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 2px 4px 14px;
  border-bottom: 1px solid oklch(90% 0.008 80);
  margin-bottom: 14px;
}
.detail-trip-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9375rem; font-weight: 600;
  color: oklch(25% 0.02 290); letter-spacing: 0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.detail-back-bar .el-button {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem; font-weight: 500;
  color: oklch(55% 0.18 290);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.detail-back-bar .el-button:hover { color: oklch(48% 0.18 290); }

/* ─── 状态栏（当前点位） ─── */
.status-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: oklch(96% 0.008 290 / 0.5);
  border: 1px solid oklch(88% 0.02 290);
  border-radius: 0.75rem;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}
.status-bar:hover {
  border-color: oklch(75% 0.06 290);
  box-shadow: 0 2px 8px oklch(65% 0.06 290 / 0.08);
}
.status-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.status-icon {
  font-size: 16px; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: oklch(72% 0.12 290);
  border-radius: 0.6rem; flex-shrink: 0;
}
.status-info { flex: 1; min-width: 0; }
.status-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 600; font-size: 0.8125rem;
  color: oklch(25% 0.02 290);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.status-desc {
  font-size: 0.6875rem; color: oklch(55% 0.02 290);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.status-count {
  display: flex; flex-direction: column; align-items: flex-end;
  flex-shrink: 0; margin-right: 6px;
}
.count-num {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 1.375rem; font-weight: 700;
  color: oklch(55% 0.18 290); line-height: 1;
  letter-spacing: -0.03em;
}
.count-unit {
  font-size: 0.625rem; color: oklch(55% 0.02 290);
  margin-top: 2px; letter-spacing: 0.04em;
}
.add-in-status { flex-shrink: 0; }

/* ─── 进度条 ─── */
.progress-section { margin-bottom: 16px; }
.progress-bar {
  height: 3px; background: oklch(92% 0.01 290);
  border-radius: 2px; overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, oklch(65% 0.14 290), oklch(55% 0.18 290));
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.progress-text {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.6875rem; color: oklch(55% 0.02 290);
  margin-top: 8px; letter-spacing: 0.03em;
}
.progress-text span:last-child {
  font-weight: 700; color: oklch(55% 0.18 290);
}

/* ─── 操作按钮行 ─── */
.controls-row { margin-bottom: 12px; }
.player-controls { display: flex; gap: 6px; flex-wrap: wrap; }
.player-controls .el-button {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem; font-weight: 500;
  border-radius: 0.5rem; border-color: oklch(88% 0.02 290);
  color: oklch(30% 0.02 290); background: transparent;
  letter-spacing: 0.02em;
}
.player-controls .el-button:hover {
  border-color: oklch(55% 0.18 290); color: oklch(55% 0.18 290);
}
.player-controls .el-button--primary {
  background: oklch(55% 0.18 290); border-color: oklch(55% 0.18 290);
  color: oklch(99% 0.01 290);
}
.player-controls .el-button--primary:hover {
  background: oklch(48% 0.18 290); border-color: oklch(48% 0.18 290);
  color: oklch(99% 0.01 290);
}

/* ─── 速度控制 ─── */
.speed-control {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px; padding-top: 10px;
  border-top: 1px solid oklch(90% 0.008 290);
}
.speed-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 500; color: oklch(55% 0.02 290);
  font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em;
  flex-shrink: 0; padding-top: 6px;
}
.speed-slider-wrap { flex: 1; min-width: 0; }
.speed-slider-wrap :deep(.el-slider__runway) { background: oklch(88% 0.01 290); border-radius: 2px; }
.speed-slider-wrap :deep(.el-slider__bar) {
  background: linear-gradient(90deg, oklch(65% 0.14 290), oklch(55% 0.18 290));
  border-radius: 2px;
}
.speed-slider-wrap :deep(.el-slider__button) {
  width: 14px; height: 14px; background: oklch(99% 0.01 290);
  border: 2px solid oklch(55% 0.18 290);
  border-radius: 50%;
  box-shadow: 0 0 0 3px oklch(55% 0.18 290 / 0.15);
}
.speed-slider-wrap :deep(.el-slider__stop) { background-color: oklch(65% 0.14 290); }
.speed-slider-wrap :deep(.el-slider__marks-text) {
  font-size: 11px; color: oklch(55% 0.02 290); font-weight: 500;
}
.speed-slider-wrap :deep(.el-slider__marks-text-active) {
  color: oklch(55% 0.18 290); font-weight: 700;
}

/* ─── 途经点列表 ─── */
.stops-list { flex: 1; overflow-y: auto; padding-right: 2px; min-height: 0; }
.stops-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px; margin-bottom: 12px;
}
.stops-header-left { display: flex; align-items: center; gap: 8px; }
.stops-title {
  font-size: 0.625rem; font-weight: 600; color: oklch(55% 0.02 290);
  text-transform: uppercase; letter-spacing: 0.1em;
}
.stops-count {
  font-size: 0.625rem; font-weight: 600; color: oklch(65% 0.02 290);
  background: oklch(93% 0.008 290);
  padding: 2px 8px; border-radius: 20px;
  border: 1px solid oklch(88% 0.01 290);
}

.stops-timeline { display: flex; flex-direction: column; }
.stop-row { display: flex; gap: 12px; transition: opacity 0.15s ease; }
.stop-row.dragging { opacity: 0.3; }
.stop-row.drag-over .stop-content {
  border-color: oklch(65% 0.11 290);
  background: oklch(65% 0.11 290 / 0.04);
}

.stop-timeline {
  display: flex; flex-direction: column; align-items: center;
  width: 16px; flex-shrink: 0; padding-top: 14px;
}
.timeline-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: oklch(88% 0.01 290);
  border: 2px solid oklch(98% 0.005 290);
  flex-shrink: 0; transition: all 0.2s ease; z-index: 1;
}
.timeline-dot.active {
  width: 12px; height: 12px;
  background: oklch(55% 0.18 290);
  box-shadow: 0 0 0 3px oklch(55% 0.18 290 / 0.15);
}
.timeline-dot.visited { background: oklch(78% 0.02 290); }
.timeline-line {
  width: 2px; flex: 1; min-height: 28px;
  background: oklch(88% 0.01 290);
  margin: 4px 0; border-radius: 1px; transition: background 0.2s ease;
}
.timeline-line.visited { background: oklch(78% 0.02 290); }

.stop-content {
  flex: 1; display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-radius: 0.625rem;
  border: 1px solid transparent; cursor: pointer;
  transition: all 0.15s ease; margin-bottom: 8px; background: transparent;
}
.stop-content:hover {
  background: oklch(97% 0.005 290);
  border-color: oklch(90% 0.01 290);
}
.stop-content.visited { opacity: 0.45; }
.stop-content.current {
  background: oklch(65% 0.11 290 / 0.06);
  border-color: oklch(75% 0.05 290 / 0.2);
}

.stop-main { flex: 1; min-width: 0; }
.stop-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.8125rem; font-weight: 600;
  color: oklch(25% 0.02 290);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stop-emoji { font-size: 14px; flex-shrink: 0; }
.stop-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.stop-type {
  font-size: 0.625rem; color: oklch(55% 0.02 290);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.stop-desc { font-size: 0.625rem; color: oklch(65% 0.02 290); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.stop-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s ease; }
.stop-content:hover .stop-actions { opacity: 1; }
.action-btn {
  width: 26px; height: 26px; border: none; background: transparent;
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: oklch(65% 0.02 290);
  transition: all 0.15s ease;
}

.travel-toggle {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px;
  background: oklch(97% 0.005 290);
  border: 1px solid oklch(88% 0.01 290);
  border-radius: 0.5rem; cursor: pointer;
  transition: all 0.15s ease; white-space: nowrap; flex-shrink: 0;
}
.travel-toggle:hover {
  background: oklch(93% 0.008 290); border-color: oklch(78% 0.02 290);
}
.travel-icon { font-size: 12px; }
.travel-text { font-size: 0.6875rem; font-weight: 500; color: oklch(30% 0.02 290); }

/* ─── 空状态 ─── */
.stops-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 24px; min-height: 260px;
}
.empty-illustration {
  position: relative; width: 120px; height: 60px;
  margin-bottom: 32px; display: flex; align-items: center; justify-content: center;
}
.empty-dot {
  position: absolute; width: 12px; height: 12px; border-radius: 50%;
  background: oklch(72% 0.12 290 / 0.25);
  border: 2px solid oklch(72% 0.12 290 / 0.4);
}
.dot-1 { left: 20px; top: 50%; transform: translateY(-50%); animation: float-dot 3s ease-in-out infinite; }
.dot-2 { left: 50%; top: 50%; transform: translate(-50%, -50%); animation: float-dot-center 3s ease-in-out infinite 0.4s; }
.dot-3 { right: 20px; top: 50%; transform: translateY(-50%); animation: float-dot 3s ease-in-out infinite 0.8s; }
@keyframes float-dot {
  0%, 100% { transform: translateY(-50%); opacity: 0.4; }
  50% { transform: translateY(-60%); opacity: 0.8; }
}
@keyframes float-dot-center {
  0%, 100% { transform: translate(-50%, -50%); opacity: 0.4; }
  50% { transform: translate(-50%, -60%); opacity: 0.8; }
}
.empty-dash-line {
  position: absolute; top: 50%; left: 32px; right: 32px; height: 0;
  border-top: 2px dashed oklch(72% 0.12 290 / 0.3);
  transform: translateY(-50%);
}
.empty-content { text-align: center; margin-bottom: 44px; }
.empty-badge {
  display: inline-block; font-size: 0.625rem; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: oklch(55% 0.18 290);
  background: oklch(55% 0.18 290 / 0.08);
  padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;
  border: 1px solid oklch(55% 0.18 290 / 0.15);
}
.empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.9375rem; font-weight: 600;
  color: oklch(25% 0.02 290); margin: 0 0 8px 0;
}
.empty-hint {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem; color: oklch(55% 0.02 290);
  margin: 0; line-height: 1.6; max-width: 200px;
}
.add-in-empty :deep(.add-point-btn) {
  padding: 10px 20px; font-size: 0.8125rem;
  border-radius: 0.625rem;
}

/* ─── 点位表单 ─── */
.point-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem; color: oklch(40% 0.02 290); font-weight: 500;
}
.coords {
  font-size: 0.75rem; color: oklch(55% 0.02 290);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  padding: 8px 12px; background: oklch(97% 0.005 290);
  border-radius: 0.375rem; display: block;
  border: 1px solid oklch(90% 0.008 290);
}

/* ─── 移动中的点 ─── */
.moving-dot { position: absolute; left: 0; top: 0; width: 20px; height: 20px; pointer-events: none; z-index: 50; display: none; }
.moving-dot.visible { display: block; }
.dot-ring {
  position: absolute; left: 50%; top: 50%; width: 20px; height: 20px;
  transform: translate(-50%, -50%); border-radius: 50%;
  border: 2px solid oklch(55% 0.18 290 / 0.4);
  animation: dot-ping 1.5s ease-out infinite;
}
.dot-core {
  position: absolute; left: 50%; top: 50%; width: 8px; height: 8px;
  transform: translate(-50%, -50%); border-radius: 50%;
  background: oklch(55% 0.18 290);
}
@keyframes dot-ping {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
}

/* ─── 覆盖全局 label-tag 样式 ─── */
:deep(.label-tag) {
  background: oklch(55% 0.18 290) !important;
  color: oklch(99% 0.01 290) !important;
  box-shadow: 0 2px 10px oklch(45% 0.12 290 / 0.25) !important;
  text-shadow: none !important;
}

/* responsive */
@media (max-width: 768px) {
  .trip-detail { flex-direction: column; min-height: 0; gap: 16px; height: auto; }
  .trip-detail.is-fullscreen { height: 100vh; }
  .map-container { min-height: 300px; max-height: 380px; border-radius: 16px; }
  #amap-container { height: 100%; min-height: 300px; }
  .control-panel { width: 100%; max-height: none; overflow-y: visible; padding: 16px; border-radius: 16px; }
  .player-controls { gap: 8px; }
  .stop-name { font-size: 14px; }
}
</style>
