<template>
  <div class="travel-map">
    <div class="map-container">
      <div id="amap-container" ref="mapContainer"></div>
      <svg class="ring-overlay" ref="ringOverlay" style="display:none">
        <defs>
          <!-- 黑色外圆 = 遮罩（隐藏），白色内圆 = 可见。配合 innerR 实现"填满消失" -->
          <mask :id="'rm-' + uid">
            <rect width="100%" height="100%" fill="white"/>
            <circle :cx="ringState.screenX" :cy="ringState.screenY" :r="ringState.outerR" fill="black"/>
            <circle :cx="ringState.screenX" :cy="ringState.screenY" :r="ringState.innerR" fill="white"/>
          </mask>
        </defs>
        <!-- 单光环：外圈扩张 + 内圈填满 + 透明度渐变 -->
        <circle
          :cx="ringState.screenX" :cy="ringState.screenY" :r="ringState.outerR"
          fill="none"
          :stroke="'rgba(102,126,234,' + ringState.opacity + ')'"
          :stroke-width="ringState.strokeW"
          :mask="'url(#rm-' + uid + ')'"
        />
      </svg>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { markerIcons, sampleTrip } from '../data/sampleTrip.js'
import AddPointDialog from '../components/AddPointDialog.vue'
import { getBearing, calcFitZoom, getSegmentDuration, interpolatePathCoord, buildTrailPath, makeArcPath, isPosInView, haversineDistance } from '../utils/mapUtils.js'

// 地图实例
let map = null
let AMap = null
let mainPolyline = null
// ==================== marker icon（AMap.Icon + SVG）====================
import flySvgUrl from '../assets/fj.svg'
import carSvgUrl from '../assets/car.svg'
let flyIcon = null
let carIcon = null

let movingMarker = null
let trailLine = null
let traveledPath = []  // 累积已走路径，避免段末累积时重复追加
let allDotMarkers = []
let allLabelMarkers = []
let routeDirMap = {}
// arrival ring — SVG 单光环实现
const INVISIBLE_MARKER_ICON = '<div style="width:12px;height:12px;background:transparent;border-radius:50%;display:inline-block;"></div>'
let arrivalRingAnimId = null
const uid = Date.now()
// ringState：驱动 SVG 单光环 overlay
const ringState = ref({
  active: false,
  screenX: 0,
  screenY: 0,
  outerR: 0,   // 外圈半径（6 → 32）
  innerR: 0,   // 内圈半径（0 → outerR，内圈填满实现"消失"）
  opacity: 0,  // 透明度 0.65 → 0
  strokeW: 8,  // stroke 宽度
})
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

/**
 * cancelAnim — 取消当前动画段
 *   - 停止 RAF 循环、zoom/rotation interval
 *   - 关闭 driving 搜索
 *   - 关闭 SVG 光环（ringState.active=false，隐藏 overlay）
 *   - 若暂停（非播放态）：清空 traveledPath；若播放中调用（到达终点场景）：保留 traveledPath
 */
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
  // 取消到达圆环动画（SVG overlay）
  ringState.value.active = false
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
  const svgEl = document.querySelector('.ring-overlay')
  if (svgEl) svgEl.style.display = 'none'
  if (!isPlaying.value) { traveledPath = []; return }
  // 播放中调用 cancelAnim（到达终点），traveledPath 保留由外层累积
  return
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
/**
 * 初始化高德地图，创建 mainPolyline、trailLine
 * 遍历所有点位创建 dot 标记和 label 标记（点击跳转）
 * 地图加载完成后设置 mapReady=true 解锁播放按钮
 */
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
    // 到达圆环改用 SVG overlay 实现（见模板 ring-overlay），无需在此初始化

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
      icon: flyIcon,
      offset: new AMap.Pixel(-16, -16),
      zIndex: 100
    })
    map.add(movingMarker)

    // 创建飞机和汽车的 AMap.Icon（使用 assets 中的 SVG）
    flyIcon = new AMap.Icon({ size: new AMap.Size(32, 32), image: flySvgUrl, imageSize: new AMap.Size(32, 32) })
    carIcon = new AMap.Icon({ size: new AMap.Size(32, 32), image: carSvgUrl, imageSize: new AMap.Size(32, 32) })

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
/**
 * HTML5 拖拽排序：onDragStart 记录索引 → onDragOver 标记位置 → onDrop 交换数组并同步地图标记
 */
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
/**
 * openEditDialog — 打开编辑弹窗，填充当前点位数据到 editForm
 * closeEditDialog — 关闭弹窗
 * saveEdit        — 保存：更新点位数据 + 同步地图标记 + 重建主轨迹
 */
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
/**
 * syncDots — 控制所有 dot 的显示/隐藏
 * - 播放中：出发 dot（departureIdx）+ 已到达 dot（<= currentIndex）显示，其他隐藏
 * - 非播放：全部显示
 * 目的：动画进行中 dot 不会消失，到达后才显示新 dot
 */
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
/**
 * togglePlay — 播放/暂停切换
 * startPlay  — 开始播放：
 *   1. cancelAnim 清理上一段动画
 *   2. 恢复 traveledPath（起点→currentIndex 的已完成路径）
 *   3. 若当前点位不在视野内则平移，等待后再开始规划
 *   4. 调用 planAndAnimate 开始第一段
 * pausePlay  — 暂停：cancelAnim + isPlaying=false + 清理 pending timer
 * resetTrip  — 重置到起点：清空所有状态，重建初始画面
 * nextStep   — 手动下一步（非自动播放）：单段推进，累积 traveledPath
 * jumpTo     — 跳转任意点位：重置 traveledPath 到该点，触发 label 淡入
 */
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
/**
 * planAndAnimate — 规划下一段动画
 *   1. 若启用地图旋转：等待 rotation 完成后再 zoom
 *   2. 若不启用：直接 zoom
 *   3. zoom 到位后根据 travelType 选择路径：
 *      - fly（飞机）：用贝塞尔弧线 makeArcPath
 *      - drive（驾车）：调用高德驾车 API，拿到路线节点后 animateSegment
 *
 * ─── 点位A → 点位B 完整事件链 ───
 *
 * 【第一阶段：出发准备】
 * planAndAnimate()
 *   ① allLabelMarkers[prevIdx].hide()     → 隐藏出发点 label
 *   ② map.setRotation(targetRotation)      → 地图旋转对准目标方向（可选）
 *   ③ waitRotationDone() — interval 检测旋转到位
 *   ④ map.setZoom(targetZoom)             → 调整视野 zoom（两点跨度大则放大）
 *   ⑤ waitZoomDone() — interval 检测 zoom 到位
 *   ⑥ map.setCenter(from)                 → 中心对准出发点
 *   ⑦ 400ms 延迟
 *   ⑧ 根据 travelType:
 *      - fly:   animateSegment(makeArcPath(), 'fly')
 *      - drive: driving.search() → API 返回路线 → animateSegment(路线节点, 'drive')
 *
 * 【第二阶段：动画进行中】
 * animateSegment()
 *   ⑨ movingMarker 图标切换为 ✈️ 或 🚗
 *   ⑩ cancelAnim() — 清理上一段的 RAF/interval/driving
 *   ⑪ anim.active=true, anim.departureIdx=当前点索引
 *   ⑫ requestAnimationFrame(animLoop) — 启动逐帧循环
 *
 * animLoop() — 每帧执行（约60fps）
 *   ⑬ 计算 elapsed → rawT → eased（easeOut缓动）
 *   ⑭ interpolatePathCoord(pathCoords, eased) → 当前经纬度
 *   ⑮ trailLine.setPath(buildTrailPath())   → 跟随线：从起点到当前位置
 *   ⑯ movingMarker.setPosition(pos)          → 移动图标位置更新
 *   ⑰ maybePan(pos)                          → 跑出视野边界则平移地图
 *
 * 【第三阶段：到达终点】
 * animLoop() 检测 rawT >= 1
 *   ⑱ cancelAnim() — 停止 RAF、zoom/rotation interval
 *   ⑲ trailLine.setPath(完整路径) — 跟随线画到终点
 *   ⑳ triggerArrivalRing(目标坐标) — 触发 SVG 光环动画（外扩+填满消失）
 *   ㉑ allDotMarkers[到达点].show()  — 显示到达点 dot
 *   ㉒ triggerLabelAppear(到达label) — 到达点 label 淡入
 *   ㉓ movingMarker.setContent(INVISIBLE_MARKER_ICON) — 隐藏移动图标
 *
 * animTimer 800ms 后（队列下一段）
 *   ㉔ traveledPath 累积新段路径
 *   ㉕ mainPolyline.setPath(traveledPath) — 主轨迹线延伸
 *   ㉖ currentIndex 更新到新点位
 *   ㉗ syncDots() — dot 显示状态同步
 *   ㉘ animTimer = setTimeout(planAndAnimate, 800) — 规划下一段
 */
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
/**
 * animateSegment — 开始一段动画
 *   1. 切换 movingMarker 图标（✈️ 或 🚗）
 *   2. cancelAnim 清理，初始化 anim 状态（departureIdx、toIdx、duration）
 *   3. 启动 RAF 循环 animLoop
 */
function animateSegment(pathCoords, travelType) {
  if (!isPlaying.value || !pathCoords || pathCoords.length < 1) return
  // 切换 movingMarker 图标（✈️ SVG 或 🚗 SVG）
  const icon = travelType === 'drive' ? carIcon : flyIcon
  movingMarker && movingMarker.setIcon(icon)
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

/**
 * animLoop — RAF 驱动的时间轴动画循环（逐帧）
 *   1. 计算 elapsed → rawT → eased（easeOut 缓动）
 *   2. interpolatePathCoord 根据 eased 插值当前位置
 *   3. 更新 trailLine（跟随线，从起点到当前位置）
 *   4. 更新 movingMarker 位置
 *   5. maybePan：若跑出视野边界，平移地图
 *   6. rawT >= 1（到达终点）：
 *      - cancelAnim（清理 RAF/interval）
 *      - triggerArrivalRing 触发 SVG 光环动画
 *      - 显示到达 dot 和 label
 *      - 隐藏 movingMarker
 *      - 累积 traveledPath，延迟 800ms 后开始下一段 planAndAnimate
 */
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
    // cancelAnim 在播放中调用不会清 traveledPath（上面已加 return），此处安全
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

/**
 * maybePan — 视野自适应：检测 movingMarker 是否在安全区内，超出则平移地图
 */
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

// ==================== arrival ring（SVG 光环）====================
/**
 * triggerArrivalRing(pos) — 触发光环动画
 *   1. 将地图坐标转为屏幕像素坐标
 *   2. 显示 SVG overlay
 *   3. 初始化 ringState：outerR=6、innerR=0、opacity=0.65
 *   4. 启动 RAF 循环 animRing
 *
 * animRing — SVG 光环动画（900ms）
 *   - outerR：6 → 32（easeOut 扩张）
 *   - innerR：0 → outerR（内圈边界扩大，实现"填满消失"）
 *   - opacity：0.65 → 0（透明度渐变）
 *   mask 原理：黑色外圆遮罩 + 白色内圆可见 = 环形视觉效果
 *
 * 光环触发时机：animLoop 检测 rawT >= 1 时调用（见事件链 ⑳）
 */
function triggerArrivalRing(pos) {
  if (!map) return
  // 若上一轮光环还未结束，强制终止并隐藏，防止新光环叠加
  if (ringState.value.active) {
    if (arrivalRingAnimId) cancelAnimationFrame(arrivalRingAnimId)
    ringState.value.active = false
    const prev = document.querySelector('.ring-overlay')
    if (prev) prev.style.display = 'none'
  }
  const mapPos = new AMap.LngLat(pos[0], pos[1])
  const pixel = map.lngLatToContainer(mapPos)
  const svgEl = document.querySelector('.ring-overlay')
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
    document.querySelector('.ring-overlay') && (document.querySelector('.ring-overlay').style.display = 'none')
    arrivalRingAnimId = null
    return
  }

  const rawT = Math.min((now - ringState.value._start) / DURATION, 1)

  // 外圈：6 → 32
  ringState.value.outerR = 6 + (MAX_OUTER - 6) * easeOut(rawT)
  // 内圈：0 → outerR（内圈边界扩大，直到填满外圈，实现"填满消失"）
  ringState.value.innerR = ringState.value.outerR * easeOut(rawT)
  // 透明度：0.65 → 0
  ringState.value.opacity = Math.max(0, 0.65 * (1 - easeOut(rawT)))

  if (rawT >= 1) {
    ringState.value.active = false
    const svgEl = document.querySelector('.ring-overlay')
    if (svgEl) svgEl.style.display = 'none'
    arrivalRingAnimId = null
  } else {
    arrivalRingAnimId = requestAnimationFrame(animRing)
  }
}

/**
 * triggerLabelAppear(label) — 标签淡入
 *   1. label.show() 立即显示
 *   2. 双 requestAnimationFrame 触发 CSS transition
 *   3. opacity 0 → 1，45ms ease-out 淡入动画
 * 依赖 AMap Marker 的 getContentDom() API
 */
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
/**
 * onAddPoint       — 从弹窗新增点位：创建 dot + label，加入数组，重建轨迹
 * deletePoint      — 删除点位：解绑事件，移除地图标记，从数组删除，重建轨迹
 * toggleSegmentTravelType — 切换段间出行方式（fly/drive）
 * getTypeName       — 类型值 → 显示文字（food→🍜 美食 等）
 */
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

/**
 * onUnmounted — 组件销毁
 *   - 暂停播放、取消动画
 *   - 解绑所有 label click listeners
 *   - 销毁地图实例（释放高德 API 资源）
 */
onUnmounted(() => {
  pausePlay()
  cancelAnim()
  // 解绑所有 label click listeners
  allLabelMarkers.forEach(l => l.off && l.off('click'))
  if (map) {
    map.off && map.off()
    map.destroy()
  }
  ringState.value.active = false
  if (arrivalRingAnimId) { cancelAnimationFrame(arrivalRingAnimId); arrivalRingAnimId = null }
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
  position: relative;
}
.ring-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
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
