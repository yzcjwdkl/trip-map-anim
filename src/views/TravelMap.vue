<template>
  <div class="travel-map" :class="{ 'is-fullscreen': props.fullscreen }">

    <div class="map-container" :class="{ 'is-fullscreen': props.fullscreen }">
      <button class="fullscreen-btn" @click="emit('toggle-fullscreen')" title=" '全屏'">⛶</button>
      <div id="amap-container" ref="mapContainer"></div>
      <svg class="ring-overlay" ref="ringOverlay" style="display:none">
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
          fill="rgba(99,102,241,0.15)"
          :mask="'url(#rm-' + uid + ')'"
        />
      </svg>
      <div class="moving-dot" ref="movingDot" :class="{ visible: isPlaying }">
        <div class="dot-ring"></div>
        <div class="dot-core"></div>
      </div>
    </div>

    <div class="control-panel" v-show="!props.fullscreen">

      <!-- ===== 卡片列表视图 ===== -->
      <div v-if="viewMode === 'list'" class="view-list">
        <div class="trips-section">
          <div class="trips-header">
            <span class="trips-label">行程</span>
            <span class="trips-count">{{ trips.length }}</span>
            <button class="trip-add-btn" @click="createTrip()" title="新建行程">+ 新建</button>
          </div>
          <div class="trips-list">
            <div
              v-for="trip in trips"
              :key="trip.id"
              class="trip-card"
              :class="{ active: trip.id === activeTripId }"
            >
              <div class="trip-card-header">
                <div class="trip-card-info">
                  <span class="trip-card-name">{{ trip.name }}</span>
                  <span class="trip-card-meta">{{ trip.points.length }} 个地点</span>
                </div>
              </div>
              <div class="trip-card-summary" v-if="expandedTripIds.has(trip.id)">
                <span v-if="trip.points.length === 0" class="summary-empty">暂无路线</span>
                <span v-else class="summary-text">{{ getRouteSummary(trip) }}</span>
              </div>
              <div class="trip-card-footer">
                <button
                  class="trip-expand-btn"
                  :class="{ expanded: expandedTripIds.has(trip.id) }"
                  @click="toggleTripCard(trip.id)"
                  :title="expandedTripIds.has(trip.id) ? '收起' : '展开'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div class="footer-right">
                  <button class="trip-edit-btn" @click.stop="startRenameTrip(trip)" title="重命名">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    class="trip-delete-btn"
                    v-if="trips.length > 1"
                    @click.stop="deleteTrip(trip.id)"
                    title="删除"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                  <button class="trip-enter-btn" @click="enterDetail(trip.id)">进入 →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 详情页视图 ===== -->
      <div v-if="viewMode === 'detail'" class="view-detail">
        <div class="detail-back-bar">
          <button class="back-btn" @click="exitDetail()">← 返回行程</button>
          <span class="detail-trip-name">{{ currentDetailTrip?.name }}</span>
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
            <span class="count-num">{{ currentDetailTrip?.points.length }}</span>
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
            <span>{{ currentIndex + 1 }} / {{ currentDetailTrip?.points.length }}</span>
          </div>
        </div>

        <div class="controls-row">
          <div class="player-controls">
            <button class="btn btn-secondary btn-sm" @click="resetTrip">重置</button>
            <button class="btn btn-primary btn-sm" @click="togglePlay" :disabled="!mapReady">{{ isPlaying ? '暂停' : '播放' }}</button>
            <button class="btn btn-secondary btn-sm" @click="nextStep">下一步</button>
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
              @change="currentSpeed = speeds[Math.round(speedIndex / (100 / (speeds.length - 1)))]"
            />
          </div>
        </div>

        <div class="stops-list">
          <div class="stops-header">
            <div class="stops-header-left">
              <span class="stops-title">地点</span>
              <span class="stops-count">{{ currentDetailTrip?.points.length }}</span>
            </div>
            <div class="stops-header-right">
              <button v-if="!showBatchMode && !detailEmpty" class="batch-toggle-btn" @click="enterBatchMode">☰ 批量</button>
              <button v-if="showBatchMode && selectedCount > 0" class="batch-toggle-btn" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</button>
              <button v-if="showBatchMode" class="batch-cancel-btn" @click="exitBatchMode">取消</button>
              <button v-if="showBatchBar" class="batch-delete-btn" @click="batchDeletePoints">🗑 删除 ({{ selectedCount }})</button>
            </div>
          </div>

          <div class="stops-timeline" v-if="!detailEmpty">
            <div
              v-for="(point, index) in currentDetailTrip?.points"
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
                <div v-if="index < (currentDetailTrip?.points.length ?? 0) - 1" class="timeline-line" :class="{ visited: index < currentIndex }"></div>
              </div>
              <div class="stop-content" :class="{ visited: index < currentIndex, current: index === currentIndex }" @click="jumpTo(index)">
                <div class="stop-main">
                  <div class="stop-name-row">
                    <input
                      v-if="showBatchMode"
                      type="checkbox"
                      class="batch-checkbox stop-checkbox"
                      :checked="selectedIndexes.has(index)"
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
                  <button class="action-btn edit-btn" @click.stop="openEditDialog(index, point)" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="action-btn delete-btn" @click.stop="deletePoint(index)" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <div v-if="index < (currentDetailTrip?.points.length ?? 0) - 1" class="travel-toggle" @click.stop="toggleSegmentTravelType(index)">
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

      <!-- 重命名弹窗 -->
      <div class="rename-overlay" v-if="renamingTrip" @click.self="cancelRename">
        <div class="rename-dialog">
          <div class="rename-header">重命名行程</div>
          <input
            v-model="renameInput"
            class="rename-input"
            @keydown.enter="confirmRename"
            @keydown.esc="cancelRename"
            ref="renameInputEl"
          />
          <div class="rename-actions">
            <button class="btn btn-secondary" @click="cancelRename">取消</button>
            <button class="btn btn-primary" @click="confirmRename">确认</button>
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
import {ref, computed, onMounted, onUnmounted, nextTick} from 'vue'
import { ElMessage } from 'element-plus'
import AMapLoader from '@amap/amap-jsapi-loader'
import { markerIcons, sampleTrip } from '../data/sampleTrip.js'
import AddPointDialog from '../components/AddPointDialog.vue'

const props = defineProps({ fullscreen: Boolean })
const emit = defineEmits(['toggle-fullscreen'])
import { getBearing, calcFitZoom, getSegmentDuration, interpolatePathCoord, buildTrailPath, makeArcPath, isPosInView, haversineDistance } from '../utils/mapUtils.js'

// 地图实例
let map = null
let AMap = null
let mainPolyline = null
// ==================== marker icon（content HTML — 可靠，避免 AMap.Icon 异步加载导致图标消失）====================
// 飞机/汽车 SVG 用作背景图（URL 来自 vite 打包后的 assets）
const FLY_SVG_CONTENT = `<div style="width:32px;height:32px;background:url('/assets/fj.png') center/contain no-repeat;"></div>`
const CAR_SVG_CONTENT = `<div style="width:32px;height:32px;background:url('/assets/car.png') center/contain no-repeat;"></div>`

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
// 行程数据（多行程）
const trips = ref([
  {
    id: Date.now(),
    name: '我的旅程',
    points: [...sampleTrip.points],
    travelType: 'fly'
  }
])
const activeTripId = ref(trips.value[0].id)

// 当前行程（响应式）
const currentTrip = computed(() => trips.value.find(t => t.id === activeTripId.value) || trips.value[0])
const tripData = computed(() => currentTrip.value)

// 新建行程
function createTrip(name = '新行程') {
  const trip = {
    id: Date.now(),
    name,
    points: [],
    travelType: defaultTravelType.value
  }
  trips.value.push(trip)
  switchToTrip(trip.id)
}

// 切换行程（列表页切换卡片）
function switchToTrip(id) {
  pausePlay()
  activeTripId.value = id
  selectedIndexes.value = new Set()
  showBatchMode.value = false
  // 列表页不展示任何点位和轨迹线
  clearMap()
  currentIndex.value = 0
}

// 重命名行程
const renamingTrip = ref(null)
const renameInput = ref('')
const renameInputEl = ref(null)

// 卡片展开集合
const expandedTripIds = ref(new Set())

function toggleTripCard(id) {
  const s = new Set(expandedTripIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedTripIds.value = s
}

// 视图模式
const viewMode = ref('list')
const currentDetailTripId = ref(trips.value[0].id)
const currentDetailTrip = computed(() => trips.value.find(t => t.id === currentDetailTripId.value) || null)
const detailEmpty = computed(() => !currentDetailTrip.value?.points || currentDetailTrip.value.points.length === 0)

function clearMap() {
  allDotMarkers.forEach(dot => dot && dot.setMap(null))
  allLabelMarkers.forEach(label => label && label.setMap(null))
  allDotMarkers = []
  allLabelMarkers = []
  safeSetPath(mainPolyline, [])
  safeSetPath(trailLine, [])
  if (mainPolyline) mainPolyline.hide()
  if (trailLine) trailLine.hide()
}

function enterDetail(tripId) {
  clearMap()
  currentDetailTripId.value = tripId
  viewMode.value = 'detail'
  // 进入详情页后，需要重新构建当前行程的地图标记
  // 等 viewMode 渲染完成再初始化标记（确保容器可见）
  nextTick(() => {
    if (viewMode.value !== 'detail') return
    initDetailMarkers()
  })
}

function exitDetail() {
  // 退出详情页时，清空当前卡片的播放状态
  pausePlay()
  currentIndex.value = 0
  traveledPath = []
  clearMap()
  viewMode.value = 'list'
}

// 详情页标记初始化（进入详情时调用）
function initDetailMarkers() {
  // 不管有没有点位，都允许点击播放/重置按钮（空时弹窗提示）
  mapReady.value = true
  if (!currentDetailTrip.value?.points?.length) return
  if (mainPolyline) mainPolyline.show()
  if (trailLine) trailLine.show()
  allDotMarkers = []
  allLabelMarkers = []

  // 重建 dot markers
  currentDetailTrip.value.points.forEach((point) => {
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

  // 重建 label markers
  currentDetailTrip.value.points.forEach((point, index) => {
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

  // 初始化显示
  allDotMarkers.forEach((dot, i) => { if (dot && i > 0) dot.hide() })
  safeSetPath(mainPolyline, [currentDetailTrip.value.points[0].position])
  safeSetPath(trailLine, [currentDetailTrip.value.points[0].position])
  triggerLabelAppear(allLabelMarkers[0])
  mapReady.value = true
}

// 路线简介字符串：厦门市->昆明市->芒市
function getRouteSummary(trip) {
  if (!trip.points || trip.points.length === 0) return ''
  return trip.points.map(p => p.name).join('->')
}

function startRenameTrip(trip) {
  renamingTrip.value = trip
  renameInput.value = trip.name
  nextTick(() => renameInputEl.value?.focus())
}

function confirmRename() {
  if (renamingTrip.value && renameInput.value.trim()) {
    renamingTrip.value.name = renameInput.value.trim()
  }
  renamingTrip.value = null
  renameInput.value = ''
}

function cancelRename() {
  renamingTrip.value = null
  renameInput.value = ''
}

// 删除行程（至少保留一个）
function deleteTrip(id) {
  if (trips.value.length <= 1) return
  const idx = trips.value.findIndex(t => t.id === id)
  if (idx < 0) return
  trips.value.splice(idx, 1)
  if (activeTripId.value === id) {
    switchToTrip(trips.value[0].id)
  }
}

// 初始化当前行程的地图标记
function initTripMarkers() {
  if (!map || !AMap) return
  const pts = tripData.value.points
  allDotMarkers = []
  allLabelMarkers = []
  pts.forEach((point) => {
    const dot = new AMap.CircleMarker({
      center: point.position,
      radius: 6,
      fillColor: '#667eea',
      fillOpacity: 1,
      strokeWidth: 0,
      zIndex: 10
    })
    dot.setMap(map)
    allDotMarkers.push(dot)
  })
  pts.forEach((point, index) => {
    const label = new AMap.Marker({
      position: point.position,
      offset: new AMap.Pixel(0, -35),
      content: '<div class="label-tag">' + (markerIcons[point.type] || '📍') + ' ' + point.name + '</div>',
      zIndex: 20
    })
    label.on('click', () => jumpTo(index))
    label.hide()
    label.setMap(map)
    allLabelMarkers.push(label)
  })
}
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentSpeed = ref(1)
const defaultTravelType = ref('fly')

const speeds = [0.5, 1, 2, 4]
const speedIndex = ref((speeds.indexOf(currentSpeed.value) / (speeds.length - 1)) * 100)
const speedMarks = ref({
  0: '0.5x',
  33.33: '1x',
  66.67: '2x',
  100: '4x',
})
let animTimer = null

// 拖拽排序
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

// 批量删除
const selectedIndexes = ref(new Set())
const showBatchMode = ref(false)
const showBatchBar = computed(() => selectedIndexes.value.size > 0)
const selectedCount = computed(() => selectedIndexes.value.size)
const allSelected = computed(() =>
  selectedIndexes.value.size > 0 &&
  selectedIndexes.value.size === currentTrip.value.points.length
)

function enterBatchMode() {
  showBatchMode.value = true
}

function exitBatchMode() {
  showBatchMode.value = false
  selectedIndexes.value = new Set()
}

function toggleSelect(index) {
  const s = new Set(selectedIndexes.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  selectedIndexes.value = s
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIndexes.value = new Set()
  } else {
    selectedIndexes.value = new Set(currentTrip.value.points.map((_, i) => i))
  }
}

const isEmpty = computed(() => !tripData.value.points || tripData.value.points.length === 0)

function batchDeletePoints() {
  const count = selectedIndexes.value.size
  if (!count) return
  if (!confirm(`确定删除选中的 ${count} 个点位？`)) return
  pausePlay()
  const sorted = [...selectedIndexes.value].sort((a, b) => b - a)
  const delSet = new Set(selectedIndexes.value)
  sorted.forEach(idx => {
    if (allLabelMarkers[idx]) {
      allLabelMarkers[idx].off && allLabelMarkers[idx].off('click')
      allLabelMarkers[idx].setMap(null)
    }
    allDotMarkers[idx] && allDotMarkers[idx].setMap(null)
    currentTrip.value.points.splice(idx, 1)
  })
  allLabelMarkers = []
  allDotMarkers = []
  // 清空地图上的线和标记
  mainPolyline && mainPolyline.setPath([])
  trailLine && trailLine.setPath([])
  movingMarker && movingMarker.setPosition([0, 0])
  movingMarker && movingMarker.hide()
  // 重置状态
  currentIndex.value = 0
  selectedIndexes.value = new Set()
  showBatchMode.value = false
  // 空态时显示提示
  if (tripData.value.points.length === 0) {
    allLabelMarkers = []
    allDotMarkers = []
  }
}

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
const nextPoint = computed(() => tripData.value.points && currentIndex.value < tripData.value.points.length - 1 ? tripData.value.points[currentIndex.value + 1] : null)
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
    console.log('AMap 加载完成', AMap)

    // 等待容器有有效像素尺寸（防止 AMap 初始化时 container size 为 0 导致 Pixel(NaN)）
    const container = document.getElementById('amap-container')
    const waitForSize = (el) => {
      return new Promise(resolve => {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) { resolve(); return }
        const ro = new ResizeObserver(() => {
          if (el.offsetWidth > 0 && el.offsetHeight > 0) { ro.disconnect(); resolve() }
        })
        ro.observe(el)
        // 超时兜底：500ms 后强制继续
        setTimeout(() => { ro.disconnect(); resolve() }, 500)
      })
    }
    await waitForSize(container)
    console.log('容器尺寸 OK:', container.offsetWidth, container.offsetHeight)

    map = new AMap.Map('amap-container', {
      zoom: 14,
      pitch: 45,
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      viewMode: '3D'
    })
    console.log('地图初始化完成', map)

    mainPolyline = new AMap.Polyline({
      strokeColor: '#667eea',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    map.add(mainPolyline)
    console.log('mainPolyline 初始化完成', mainPolyline)
    // 到达圆环改用 SVG overlay 实现（见模板 ring-overlay），无需在此初始化

    trailLine = new AMap.Polyline({
      strokeColor: '#764ba2',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    console.log('trailLine 初始化完成', trailLine)
    map.add(trailLine)
    console.log('tripData.value',tripData.value)
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
    console.log('dot 标记初始化完成', allDotMarkers)

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
    console.log('label 标记初始化完成', allLabelMarkers)

    if (!movingMarker) {
      movingMarker = new AMap.Marker({
        position: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
        content: FLY_SVG_CONTENT,
        offset: new AMap.Pixel(-16, -16),
        zIndex: 100
      })
      map.add(movingMarker)
    } else {
      movingMarker.setPosition(tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336])
      movingMarker.setContent(FLY_SVG_CONTENT)
    }

    mapReady.value = true

    // 监听容器尺寸变化，防止窗口缩放后地图计算 NaN
    const ro = new ResizeObserver(() => {
      if (map) map.resize()
    })
    ro.observe(document.getElementById('amap-container'))

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
  safeSetPath(mainPolyline, positions)
  safeSetPath(trailLine, positions)
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
  safeSetPath(mainPolyline, pts.map(p => p.position))
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
  if (!currentDetailTrip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  // 切换到当前详情卡片后，清掉上一次的播放状态
  if (currentIndex.value >= currentDetailTrip.value.points.length) {
    currentIndex.value = 0
    traveledPath = []
  }
  if (currentIndex.value >= currentDetailTrip.value.points.length - 1) resetTrip()
  if (anim.pendingStart) { clearTimeout(anim.pendingStart); anim.pendingStart = null }
  cancelAnim()
  // cancelAnim 把 traveledPath 清空了，需要恢复「起点→当前索引」的已完成路径
  // 单点不足以画 polyline，需至少两个点
  if (currentIndex.value > 0) {
    traveledPath = currentDetailTrip.value.points.slice(0, currentIndex.value + 1).map(p => p.position)
    if (traveledPath.length < 2) traveledPath = []
  } else {
    traveledPath = []
  }
  if (traveledPath.length >= 2) {
    safeSetPath(mainPolyline, traveledPath)
  }
  isPlaying.value = true
  syncDots()
  const curPos = currentDetailTrip.value.points[currentIndex.value].position
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
  if (!currentDetailTrip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  pausePlay()
  routeDirMap = {}
  currentIndex.value = 0
  traveledPath = []
  const defaultCenter = currentDetailTrip.value.points[0].position
  safeSetPath(mainPolyline, [])
  safeSetPath(trailLine, [])
  movingMarker && movingMarker.setPosition(defaultCenter)
  allLabelMarkers.forEach((l, i) => i === 0 ? triggerLabelAppear(l) : l.hide())
  allDotMarkers.forEach(dot => dot && dot.show())
  map && map.setCenter(defaultCenter)
  map && map.setZoom(14)
}

function nextStep() {
  if (!currentDetailTrip.value?.points?.length) { ElMessage.warning('请先添加点位'); return }
  pausePlay()
  if (currentIndex.value < currentDetailTrip.value.points.length - 1) {
    const pts = currentDetailTrip.value.points
    const prevIdx = currentIndex.value
    const newIdx = prevIdx + 1
    currentIndex.value = newIdx
    // 累积已走路径
    const segPath = [pts[prevIdx].position, pts[newIdx].position]
    traveledPath = [...traveledPath, ...segPath]
    safeSetPath(mainPolyline, traveledPath)
    const pos = pts[newIdx].position
    movingMarker && movingMarker.setPosition(pos)
    map && map.panTo(pos)
    triggerLabelAppear(allLabelMarkers[newIdx])
    if (allDotMarkers[newIdx]) allDotMarkers[newIdx].show()
  }
  syncDots()
}

function jumpTo(index) {
  if (!currentDetailTrip.value?.points?.length) return
  pausePlay()
  allLabelMarkers.forEach((l, i) => i === index ? triggerLabelAppear(l) : l.hide())
  currentIndex.value = index
  // traveledPath 重置为起点到目标点的完整路径（需至少2点才画polyline）
  if (index > 0) {
    traveledPath = tripData.value.points.slice(0, index + 1).map(p => p.position)
    if (traveledPath.length >= 2) {
      mainPolyline && mainPolyline.setPath(traveledPath)
    } else {
      mainPolyline && mainPolyline.setPath([])
    }
  } else {
    traveledPath = []
    mainPolyline && mainPolyline.setPath([])
  }
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
  if (currentIndex.value >= currentDetailTrip.value.points.length - 1) { pausePlay(); return }

  const from = currentDetailTrip.value.points[currentIndex.value].position
  const to = currentDetailTrip.value.points[currentIndex.value + 1].position
  const prevIdx = currentIndex.value
  if (!allLabelMarkers[prevIdx]) { console.warn('label marker not found', prevIdx); return }
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
        const segmentTravelType = currentDetailTrip.value.points[currentIndex.value].travelTypeToHere || 'fly'
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
function safeSetPath(polyline, path) {
  if (!polyline) return
  // AMap.Polyline.setPath 需至少2个坐标；单点时直接跳过
  if (!path || !Array.isArray(path) || path.length < 2) return
  polyline.setPath(path)
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
    // cancelAnim 会清空 anim.toIdx/departureIdx/active，先保存
    const arrivedIdx = anim.toIdx
    const prevDeparture = anim.departureIdx
    cancelAnim()
    // cancelAnim 在播放中调用不会清 traveledPath（上面已加 return），此处安全
    anim.active = true  // cancelAnim 后恢复 active，syncDots 依赖它判断出发 dot
    anim.departureIdx = arrivedIdx  // 下一段出发 dot 为当前到达 dot
    safeSetPath(trailLine, pathCoords)
    // 触发到达动画 + 显示到达 dot/label + 隐藏 movingMarker
    if (isPlaying.value) {
      triggerArrivalRing(anim.to)
      if (allDotMarkers[arrivedIdx]) allDotMarkers[arrivedIdx].show()
      triggerLabelAppear(allLabelMarkers[arrivedIdx])
    }
    movingMarker && movingMarker.setContent(INVISIBLE_MARKER_ICON)
    animTimer = setTimeout(() => {
      if (!isPlaying.value) return
      // 累积路径：用 traveledPath 追加新段
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
  // 安全校验：确保坐标有效，避免 Pixel(NaN, NaN)
  if (!pos || !Array.isArray(pos) || pos.length < 2 || isNaN(pos[0]) || isNaN(pos[1])) {
    console.warn('triggerArrivalRing: 无效坐标', pos)
    return
  }
  const mapPos = new AMap.LngLat(pos[0], pos[1])
  const pixel = map.lngLatToContainer(mapPos)
  if (isNaN(pixel.x) || isNaN(pixel.y)) return
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
  currentTrip.value.points.push(newPoint)
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
  currentTrip.value.points.splice(index, 1)
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
/* ===== 布局 ===== */
.travel-map {
  display: flex;
  gap: 24px;
  height: calc(100vh - 96px);
  overflow: hidden;
}
.travel-map.is-fullscreen {
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
.ring-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* ===== 全屏按钮 ===== */
.fullscreen-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  width: 36px;
  height: 36px;
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

/* ===== 全屏工具栏 ===== */
.fullscreen-toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  min-width: 320px;
  max-width: 90vw;
  z-index: 30;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  padding: 12px 20px;
  overflow: visible;
}
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}
.toolbar-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
.toolbar-progress-bar {
  width: 80px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}
.toolbar-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.toolbar-progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  white-space: nowrap;
  flex-shrink: 0;
}
.toolbar-progress-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
}
.toolbar-current { color: #1e293b; font-weight: 600; }
.toolbar-arrow { color: #94a3b8; flex-shrink: 0; }
.toolbar-next { color: #64748b; }
.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.toolbar-btn:hover { background: #e2e8f0; color: #1e293b; }
.toolbar-btn-primary {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.toolbar-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99,102,241,0.4);
}
.toolbar-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar-speed { flex: 1; min-width: 0; }
.toolbar-close { flex-shrink: 0; }

#amap-container { width: 100%; height: 100%; min-height: 0; }
.control-panel {
  width: 360px;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.04);
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== 状态栏 ===== */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.03) 100%);
  border: 1px solid rgba(99,102,241,0.1);
  border-radius: 14px;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}
.status-bar:hover {
  border-color: rgba(99,102,241,0.18);
  box-shadow: 0 2px 12px rgba(99,102,241,0.06);
}
.status-main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.status-icon { 
  font-size: 18px; 
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border-radius: 10px;
  flex-shrink: 0;
}
.status-info { flex: 1; min-width: 0; }
.status-name { font-weight: 600; font-size: 13px; color: #1e293b; }
.status-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-count { 
  display: flex; 
  flex-direction: column; 
  align-items: flex-end; 
  flex-shrink: 0;
  margin-right: 10px;
}
.count-num { font-size: 22px; font-weight: 700; color: #6366f1; line-height: 1; letter-spacing: -0.02em; }
.count-unit { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.add-in-status { flex-shrink: 0; }

.progress-section { margin-bottom: 16px; }
.progress-bar { height: 3px; background: #f1f5f9; border-radius: 2px; overflow: hidden; position: relative; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 2px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.progress-text { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; margin-top: 8px; }
.progress-text span:last-child { font-weight: 600; color: #6366f1; }

.controls-row { margin-bottom: 12px; }
.player-controls { display: flex; gap: 6px; flex-wrap: wrap; }
.btn { padding: 9px 14px; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
.btn-sm { flex: 0 0 auto; }
.btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.25); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.35); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.btn-secondary { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; flex: 0 0 auto; }
.btn-secondary:hover { background: #f1f5f9; color: #1e293b; border-color: #e2e8f0; }

.speed-control { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
.speed-label { font-weight: 500; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; padding-top: 6px; }
.speed-slider-wrap { flex: 1; min-width: 0; }
.speed-slider-wrap :deep(.el-slider__runway) { background: #e2e8f0; border-radius: 2px; }
.speed-slider-wrap :deep(.el-slider__bar) { background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 2px; }
.speed-slider-wrap :deep(.el-slider__button) { width: 14px; height: 14px; background: white; border: 2px solid #6366f1; border-radius: 50%; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
.speed-slider-wrap :deep(.el-slider__stop) { background-color: #818cf8; }
.speed-slider-wrap :deep(.el-slider__marks) { top: 18px; }
.speed-slider-wrap :deep(.el-slider__marks-text) { font-size: 11px; color: #94a3b8; font-weight: 500; }
.speed-slider-wrap :deep(.el-slider__marks-text-active) { color: #6366f1; font-weight: 700; }

/* ===== 点位列表 ===== */
.stops-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
  min-height: 0;
}
.stops-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 12px;
}
.stops-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stops-title {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.stops-count {
  font-size: 10px;
  font-weight: 600;
  color: #cbd5e1;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 20px;
}
.batch-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6366f1;
  flex-shrink: 0;
}
.batch-toggle-btn {
  padding: 5px 12px;
  background: rgba(99,102,241,0.08);
  color: #6366f1;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.batch-toggle-btn:hover {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.35);
}
.batch-cancel-btn {
  padding: 5px 12px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.batch-cancel-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}
.stops-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-delete-btn {
  padding: 5px 12px;
  background: rgba(239,68,68,0.08);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.batch-delete-btn:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.35);
}
.stop-checkbox {
  margin-right: 6px;
  vertical-align: middle;
  cursor: pointer;
  width: 15px;
  height: 15px;
  accent-color: #6366f1;
  flex-shrink: 0;
}
.stop-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stops-timeline {
  display: flex;
  flex-direction: column;
}
.stop-row {
  display: flex;
  gap: 12px;
  transition: opacity 0.15s ease;
}
.stop-row.dragging { opacity: 0.3; }
.stop-row.drag-over .stop-content { border-color: #6366f1; background: rgba(99,102,241,0.03); }

/* 时间线 */
.stop-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
  padding-top: 14px;
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid #f8fafc;
  flex-shrink: 0;
  transition: all 0.2s ease;
  z-index: 1;
}
.timeline-dot.active {
  width: 12px;
  height: 12px;
  background: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}
.timeline-dot.visited {
  background: #cbd5e1;
}
.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 28px;
  background: #e2e8f0;
  margin: 4px 0;
  border-radius: 1px;
  transition: background 0.2s ease;
}
.timeline-line.visited {
  background: #cbd5e1;
}

/* 内容区 */
.stop-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 8px;
  background: transparent;
}
.stop-content:hover {
  background: #fafbfc;
  border-color: #f1f5f9;
}
.stop-content.visited {
  opacity: 0.45;
}
.stop-content.current {
  background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.03) 100%);
  border-color: rgba(99,102,241,0.15);
}

.stop-main {
  flex: 1;
  min-width: 0;
}
.stop-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stop-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stop-emoji {
  font-size: 14px;
  flex-shrink: 0;
}
.stop-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.stop-type {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stop-desc {
  font-size: 10px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stop-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.stop-content:hover .stop-actions { opacity: 1; }
.action-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #cbd5e1;
  transition: all 0.15s ease;
}
.edit-btn:hover {
  background: rgba(99,102,241,0.08);
  color: #6366f1;
}
.delete-btn:hover {
  background: rgba(239,68,68,0.08);
  color: #ef4444;
}

/* 出行方式切换 */
.travel-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.travel-toggle:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.travel-toggle.fly {
  color: #6366f1;
  background: rgba(99,102,241,0.06);
  border-color: rgba(99,102,241,0.2);
}
.travel-toggle.drive {
  color: #f59e0b;
  background: rgba(245,158,11,0.06);
  border-color: rgba(245,158,11,0.2);
}
.travel-icon { font-size: 12px; }
.travel-text { font-size: 11px; font-weight: 500; }

/* ===== 空态 ===== */
.stops-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 260px;
}

.empty-illustration {
  position: relative;
  width: 120px;
  height: 60px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.15);
  border: 2px solid rgba(99, 102, 241, 0.25);
}

.dot-1 {
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  animation: float-dot 3s ease-in-out infinite;
}

.dot-2 {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: float-dot 3s ease-in-out infinite 0.4s;
}

.dot-3 {
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  animation: float-dot 3s ease-in-out infinite 0.8s;
}

@keyframes float-dot {
  0%, 100% { transform: translateY(-50%); opacity: 0.4; }
  50% { transform: translateY(-60%); opacity: 0.7; }
}

.dot-2 {
  animation-name: float-dot-center;
}
@keyframes float-dot-center {
  0%, 100% { transform: translate(-50%, -50%); opacity: 0.4; }
  50% { transform: translate(-50%, -60%); opacity: 0.7; }
}

.empty-dash-line {
  position: absolute;
  top: 50%;
  left: 32px;
  right: 32px;
  height: 0;
  border-top: 2px dashed rgba(99, 102, 241, 0.2);
  transform: translateY(-50%);
}

.empty-content {
  text-align: center;
  margin-bottom: 44px;
}

.empty-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 12px;
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
  max-width: 200px;
}

.add-in-empty :deep(.add-point-btn) {
  padding: 10px 20px;
  font-size: 13px;
}

.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,23,42,0.4); backdrop-filter: blur(6px); display: flex; align-items: center;
  justify-content: center; z-index: 1000; padding: 24px;
}
.dialog {
  background: white; border-radius: 20px; width: 100%; max-width: 420px;
  max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: 0 25px 50px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1);
  animation: dialog-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes dialog-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #f8fafc;
}
.dialog-header h3 { margin: 0; font-size: 15px; color: #1e293b; font-weight: 600; }
.close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: #94a3b8; padding: 6px; border-radius: 6px; transition: all 0.15s ease; }
.close-btn:hover { background: #f1f5f9; color: #1e293b; }
.dialog-body { padding: 24px; flex: 1; overflow-y: auto; }
.point-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 12px; color: #64748b; font-weight: 500; }
.form-row input, .form-row select {
  flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0;
  border-radius: 8px; font-size: 14px; outline: none; background: #fafbfc; color: #1e293b; transition: all 0.15s ease;
}
.form-row input:hover, .form-row select:hover { border-color: #cbd5e1; background: #f8fafc; }
.form-row input:focus, .form-row select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); background: white; }
.form-row input::placeholder { color: #cbd5e1; }
.coords { font-size: 12px; color: #94a3b8; font-family: ui-monospace, 'SF Mono', Menlo, monospace; padding: 8px 12px; background: #fafbfc; border-radius: 6px; }
.dialog-footer {
  display: flex; gap: 10px; padding: 20px 24px; border-top: 1px solid #f8fafc;
}
.dialog-footer .btn { flex: 1; padding: 11px; border-radius: 10px; font-size: 13px; border: none; cursor: pointer; font-weight: 500; }
.dialog-footer .btn-secondary { background: #f1f5f9; color: #64748b; }
.dialog-footer .btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
.dialog-footer .btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; }

/* ===== 响应式：移动端 ===== */
@media (max-width: 768px) {
  .travel-map {
    flex-direction: column;
    min-height: 0;
    gap: 16px;
    height: auto;
  }
  .travel-map.is-fullscreen {
    height: 100vh;
  }
  .map-container {
    min-height: 300px;
    max-height: 380px;
    border-radius: 16px;
  }
  #amap-container { height: 100%; min-height: 300px; }
  .control-panel {
    width: 100%;
    max-height: none;
    overflow-y: visible;
    padding: 16px;
    border-radius: 16px;
  }
  .player-controls { gap: 8px; }
  .btn-sm { flex: 1 !important; padding: 11px 12px; }
  .btn-sm-add { flex: 1 !important; }
  .stop-name { font-size: 14px; }
  .dialog { width: calc(100vw - 48px); max-width: none; }

  .fullscreen-toolbar {
    bottom: 12px;
    min-width: 280px;
    padding: 10px 14px;
  }
  .toolbar-section {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .toolbar-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .toolbar-progress-bar {
    width: 60px;
    flex-shrink: 0;
  }
  .toolbar-progress-info {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .toolbar-current,
  .toolbar-next {
    font-size: 11px;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .toolbar-btn {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  .toolbar-btn-primary {
    width: 38px;
    height: 38px;
    font-size: 14px;
  }
}

/* ===== 行程卡片列表（桌面端） ===== */
.trips-section {
  padding: 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.trips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-top: 16px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.trips-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
}

.trips-count {
  font-size: 10px;
  font-weight: 600;
  color: #cbd5e1;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 20px;
}

.trip-add-btn {
  margin-left: auto;
  padding: 4px 10px;
  background: rgba(99,102,241,0.08);
  color: #6366f1;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.trip-add-btn:hover {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.35);
}

.trips-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.trip-card {
  background: #f8fafc;
  border: 1.5px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
  min-height: 72px;
}

.trip-card.active {
  background: rgba(99,102,241,0.06);
  border-color: rgba(99,102,241,0.25);
}

.trip-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  user-select: none;
}

.trip-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.trip-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trip-card-meta {
  font-size: 11px;
  color: #94a3b8;
}

.trip-edit-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(0,0,0,0.04);
  color: #94a3b8;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8px;
  transition: all 0.15s;
}
.trip-edit-btn:hover {
  background: rgba(99,102,241,0.1);
  color: #6366f1;
}

.trip-card-summary {
  padding: 2px 12px 6px;
  max-height: 60px;
  overflow: hidden;
}

.summary-text {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.summary-empty {
  font-size: 12px;
  color: #cbd5e1;
}

.trip-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(0,0,0,0.04);
  gap: 8px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.trip-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(0,0,0,0.04);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.trip-delete-btn:hover {
  background: rgba(239,68,68,0.1);
  color: #ef4444;
}

.trip-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(0,0,0,0.04);
  gap: 8px;
}

.trip-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(0,0,0,0.04);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.trip-expand-btn:hover {
  background: rgba(99,102,241,0.1);
  color: #6366f1;
}
.trip-expand-btn.expanded {
  color: #6366f1;
  background: rgba(99,102,241,0.1);
}
.trip-expand-btn svg {
  transition: transform 0.2s ease;
}
.trip-expand-btn.expanded svg {
  transform: rotate(180deg);
}

.trip-enter-btn {
  padding: 5px 14px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  white-space: nowrap;
}
.trip-enter-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.view-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.detail-back-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 6px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.back-btn {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  font-weight: 500;
}
.back-btn:hover { text-decoration: underline; }
.detail-trip-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

/* ===== 重命名弹窗 ===== */
.rename-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,23,42,0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}
.rename-dialog {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  animation: dialog-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.rename-header {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}
.rename-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  color: #1e293b;
  margin-bottom: 16px;
  transition: border-color 0.15s;
}
.rename-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
}
.rename-actions {
  display: flex;
  gap: 10px;
}
.rename-actions .btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.rename-actions .btn-secondary {
  background: #f1f5f9;
  color: #64748b;
}
.rename-actions .btn-secondary:hover {
  background: #e2e8f0;
}
.rename-actions .btn-primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
}

@media (max-width: 768px) {
  .trips-section { padding: 12px 16px 10px; }
  .trips-list { max-height: 180px; }
  .rename-dialog { width: calc(100vw - 48px); max-width: none; }
}

</style>
