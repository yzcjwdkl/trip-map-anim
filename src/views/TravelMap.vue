<template>
  <div class="travel-map">
    <div class="map-container">
      <div id="amap-container" ref="mapContainer"></div>
    </div>
    <div class="control-panel">
      <!-- 行程摘要 -->
      <div class="trip-summary">
        <div class="summary-title">📊 行程摘要</div>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{{ tripData.points.length }}</div>
            <div class="stat-label">地点</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tripStats.totalDistance > 1000 ? (tripStats.totalDistance / 1000).toFixed(0) + 'k' : tripStats.totalDistance.toFixed(0) }}</div>
            <div class="stat-label">总公里数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ tripStats.totalDuration }}</div>
            <div class="stat-label">总时长</div>
          </div>
        </div>
      </div>

      <div class="trip-info">
        <h2>{{ tripData.title }}</h2>
        <p class="trip-date">{{ tripData.date }}</p>
      </div>
      <div class="current-stop" v-if="currentPoint">
        <div class="stop-icon">{{ markerIcons[currentPoint.type] || '📍' }}</div>
        <div class="stop-info">
          <div class="stop-name">{{ currentPoint.name }}</div>
          <div class="stop-desc">{{ currentPoint.description }}</div>
        </div>
      </div>
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-text">{{ currentIndex }} / {{ tripData.points.length }}</div>
      </div>
      <div class="player-controls">
        <button class="btn btn-secondary" @click="resetTrip">⏮️ 重置</button>
        <button class="btn btn-primary" @click="togglePlay" :disabled="!mapReady">{{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}</button>
        <button class="btn btn-secondary" @click="nextStep">⏭️ 下一步</button>
      </div>
      <div class="speed-control">
        <span>速度：</span>
        <button v-for="s in speeds" :key="s" :class="['ctrl-btn', { active: currentSpeed === s }]" @click="currentSpeed = s">{{ s }}x</button>
        <button :class="['ctrl-btn', { active: enableMapRotation }]" @click="enableMapRotation = !enableMapRotation" style="margin-left: 8px">🧭 旋转</button>
      </div>
      <div class="stops-list">
        <h3>行程安排 <span class="point-count">({{ tripData.points.length }})</span></h3>
        <AddPointDialog @add="onAddPoint" :map-ready="mapReady" />
        <div
          v-for="(point, index) in tripData.points"
          :key="point.id"
          class="test-flex"
          :draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
          :class="{ 'drag-over': dragOverIndex === index, 'dragging': dragIndex === index }"
        >
          <!-- 点位行 -->
          <div class="stop-item" :class="{ visited: index < currentIndex, current: index === currentIndex }" @click="jumpTo(index)">
            <div class="drag-handle">⋮⋮</div>
            <div class="stop-number">{{ index + 1 }}</div>
            <div class="stop-details">
              <div class="stop-name">{{ point.name }}</div>
              <div class="stop-type">{{ getTypeName(point.type) }}</div>
            </div>
            <div class="stop-icon-small">{{ markerIcons[point.type] || '📍' }}</div>
            <button class="edit-point-btn" @click.stop="openEditDialog(index, point)" title="编辑">✎</button>
            <button class="delete-point-btn" @click.stop="deletePoint(index)" title="删除">✕</button>
          </div>
          <!-- 段间出行方式 -->
          <div v-if="index < tripData.points.length - 1" class="segment-travel-type" @click.stop="toggleSegmentTravelType(index)">
            <span :class="['travel-badge', point.travelTypeToHere]">
              {{ point.travelTypeToHere === 'drive' ? '🚗 驾车' : '✈️ 飞机' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑点位弹窗 -->
    <div class="dialog-overlay" v-if="showEditDialog" @click.self="closeEditDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>编辑点位</h3>
          <button class="close-btn" @click="closeEditDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="point-form">
            <div class="form-row">
              <label>名称</label>
              <input v-model="editForm.name" type="text" />
            </div>
            <div class="form-row">
              <label>类型</label>
              <select v-model="editForm.type">
                <option value="food">🍜 美食</option>
                <option value="attraction">🏛️ 景点</option>
                <option value="activity">🎉 活动</option>
                <option value="hotel">🏨 住宿</option>
                <option value="transport">🚗 交通</option>
              </select>
            </div>
            <div class="form-row">
              <label>描述</label>
              <input v-model="editForm.description" type="text" placeholder="简短描述（可选）" />
            </div>
            <div class="form-row coords-row">
              <label>坐标</label>
              <span class="coords">{{ editForm.position[0].toFixed(6) }}, {{ editForm.position[1].toFixed(6) }}</span>
            </div>
            <div class="form-row">
              <label>到这里</label>
              <select v-model="editForm.travelTypeToHere">
                <option value="fly">✈️ 飞机</option>
                <option value="drive">🚗 驾车</option>
              </select>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeEditDialog">取消</button>
          <button class="btn btn-primary" @click="saveEdit">✓ 保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { markerIcons, sampleTrip } from '../data/sampleTrip.js'
import AddPointDialog from '../components/AddPointDialog.vue'
import { getBearing, calcFitZoom, getSegmentDuration, interpolatePathCoord, buildTrailPath, makeArcPath, isPosInView, haversineDistance } from '../utils/mapUtils.js'

// 地图实例
let map = null
let AMap = null
let mainPolyline = null
let movingMarker = null
let trailLine = null
let traveledPath = []  // 累积已走路径，避免段末累积时重复追加
let allDotMarkers = []
let allLabelMarkers = []
let routeDirMap = {}
// arrival ring — 三层同心圆实现渐变
const DEFAULT_MARKER_ICON = '<div style="width:12px;height:12px;background:#667eea;border-radius:50%;display:inline-block;"></div>'
const INVISIBLE_MARKER_ICON = '<div style="width:12px;height:12px;background:transparent;border-radius:50%;display:inline-block;"></div>'
let arrivalRing1 = null
let arrivalRing2 = null
let arrivalRing3 = null
let arrivalRingAnimId = null
// ring anim params
let ringAnim = {
  active: false,
  startTime: 0,
  duration: 900,
  fromRadius: 6,
  toRadius: 24,
}
// 动画循环状态（全部放在闭包外，用 RAF 驱动）
let anim = {
  active: false,
  rafId: null,
  startTime: 0,
  duration: 0,
  to: null,
  toIdx: 0,
  departureIdx: 0,
  driving: null,
  zoomInterval: null,
  rotInterval: null,
  pendingStart: null,
}

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
  anim.pendingStart = null
  // 取消到达圆环动画
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
  ringAnim.active = false
  if (arrivalRing1) arrivalRing1.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
  if (arrivalRing2) arrivalRing2.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
  if (arrivalRing3) arrivalRing3.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
  // cancelAnim 在非播放态停止时重置累积路径
  if (!isPlaying.value) { traveledPath = []; return }
  // 动画内调用 cancelAnim（到达终点），先保护 departureIdx 再清空
  // 恢复 active=true，使 syncDots 能正确识别出发 dot；外层 cancelAnim 调用（startPlay）isPlaying 才刚被设为 true
  traveledPath = []
}

const mapReady = ref(false)

// 行程数据
const tripData = ref({
  ...sampleTrip,
  points: [...sampleTrip.points]
})
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentSpeed = ref(1)
const defaultTravelType = ref('fly')
const enableMapRotation = ref(false)
const speeds = [0.5, 1, 2, 4]
let animTimer = null

// 拖拽排序
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

// 编辑弹窗
const showEditDialog = ref(false)
const editingIndex = ref(-1)
const editForm = ref({ name: '', type: 'attraction', description: '', position: [0, 0], travelTypeToHere: 'fly' })

// 行程摘要计算
const tripStats = computed(() => {
  const pts = tripData.value.points
  if (pts.length < 2) return { totalDistance: 0, totalDuration: '--' }
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    total += haversineDistance(pts[i].position, pts[i + 1].position)
  }
  // 粗略估算：每100km算1小时
  const hours = Math.round(total / 100)
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return {
    totalDistance: Math.round(total),
    totalDuration: h > 0 ? `${h}小时${m > 0 ? m + '分' : ''}` : `${m}分钟`
  }
})

const currentPoint = computed(() => tripData.value.points ? tripData.value.points[currentIndex.value] : null)
const progressPercent = computed(() => tripData.value.points && tripData.value.points.length ? (currentIndex.value / tripData.value.points.length) * 100 : 0)

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

    map = new AMap.Map('amap-container', {
      zoom: 14,
      pitch: 45,
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      viewMode: '3D'
    })

    mainPolyline = new AMap.Polyline({
      strokeColor: '#667eea',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    map.add(mainPolyline)
    // 到达圆环初始化（三层同心圆，初始完全不可见）
    arrivalRing1 = new AMap.CircleMarker({
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      radius: 6,
      fillColor: 'rgba(255,255,255,0)',
      fillOpacity: 0,
      strokeColor: 'rgba(118,75,162,0)',
      strokeOpacity: 0,
      strokeWeight: 0,
      zIndex: 99
    })
    arrivalRing2 = new AMap.CircleMarker({
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      radius: 6,
      fillColor: 'rgba(255,255,255,0)',
      fillOpacity: 0,
      strokeColor: 'rgba(102,126,234,0)',
      strokeOpacity: 0,
      strokeWeight: 0,
      zIndex: 100
    })
    arrivalRing3 = new AMap.CircleMarker({
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      radius: 6,
      fillColor: 'rgba(255,255,255,0)',
      fillOpacity: 0,
      strokeColor: 'rgba(255,255,255,0)',
      strokeOpacity: 0,
      strokeWeight: 0,
      zIndex: 101
    })
    map.add(arrivalRing1)
    map.add(arrivalRing2)
    map.add(arrivalRing3)

    trailLine = new AMap.Polyline({
      strokeColor: '#764ba2',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    map.add(trailLine)

    tripData.value.points.forEach((point) => {
      const dot = new AMap.CircleMarker({
        center: point.position,
        radius: 6,
        fillColor: '#667eea',
        fillOpacity: 1,
        strokeWidth: 0,
        zIndex: 10
      })
      map.add(dot)
      allDotMarkers.push(dot)
    })

    tripData.value.points.forEach((point, index) => {
      const label = new AMap.Marker({
        position: point.position,
        offset: new AMap.Pixel(0, -35),
        content: '<div class="label-tag">' + (markerIcons[point.type] || '📍') + ' ' + point.name + '</div>',
        zIndex: 20
      })
      label.on('click', () => jumpTo(index))
      label.hide()
      map.add(label)
      allLabelMarkers.push(label)
    })

    movingMarker = new AMap.Marker({
      position: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      content: DEFAULT_MARKER_ICON,
      offset: new AMap.Pixel(-6, -6),
      zIndex: 100
    })
    map.add(movingMarker)

    if (tripData.value.points.length > 0) {
      // 初始化时只显示出发点 dot，其余隐藏
      allDotMarkers.forEach((dot, i) => { if (dot && i > 0) dot.hide() })
      mainPolyline && mainPolyline.setPath([tripData.value.points[0].position])
      trailLine && trailLine.setPath([tripData.value.points[0].position])
      triggerLabelAppear(allLabelMarkers[0])
    }

    mapReady.value = true

  } catch (e) {
    console.error('地图加载失败:', e)
  }
})

// ==================== 拖拽排序 ====================
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
  const pts = tripData.value.points
  const [moved] = pts.splice(dragIndex.value, 1)
  pts.splice(index, 0, moved)

  // 同步地图上的 markers
  const [movedDot] = allDotMarkers.splice(dragIndex.value, 1)
  allDotMarkers.splice(index, 0, movedDot)
  const [movedLabel] = allLabelMarkers.splice(dragIndex.value, 1)
  allLabelMarkers.splice(index, 0, movedLabel)

  // 拖拽排序后重建所有线条
  allDotMarkers.forEach((dot, i) => dot.setCenter(pts[i].position))
  allLabelMarkers.forEach((label, i) => label.setPosition(pts[i].position))
  const positions = pts.map(p => p.position)
  mainPolyline && mainPolyline.setPath(positions)
  trailLine && trailLine.setPath(positions)
  // 修正 currentIndex
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

// ==================== 编辑弹窗 ====================
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
function closeEditDialog() {
  showEditDialog.value = false
}
function saveEdit() {
  const idx = editingIndex.value
  if (idx < 0) return
  const pts = tripData.value.points
  const newPos = editForm.value.position
  pts[idx] = {
    ...pts[idx],
    name: editForm.value.name,
    type: editForm.value.type,
    description: editForm.value.description,
    travelTypeToHere: editForm.value.travelTypeToHere
  }
  // 更新地图
  allDotMarkers[idx].setCenter(newPos)
  allLabelMarkers[idx].setPosition(newPos)
  allLabelMarkers[idx].setContent('<div class="label-tag">' + (markerIcons[editForm.value.type] || '📍') + ' ' + editForm.value.name + '</div>')
  // 重建轨迹
  mainPolyline && mainPolyline.setPath(pts.map(p => p.position))
  closeEditDialog()
}

// ==================== dot 显示同步 ====================
// isPlaying 时：出发 dot + 已到达 dot（<= currentIndex）显示；非播放时：全部显示
function syncDots() {
  allDotMarkers.forEach((dot, i) => {
    if (!dot) return
    // departureIdx dot 始终在动画中保留（出发时可见，到达后也保留）
    const isDeparture = anim.active && i === anim.departureIdx
    const visible = !isPlaying.value || isDeparture || i <= currentIndex.value
    visible ? dot.show() : dot.hide()
  })
}

// ==================== 播放控制 ====================
function togglePlay() {
  isPlaying.value ? pausePlay() : startPlay()
}

function startPlay() {
  if (tripData.value.points.length === 0) return
  if (currentIndex.value >= tripData.value.points.length - 1) resetTrip()
  if (anim.pendingStart) { clearTimeout(anim.pendingStart); anim.pendingStart = null }
  cancelAnim()
  // cancelAnim 把 traveledPath 清空了，需要恢复「起点→当前索引」的已完成路径
  traveledPath = tripData.value.points.slice(0, currentIndex.value + 1).map(p => p.position)
  mainPolyline && mainPolyline.setPath(traveledPath)
  isPlaying.value = true
  syncDots()
  const curPos = tripData.value.points[currentIndex.value].position
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
  pausePlay()
  routeDirMap = {}
  currentIndex.value = 0
  traveledPath = []
  const defaultCenter = tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336]
  mainPolyline && mainPolyline.setPath([defaultCenter])
  trailLine && trailLine.setPath([defaultCenter])
  movingMarker && movingMarker.setPosition(defaultCenter)
  allLabelMarkers.forEach((l, i) => i === 0 ? triggerLabelAppear(l) : l.hide())
  allDotMarkers.forEach(dot => dot && dot.show())
  map && map.setCenter(defaultCenter)
  map && map.setZoom(14)
}

function nextStep() {
  pausePlay()
  if (currentIndex.value < tripData.value.points.length - 1) {
    const pts = tripData.value.points
    const prevIdx = currentIndex.value
    const newIdx = prevIdx + 1
    currentIndex.value = newIdx
    // 累积已走路径
    const segPath = [pts[prevIdx].position, pts[newIdx].position]
    traveledPath = [...traveledPath, ...segPath]
    mainPolyline && mainPolyline.setPath(traveledPath)
    const pos = pts[newIdx].position
    movingMarker && movingMarker.setPosition(pos)
    map && map.panTo(pos)
    triggerLabelAppear(allLabelMarkers[newIdx])
    if (allDotMarkers[newIdx]) allDotMarkers[newIdx].show()
  }
  syncDots()
}

function jumpTo(index) {
  if (tripData.value.points.length === 0) return
  pausePlay()
  allLabelMarkers.forEach((l, i) => i === index ? triggerLabelAppear(l) : l.hide())
  currentIndex.value = index
  // traveledPath 重置为起点到目标点的完整路径
  traveledPath = tripData.value.points.slice(0, index + 1).map(p => p.position)
  mainPolyline && mainPolyline.setPath(traveledPath)
  movingMarker && movingMarker.setPosition(tripData.value.points[index].position)
  map && map.panTo(tripData.value.points[index].position)
  if (allDotMarkers[index]) allDotMarkers[index].show()
  syncDots()
}

// ==================== 核心：规划 + 动画 ====================
function planAndAnimate() {
  if (!isPlaying.value || !map || !AMap) return
  if (currentIndex.value >= tripData.value.points.length - 1) { pausePlay(); return }

  const from = tripData.value.points[currentIndex.value].position
  const to = tripData.value.points[currentIndex.value + 1].position
  const prevIdx = currentIndex.value
  allLabelMarkers[prevIdx].hide()
  // label 在到达时才淡入（见 animLoop 到达处理）

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
        const segmentTravelType = tripData.value.points[currentIndex.value].travelTypeToHere || 'fly'
        if (segmentTravelType === 'fly') {
          animateSegment(makeArcPath(from, to, currentIndex.value, 30, routeDirMap), 'fly')
        } else {
          const driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME, extensions: 'all', hideMarkers: true })
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
      }, 400)
    })
  }

  if (!enableMapRotation.value) { setTimeout(doZoomStep, 400); return }

  const targetRotation = getBearing(from, to)
  map.setRotation(targetRotation)
  function waitRotationDone(callback) {
    if (!isPlaying.value) return
    const startTime = Date.now()
    anim.rotInterval = setInterval(() => {
      if (!isPlaying.value) { clearInterval(anim.rotInterval); anim.rotInterval = null; return }
      if (Math.abs(map.getRotation() - targetRotation) < 0.5) {
        clearInterval(anim.rotInterval); anim.rotInterval = null; setTimeout(callback, 400)
      } else if (Date.now() - startTime > 1500) {
        clearInterval(anim.rotInterval); anim.rotInterval = null; setTimeout(callback, 0)
      }
    }, 50)
  }
  waitRotationDone(() => { if (isPlaying.value) doZoomStep() })
}

// 沿指定路径动画 — 单 RAF 循环，时间轴驱动
function animateSegment(pathCoords, travelType) {
  if (!isPlaying.value || !pathCoords || pathCoords.length < 1) return
  const iconContent = travelType === 'drive'
    ? '<div style="font-size:24px">🚗</div>'
    : '<div style="font-size:24px">✈️</div>'
  movingMarker && movingMarker.setContent(iconContent)
  movingMarker && movingMarker.setOffset(new AMap.Pixel(-12, -12))
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
  trailLine && trailLine.setPath(buildTrailPath(pathCoords, eased))
  movingMarker && movingMarker.setPosition(pos)
  maybePan(pos)
  if (rawT >= 1) {
    // cancelAnim 会清空 anim.toIdx/departureIdx/active，先保存
    const arrivedIdx = anim.toIdx
    const prevDeparture = anim.departureIdx
    cancelAnim()
    anim.active = true  // cancelAnim 后恢复 active，syncDots 依赖它判断出发 dot
    anim.departureIdx = arrivedIdx  // 下一段出发 dot 为当前到达 dot
    trailLine && trailLine.setPath(pathCoords)
    // 触发到达动画 + 显示到达 dot/label + 隐藏 movingMarker
    if (isPlaying.value) {
      triggerArrivalRing(anim.to)
      if (allDotMarkers[arrivedIdx]) allDotMarkers[arrivedIdx].show()
      triggerLabelAppear(allLabelMarkers[arrivedIdx])
    }
    movingMarker && movingMarker.setContent(INVISIBLE_MARKER_ICON)
    animTimer = setTimeout(() => {
      if (!isPlaying.value) return
      // 累积路径：用 traveledPath 追加新段，避免重复追加上段全量路径
      traveledPath = [...traveledPath, ...pathCoords]
      mainPolyline && mainPolyline.setPath(traveledPath)
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

// ==================== arrival ring anim ====================
function triggerArrivalRing(pos) {
  if (!arrivalRing1 || !arrivalRing2 || !arrivalRing3) return
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
  ringAnim.active = true
  ringAnim.startTime = performance.now()
  const rings = [arrivalRing1, arrivalRing2, arrivalRing3]
  const configs = [
    { color: 'rgba(118,75,162,0.65)' },
    { color: 'rgba(102,126,234,0.55)' },
    { color: 'rgba(102,126,234,0.1)' }
  ]
  rings.forEach((ring, i) => {
    ring.setCenter(pos)
    ring.setRadius(ringAnim.fromRadius)
    ring.setOptions({ fillOpacity: 0, strokeOpacity: 0, strokeColor: configs[i].color, strokeWeight: 8 })
  })
  arrivalRingAnimId = requestAnimationFrame((t) => animRing(t))
}

function animRing(now) {
  if (!ringAnim.active) return
  const elapsed = now - ringAnim.startTime
  const rawT = Math.min(elapsed / ringAnim.duration, 1)
  const easeOut = t => 1 - Math.pow(1 - t, 3)
  const rings = [arrivalRing1, arrivalRing2, arrivalRing3]
  const delays = [0, 0.08, 0.18]
  const maxOpacities = [0.65, 0.55, 0.1]
  rings.forEach((ring, i) => {
    if (!ring) return
    const t = Math.max(0, Math.min(1, easeOut((rawT - delays[i]) / (1 - delays[i]))))
    const radius = ringAnim.fromRadius + (ringAnim.toRadius - ringAnim.fromRadius) * t
    const opacity = Math.max(0, maxOpacities[i] * (1 - rawT))
    ring.setRadius(Math.max(radius, 0))
    ring.setOptions({ strokeOpacity: opacity })
  })
  if (rawT >= 1) {
    ringAnim.active = false
    rings.forEach(ring => ring && ring.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' }))
    arrivalRingAnimId = null
  } else {
    arrivalRingAnimId = requestAnimationFrame((t) => animRing(t))
  }
}

// ==================== label 显示 ====================
function triggerLabelAppear(label) {
  if (!label) return
  label.show()
  // 先瞬间透明，再触发 CSS fade-in 动画
  const el = label.getContentDom()
  if (el) {
    el.style.opacity = '0'
    el.style.transition = 'none'
    // rAF 确保浏览器下一帧重绘（不用 setTimeout 避免延迟）
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
  const newPoint = {
    id: Date.now(),
    name: point.name,
    position: point.position,
    type: point.type,
    description: point.description || '',
    travelTypeToHere: defaultTravelType.value
  }
  tripData.value.points.push(newPoint)
  if (map && AMap && movingMarker) {
    const dot = new AMap.CircleMarker({
      center: newPoint.position,
      radius: 6,
      fillColor: '#667eea',
      fillOpacity: 1,
      strokeWidth: 0,
      zIndex: 10
    })
    dot.setMap(map)
    // 播放中新增的点：若在当前点之后则隐藏
    const newIdx = tripData.value.points.length - 1
    if (isPlaying.value && newIdx > currentIndex.value) dot.hide()
    allDotMarkers.push(dot)
    const label = new AMap.Marker({
      position: newPoint.position,
      offset: new AMap.Pixel(0, -35),
      content: '<div class="label-tag">' + (markerIcons[newPoint.type] || '📍') + ' ' + newPoint.name + '</div>',
      zIndex: 20
    })
    label.on('click', () => {
      const idx = tripData.value.points.findIndex(p => p.id === newPoint.id)
      if (idx >= 0) jumpTo(idx)
    })
    label.hide()
    label.setMap(map)
    allLabelMarkers.push(label)
  }
}

function deletePoint(index) {
  if (tripData.value.points.length <= 1) { alert('至少保留一个点位'); return }
  if (!confirm('确定删除该点位？')) return
  // 解绑 label click listener 再移除
  if (allLabelMarkers[index]) {
    allLabelMarkers[index].off && allLabelMarkers[index].off('click')
    allLabelMarkers[index].setMap(null)
    allLabelMarkers.splice(index, 1)
  }
  allDotMarkers[index] && allDotMarkers[index].setMap(null)
  allDotMarkers.splice(index, 1)
  tripData.value.points.splice(index, 1)
  mainPolyline && mainPolyline.setPath(tripData.value.points.map(p => p.position))
  if (currentIndex.value >= tripData.value.points.length) currentIndex.value = tripData.value.points.length - 1
}

function toggleSegmentTravelType(index) {
  tripData.value.points[index].travelTypeToHere =
    tripData.value.points[index].travelTypeToHere === 'fly' ? 'drive' : 'fly'
}

function getTypeName(type) {
  const names = { food: '🍜 美食', attraction: '🏛️ 景点', activity: '🎉 活动', hotel: '🏨 住宿', transport: '🚗 交通' }
  return names[type] || '📍'
}

onUnmounted(() => {
  pausePlay()
  cancelAnim()
  // 解绑所有 label click listeners
  allLabelMarkers.forEach(l => l.off && l.off('click'))
  if (map) {
    map.off && map.off()
    map.destroy()
  }
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
  ringAnim.active = false
  if (arrivalRing1) arrivalRing1.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
  if (arrivalRing2) arrivalRing2.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
  if (arrivalRing3) arrivalRing3.setOptions({ strokeOpacity: 0, fillOpacity: 0, strokeColor: 'transparent' })
})
</script>

<style scoped>
/* ===== 响应式布局 ===== */
.travel-map {
  display: flex;
  gap: 24px;
  height: calc(100vh - 140px);
}
.map-container {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  min-width: 0;
}
#amap-container { width: 100%; height: 100%; }
.control-panel {
  width: 380px;
  flex-shrink: 0;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow-y: auto;
  max-height: 100%;
}

/* ===== 行程摘要 ===== */
.trip-summary {
  background: linear-gradient(135deg, #667eea11, #764ba211);
  border: 1px solid #667eea22;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.summary-title { font-size: 12px; color: #888; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
.summary-stats { display: flex; gap: 0; }
.stat-item { flex: 1; text-align: center; }
.stat-item + .stat-item { border-left: 1px solid #667eea22; }
.stat-value { font-size: 20px; font-weight: 700; color: #667eea; }
.stat-label { font-size: 11px; color: #999; margin-top: 2px; }

/* ===== 通用面板元素 ===== */
.trip-info { margin-bottom: 16px; }
.trip-info h2 { margin: 0 0 4px; font-size: 20px; color: #333; }
.trip-date { margin: 0; color: #888; font-size: 14px; }
.current-stop { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #667eea22, #764ba222); padding: 14px; border-radius: 12px; margin-bottom: 16px; }
.stop-icon { font-size: 28px; }
.stop-info { flex: 1; }
.stop-name { font-weight: 600; font-size: 15px; color: #333; }
.stop-desc { font-size: 12px; color: #666; margin-top: 2px; }
.progress-section { margin-bottom: 16px; }
.progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s; }
.progress-text { text-align: center; font-size: 12px; color: #888; margin-top: 4px; }
.player-controls { display: flex; gap: 8px; margin-bottom: 16px; }
.btn { flex: 1; padding: 10px 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f0f0f0; color: #666; }
.btn-secondary:hover { background: #e0e0e0; }
.speed-control { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; font-size: 13px; color: #666; flex-wrap: wrap; }
.ctrl-btn { padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.ctrl-btn.active { background: #667eea; color: white; border-color: #667eea; }
.ctrl-btn:hover:not(.active) { border-color: #667eea; }

/* ===== 点位列表 ===== */
.stops-list h3 { margin: 0 0 8px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.stop-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  width: calc(100% - 0px);
}
.stop-item:hover { background: #f8f9fa; }
.stop-item.visited { opacity: 0.6; }
.stop-item.current { background: linear-gradient(135deg, #667eea22, #764ba222); border-left: 3px solid #667eea; }
.drag-handle { color: #ccc; font-size: 14px; cursor: grab; flex-shrink: 0; padding: 0 2px; user-select: none; }
.drag-handle:active { cursor: grabbing; }
.stop-number { width: 24px; height: 24px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #666; flex-shrink: 0; }
.stop-item.current .stop-number, .stop-item.visited .stop-number { background: #667eea; color: white; }
.stop-details { flex: 1; min-width: 0; }
.stop-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop-type { font-size: 11px; color: #999; }
.stop-icon-small { font-size: 16px; flex-shrink: 0; }
.point-count { font-size: 11px; color: #999; font-weight: normal; }
.edit-point-btn {
  background: none; border: none; color: #ccc; font-size: 13px; cursor: pointer;
  padding: 3px; border-radius: 50%; width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
}
.edit-point-btn:hover { background: #eef; color: #667eea; }
.delete-point-btn {
  background: none; border: none; color: #ccc; font-size: 13px; cursor: pointer;
  padding: 3px; border-radius: 50%; width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
}
.delete-point-btn:hover { background: #fee; color: #e33; }
.segment-travel-type { position: relative; height: 8px; margin: 0; }
.travel-badge {
  display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 11px; cursor: pointer;
  border: 1px solid transparent; white-space: nowrap;
  position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
  transition: all 0.2s;
}
.travel-badge.fly { background: #e8f0fe; color: #1a73e8; }
.travel-badge.fly:hover { background: #d0e1fd; }
.travel-badge.drive { background: #fef3e2; color: #e37400; }
.travel-badge.drive:hover { background: #fde9cc; }
.test-flex { display: flex; flex-direction: column; margin-bottom: 6px; padding-bottom: 22px; position: relative; transition: opacity 0.2s; }
.test-flex.dragging { opacity: 0.4; }
.test-flex.drag-over { border-top: 2px solid #667eea; }

/* ===== 编辑弹窗 ===== */
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center;
  justify-content: center; z-index: 1000;
}
.dialog {
  background: white; border-radius: 16px; width: 460px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid #eee;
}
.dialog-header h3 { margin: 0; font-size: 18px; color: #333; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #999; padding: 4px; }
.close-btn:hover { color: #333; }
.dialog-body { padding: 20px 24px; flex: 1; overflow-y: auto; }
.point-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; align-items: center; gap: 12px; }
.form-row label { width: 56px; font-size: 13px; color: #666; flex-shrink: 0; }
.form-row input, .form-row select {
  flex: 1; padding: 8px 12px; border: 1px solid #ddd;
  border-radius: 8px; font-size: 13px; outline: none;
}
.form-row input:focus, .form-row select:focus { border-color: #667eea; }
.coords { font-size: 12px; color: #999; font-family: monospace; }
.dialog-footer {
  display: flex; gap: 12px; padding: 16px 24px 20px; border-top: 1px solid #eee;
}
.dialog-footer .btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; border: none; cursor: pointer; }
.dialog-footer .btn-secondary { background: #f0f0f0; color: #666; }
.dialog-footer .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }

/* ===== 响应式：移动端 ===== */
@media (max-width: 768px) {
  .travel-map {
    flex-direction: column;
    height: auto;
    gap: 16px;
  }
  .map-container {
    height: 55vw;
    min-height: 280px;
  }
  #amap-container { height: 100%; }
  .control-panel {
    width: 100%;
    max-height: none;
    overflow-y: visible;
    padding: 16px;
  }
  .summary-stats { }
  .stop-name { font-size: 14px; }
  .dialog { width: calc(100vw - 32px); }
}
</style>
