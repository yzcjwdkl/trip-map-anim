<template>
  <div class="travel-map">
    <div class="map-container">
      <div id="amap-container" ref="mapContainer"></div>
    </div>
    <div class="control-panel">
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
        <div v-for="(point, index) in tripData.points" :key="point.id" class="test-flex">
          <!-- 点位行 -->
          <div class="stop-item" :class="{ visited: index < currentIndex, current: index === currentIndex }" @click="jumpTo(index)">
            <div class="stop-number">{{ index + 1 }}</div>
            <div class="stop-details">
              <div class="stop-name">{{ point.name }}</div>
              <div class="stop-type">{{ getTypeName(point.type) }}</div>
            </div>
            <div class="stop-icon-small">{{ markerIcons[point.type] || '📍' }}</div>
            <button class="delete-point-btn" @click="deletePoint(index, $event)" title="删除">✕</button>
          </div>
          <!-- 段间出行方式（最后一个点不加） -->
          <div v-if="index < tripData.points.length - 1" class="segment-travel-type" @click="toggleSegmentTravelType(index)">
            <span :class="['travel-badge', point.travelTypeToHere]">
              {{ point.travelTypeToHere === 'drive' ? '🚗 驾车' : '✈️ 飞机' }}
            </span>
          </div>
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

// 地图实例
let map = null
let AMap = null
let mainPolyline = null
let movingMarker = null
let trailLine = null
let allDotMarkers = []
let allLabelMarkers = []
// 记录每段航线走过的次数，用于交替弧线方向（往返不重叠）
let routeDirMap = {}  // key: 段索引, value: 走过的次数
let panInterval = null

// 地图就绪
const mapReady = ref(false)

// 行程数据
const tripData = ref({
  ...sampleTrip,
  points: [...sampleTrip.points]
})
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentSpeed = ref(1)
const travelType = ref('fly') // 'fly' | 'drive'
const enableMapRotation = ref(false) // 开启时每段旋转地图让终点朝上
const speeds = [0.5, 1, 2, 4]
let animTimer = null
let pendingRoute = null // 待播放的路线

const currentPoint = computed(() => tripData.value.points ? tripData.value.points[currentIndex.value] : null)
const progressPercent = computed(() => tripData.value.points && tripData.value.points.length ? (currentIndex.value / tripData.value.points.length) * 100 : 0)

// ==================== 地图初始化 ====================
// 安全密钥（高德 JSAPI v2.0 必须）
window._AMapSecurityConfig = {
  securityJsCode: 'e8942508d8cda4a36af33636adff6755'
}

onMounted(async () => {
  try {
    AMap = await AMapLoader.load({
      key: 'e5daf9362ac8a17dbd5dd6750d0f5ecc',
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.InfoWindow', 'AMap.Driving']
    })

    map = new AMap.Map('amap-container', {
      zoom: 14,
      pitch: 45,
      center: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      viewMode: '3D'
    })

    // 画主轨迹线（初始只有起点）
    mainPolyline = new AMap.Polyline({
      strokeColor: '#667eea',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    map.add(mainPolyline)

    // 画跟随轨迹线
    trailLine = new AMap.Polyline({
      strokeColor: '#764ba2',
      strokeWeight: 4,
      lineJoin: 'round'
    })
    map.add(trailLine)

    // 创建所有圆点（永久显示）
    tripData.value.points.forEach((point) => {
      const dot = new AMap.CircleMarker({
        center: point.position,
        radius: 6,
        fillColor: '#667eea',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWidth: 2,
        zIndex: 10
      })
      map.add(dot)
      allDotMarkers.push(dot)
    })

    // 创建所有标签（初始隐藏）
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

    // 移动标记（车）
    movingMarker = new AMap.Marker({
      position: tripData.value.points.length > 0 ? tripData.value.points[0].position : [98.5865, 24.4336],
      content: '<div style="font-size:24px">🚗</div>',
      offset: new AMap.Pixel(-12, -12),
      zIndex: 100
    })
    map.add(movingMarker)

    // 初始主轨迹和跟随线
    if (tripData.value.points.length > 0) {
      mainPolyline && mainPolyline.setPath([tripData.value.points[0].position])
      trailLine && trailLine && trailLine.setPath([tripData.value.points[0].position])
      // 显示第一个点标签
      allLabelMarkers[0].show()
    }

    mapReady.value = true

  } catch (e) {
    console.error('地图加载失败:', e)
  }
})

// ==================== 播放控制 ====================
function togglePlay() {
  if (isPlaying.value) {
    pausePlay()
  } else {
    startPlay()
  }
}

function startPlay() {
  if (tripData.value.points.length === 0) return
  if (currentIndex.value >= tripData.value.points.length - 1) {
    resetTrip()
  }

  const curPos = tripData.value.points[currentIndex.value].position
  if (!isPosInView(curPos)) {
    map && map.panTo(curPos)
    // panTo 完成后（350ms）再开始：先旋转，再动画
    setTimeout(() => {
      isPlaying.value = true
      planAndAnimate()
    }, 350)
  } else {
    isPlaying.value = true
    planAndAnimate()
  }
}

// 检查坐标是否在当前地图窗口的"安全区"内
function isPosInView(pos) {
  if (!map) return true
  const bounds = map.getBounds()
  if (!bounds) return true
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const padding = 0.3
  const lngRange = ne.lng - sw.lng
  const latRange = ne.lat - sw.lat
  const minLng = sw.lng + lngRange * padding
  const maxLng = ne.lng - lngRange * padding
  const minLat = sw.lat + latRange * padding
  const maxLat = ne.lat - latRange * padding
  return pos[0] >= minLng && pos[0] <= maxLng && pos[1] >= minLat && pos[1] <= maxLat
}

function pausePlay() {
  cancelAnimationFrame(panInterval)
  isPlaying.value = false
  if (animTimer) {
    clearTimeout(animTimer)
    animTimer = null
  }
}

function resetTrip() {
  pausePlay()
  routeDirMap = {}
  currentIndex.value = 0
  if (tripData.value.points.length === 0) {
    mainPolyline && mainPolyline.setPath([])
    trailLine && trailLine.setPath([])
    movingMarker && movingMarker.setPosition([98.5865, 24.4336])
    allLabelMarkers.forEach(l => l.hide())
    map && map.setCenter([98.5865, 24.4336])
    map && map.setZoom(14)
    return
  }
  mainPolyline && mainPolyline.setPath([tripData.value.points[0].position])
  trailLine && trailLine.setPath([tripData.value.points[0].position])
  movingMarker && movingMarker.setPosition(tripData.value.points[0].position)
  allLabelMarkers.forEach((l, i) => i === 0 ? l.show() : l.hide())
  map && map.setCenter([98.5865, 24.4336])
  map && map.setZoom(14)
}

function nextStep() {
  pausePlay()
  if (currentIndex.value < tripData.value.points.length - 1) {
    currentIndex.value++
    allLabelMarkers[currentIndex.value].show()
    const pos = tripData.value.points[currentIndex.value].position
    mainPolyline && mainPolyline.setPath([tripData.value.points[0].position, ...tripData.value.points.slice(0, currentIndex.value + 1).map(p => p.position)])
    trailLine && trailLine && trailLine.setPath([pos])
    movingMarker && movingMarker.setPosition(pos)
    map && map.panTo(pos)
    bounceDot(allDotMarkers[currentIndex.value])
  }
}

function jumpTo(index) {
  if (tripData.value.points.length === 0) return
  pausePlay()
  allLabelMarkers.forEach((l, i) => i === index ? l.show() : l.hide())
  currentIndex.value = index
  const path = tripData.value.points.slice(0, index + 1).map(p => p.position)
  mainPolyline && mainPolyline.setPath(path)
  trailLine && trailLine && trailLine.setPath([tripData.value.points[index].position])
  movingMarker && movingMarker.setPosition(tripData.value.points[index].position)
  map && map.panTo(tripData.value.points[index].position)
  bounceDot(allDotMarkers[index])
}

// ==================== 核心：规划 + 动画 ====================
// 规划下一段：先旋转地图，再开始动画
function planAndAnimate() {
  if (!isPlaying.value || !map || !AMap) return
  if (currentIndex.value >= tripData.value.points.length - 1) {
    pausePlay()
    return
  }

  const from = tripData.value.points[currentIndex.value].position
  const to = tripData.value.points[currentIndex.value + 1].position
  const prevIdx = currentIndex.value

  // 隐藏上一个标签，显示下一个（目的地）
  allLabelMarkers[prevIdx].hide()
  allLabelMarkers[prevIdx + 1].show()

  // 第一步：旋转地图（可选，默认关闭）
  function doZoomStep() {
    if (!isPlaying.value) return

    // 第二步：设 zoom（以出发点为中心）
    const span = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
    const targetZoom = span > 2 ? calcFitZoom(from, to) : null
    if (targetZoom !== null) {
      map.setZoom(targetZoom, false, 600)
    }

    function waitZoomDone(callback) {
      if (targetZoom === null) {
        setTimeout(callback, 400)
        return
      }
      const interval = setInterval(() => {
        if (!isPlaying.value) { clearInterval(interval); return }
        const currentZoom = map.getZoom()
        if (Math.abs(currentZoom - targetZoom) < 0.5) {
          clearInterval(interval)
          setTimeout(callback, 400)
        }
      }, 50)
    }

    // 第三步：zoom 稳定后，平移到出发点，等待，再开始轨迹
    waitZoomDone(() => {
      if (!isPlaying.value) return
      map.setCenter(from, false, 400)
      setTimeout(() => {
        if (!isPlaying.value) return
        const segmentTravelType = tripData.value.points[currentIndex.value].travelTypeToHere || 'fly'

        if (segmentTravelType === 'fly') {
          animateSegment(makeArcPath(from, to, currentIndex.value))
        } else {
          const driving = new AMap.Driving({
            policy: AMap.DrivingPolicy.LEAST_TIME,
            extensions: 'all',
            hideMarkers: true
          })
          driving.search(from, to, function(status, result) {
            if (!isPlaying.value) return
            if (status === 'complete' && result && result.routes && result.routes[0]) {
              const route = result.routes[0]
              const pathPoints = []
              if (route.steps) {
                route.steps.forEach(function(step) {
                  if (step.path) {
                    step.path.forEach(function(p) {
                      pathPoints.push([p.lng, p.lat])
                    })
                  }
                })
              }
              if (pathPoints.length > 1) {
                pathPoints[0] = from
                animateSegment(pathPoints)
              } else {
                animateSegment([from, to])
              }
            } else {
              animateSegment([from, to])
            }
          })
        }
      }, 400)
    })
  }

  if (!enableMapRotation.value) {
    // 旋转关闭：直接跳到 zoom 步骤
    setTimeout(doZoomStep, 400)
    return
  }

  const targetRotation = getBearing(from, to)
  map.setRotation(targetRotation)

  function waitRotationDone(callback) {
    const interval = setInterval(() => {
      const current = map.getRotation()
      if (Math.abs(current - targetRotation) < 0.5) {
        clearInterval(interval)
        setTimeout(callback, 400)
      }
    }, 50)
  }

  waitRotationDone(() => {
    if (!isPlaying.value) return
    doZoomStep()
  })
}

// 根据进度 eased 在路径数组中插值返回 [lng, lat]
function interpolatePathCoord(pathCoords, eased) {
  if (pathCoords.length === 1) return pathCoords[0]
  const totalSegments = pathCoords.length - 1
  const rawT = eased * totalSegments
  const segIdx = Math.min(Math.floor(rawT), totalSegments - 1)
  const segT = rawT - segIdx
  const from = pathCoords[segIdx]
  const to = pathCoords[segIdx + 1]
  return [from[0] + (to[0] - from[0]) * segT, from[1] + (to[1] - from[1]) * segT]
}

// 计算从 pos1 到 pos2 的方位角（0-360，0=北，90=东）
function getBearing(pos1, pos2) {
  const toRad = deg => deg * Math.PI / 180
  const toDeg = rad => rad * 180 / Math.PI
  const lng1 = toRad(pos1[0]), lat1 = toRad(pos1[1])
  const lng2 = toRad(pos2[0]), lat2 = toRad(pos2[1])
  const dLng = lng2 - lng1
  const x = Math.cos(lat2) * Math.sin(dLng)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  let bearing = toDeg(Math.atan2(x, y))
  return (bearing + 360) % 360
}

// 生成两点之间的弧线坐标（贝塞尔曲线，中点拱起模拟大圆航线）
function makeArcPath(from, to, routeIndex, segments = 30) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const distLng = Math.abs(to[0] - from[0])
  const distLat = Math.abs(to[1] - from[1])
  const maxDist = Math.max(distLng, distLat)
  // 拱起高度：跨度越大弧度越高；短距离时用更小的系数，避免弧度突兀
  const bulge = Math.min(maxDist * 0.15, 1.5)
  // 往返时交替拱起方向，避免同一条航线来回重叠
  const dir = routeDirMap[routeIndex] ?? 1
  const sign = dir % 2 === 0 ? 1 : -1
  routeDirMap[routeIndex] = dir + 1
  // 法向量方向：取垂直于连线方向的向量
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ctrl = [mid[0] - dy / len * bulge * sign, mid[1] + dx / len * bulge * sign]

  const result = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    // 贝塞尔曲线控制点公式
    result.push([
      mt * mt * from[0] + 2 * mt * t * ctrl[0] + t * t * to[0],
      mt * mt * from[1] + 2 * mt * t * ctrl[1] + t * t * to[1]
    ])
  }
  return result
}

// 根据两点跨度估算合适的 zoom，使两点始终占满约 80% 窗口
// 跨度越大 zoom 越高（放大看），跨度越小 zoom 也适当调低
function calcFitZoom(from, to) {
  const lngSpan = Math.abs(to[0] - from[0])
  const latSpan = Math.abs(to[1] - from[1])
  const span = Math.max(lngSpan, latSpan)
  // 基于 800px 窗口、80% 填充目标：zoom ≈ log2(900 / span)
  if (span > 15) return 6
  if (span > 10) return 7
  if (span > 7)  return 8
  if (span > 4)  return 9
  if (span > 2)  return 10
  if (span > 1)  return 11
  if (span > 0.5) return 12
  if (span > 0.2) return 13
  return 14
}

// 根据进度 eased 构建跟随线的路径（从起点到当前位置的路径）
function buildTrailPath(pathCoords, eased) {
  if (pathCoords.length === 1) return pathCoords
  const totalSegments = pathCoords.length - 1
  const rawT = eased * totalSegments
  const segIdx = Math.min(Math.floor(rawT), totalSegments - 1)
  const segT = rawT - segIdx
  const from = pathCoords[segIdx]
  const to = pathCoords[segIdx + 1]
  const curPos = [from[0] + (to[0] - from[0]) * segT, from[1] + (to[1] - from[1]) * segT]
  if (pathCoords.length === 2) {
    // 飞机模式：两点间线性插值，线段 = [起点, 当前位置]
    return [pathCoords[0], curPos]
  } else {
    // 驾车模式：收集已完整经过的路径点 + 当前行进中的片段端点
    const visitedPoints = pathCoords.slice(0, segIdx + 1)
    return [...visitedPoints, curPos]
  }
}

// 如果 marker 超出窗口范围则平移地图；窗口内则不动，节省性能
function maybePan(pos) {
  if (!map) return
  const bounds = map.getBounds()
  if (!bounds) return
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const padding = 0.45  // 边缘 45% 为"安全区"，出了才平移
  const lngRange = ne.lng - sw.lng
  const latRange = ne.lat - sw.lat
  const minLng = sw.lng + lngRange * padding
  const maxLng = ne.lng - lngRange * padding
  const minLat = sw.lat + latRange * padding
  const maxLat = ne.lat - latRange * padding
  if (pos[0] < minLng || pos[0] > maxLng || pos[1] < minLat || pos[1] > maxLat) {
    map.panTo(pos)
  }
}

// 根据两点的直线距离估算动画时长（跨度越大，时间越长）
function getSegmentDuration(from, to) {
  const distLng = Math.abs(to[0] - from[0])
  const distLat = Math.abs(to[1] - from[1])
  const maxDist = Math.max(distLng, distLat)
  if (maxDist > 5) return 4000
  if (maxDist > 2) return 3000
  if (maxDist > 1) return 2200
  if (maxDist > 0.5) return 1600
  if (maxDist > 0.2) return 1200
  return 1000
}

// 沿指定路径动画（直线或规划路线都用这个）
function animateSegment(pathCoords) {
  if (!isPlaying.value) return

  const totalSteps = 60
  const arrivedIdx = currentIndex.value + 1
  let step = 0

  // 动画开始前，算好时长；播放过程中地图完全靠 maybePan 跟随
  const from = pathCoords[0]
  const to = pathCoords[pathCoords.length - 1]
  const span = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))

  // 只在大跨度时提前调一次 zoom（防止起点看不到终点）
  if (span > 2) {
    const fitZoom = calcFitZoom(from, to)
    map && map.setZoom(fitZoom, true)
  }
  // 飞机模式：先设一次初始朝向（朝飞行方向）
  if (pathCoords.length === 2) {
    map && map.setRotation(getBearing(from, to))
  }

  const baseDuration = getSegmentDuration(from, to)
  const duration = baseDuration / currentSpeed.value

  // 用 requestAnimationFrame + 时间节流，每 200ms 检查一次是否需要平移
  let lastPanTime = 0
  function panRAF(timestamp) {
    if (!isPlaying.value) return
    if (timestamp - lastPanTime >= 200) {
      const pos = interpolatePathCoord(pathCoords, Math.min(step / totalSteps, 1))
      maybePan(pos)
      lastPanTime = timestamp
    }
    panInterval = requestAnimationFrame(panRAF)
  }
  panInterval = requestAnimationFrame(panRAF)

  function tick() {
    if (!isPlaying.value) return

    step++
    const t = Math.min(step / totalSteps, 1)
    // easeOutQuad
    const eased = 1 - (1 - t) * (1 - t)
    const pos = interpolatePathCoord(pathCoords, eased)

    // 跟随线画到当前位置
    trailLine && trailLine.setPath(buildTrailPath(pathCoords, eased))
    // 车跟着
    movingMarker && movingMarker.setPosition(pos)

    if (step >= totalSteps) {
      // 动画结束
      cancelAnimationFrame(panInterval)
      trailLine && trailLine.setPath(pathCoords)
      maybePan(to)
      bounceDot(allDotMarkers[arrivedIdx])

      animTimer = setTimeout(() => {
        if (!isPlaying.value) return

        // 更新主轨迹
        const newPath = [...mainPolyline.getPath(), ...pathCoords]
        // 去除重复点（接缝处）
        mainPolyline && mainPolyline.setPath(newPath)

        currentIndex.value = arrivedIdx

        animTimer = setTimeout(() => {
          if (isPlaying.value) planAndAnimate()
        }, 800)
      }, 0)
    } else {
      animTimer = setTimeout(tick, duration / totalSteps)
    }
  }

  animTimer = setTimeout(tick, duration / totalSteps)
}

// 圆点点弹跳动画
function bounceDot(dot) {
  const base = 6
  dot.setRadius(base)
  const total = 800
  const frames = [11, 3, 9, 4, 7, 5, 6]
  const times = [0, 120, 240, 360, 480, 580, 660]
  frames.forEach((r, i) => {
    setTimeout(() => dot.setRadius(r), times[i])
  })
}

// 添加点位
function onAddPoint(point) {
  const newPoint = {
    id: Date.now(),
    name: point.name,
    position: point.position,
    type: point.type,
    description: point.description || '',
    travelTypeToHere: travelType.value
  }
  tripData.value.points.push(newPoint)

  // 在地图上添加该点
  if (map && AMap && movingMarker) {
    const dot = new AMap.CircleMarker({
      center: newPoint.position,
      radius: 6,
      fillColor: '#667eea',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWidth: 2,
      zIndex: 10
    })
    dot.setMap(map)
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

// 删除点位
function deletePoint(index, event) {
  event.stopPropagation()
  if (tripData.value.points.length <= 1) {
    alert('至少保留一个点位')
    return
  }
  // 从地图上移除
  if (allDotMarkers[index]) {
    allDotMarkers[index].setMap(null)
    allDotMarkers.splice(index, 1)
  }
  if (allLabelMarkers[index]) {
    allLabelMarkers[index].setMap(null)
    allLabelMarkers.splice(index, 1)
  }
  tripData.value.points.splice(index, 1)
  if (currentIndex.value >= tripData.value.points.length) {
    currentIndex.value = tripData.value.points.length - 1
  }
}

// 切换两景点间的出行方式
function toggleSegmentTravelType(index) {
  const point = tripData.value.points[index]
  point.travelTypeToHere = point.travelTypeToHere === 'fly' ? 'drive' : 'fly'
}

// 地点类型名称
function getTypeName(type) {
  const names = { food: '🍜 美食', attraction: '🏛️ 景点', activity: '🎉 活动', hotel: '🏨 住宿', transport: '🚗 交通' }
  return names[type] || '📍'
}

onUnmounted(() => {
  pausePlay()
  if (map) map && map.destroy()
})
</script>

<style scoped>
.travel-map { display: flex; gap: 24px; height: calc(100vh - 140px); }
.map-container { flex: 1; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
#amap-container { width: 100%; height: 100%; }
.control-panel { width: 380px; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow-y: auto; }
.trip-info { margin-bottom: 20px; }
.trip-info h2 { margin: 0 0 4px; font-size: 20px; color: #333; }
.trip-date { margin: 0; color: #888; font-size: 14px; }
.current-stop { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #667eea22, #764ba222); padding: 16px; border-radius: 12px; margin-bottom: 20px; }
.stop-icon { font-size: 32px; }
.stop-info { flex: 1; }
.stop-name { font-weight: 600; font-size: 16px; color: #333; }
.stop-desc { font-size: 13px; color: #666; margin-top: 2px; }
.progress-section { margin-bottom: 20px; }
.progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s; }
.progress-text { text-align: center; font-size: 12px; color: #888; margin-top: 6px; }
.player-controls { display: flex; gap: 8px; margin-bottom: 20px; }
.btn { flex: 1; padding: 12px 16px; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f0f0f0; color: #666; }
.btn-secondary:hover { background: #e0e0e0; }
.speed-control { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 13px; color: #666; }
.ctrl-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.ctrl-btn.active { background: #667eea; color: white; border-color: #667eea; }
.ctrl-btn:hover:not(.active) { border-color: #667eea; }
.stops-list h3 { margin: 0 0 8px; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.stop-item {
  display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; margin: 0;
  width: calc(100% - 70px);
}
.stop-item:hover { background: #f8f9fa; }
.stop-item.visited { opacity: 0.6; }
.stop-item.current { background: linear-gradient(135deg, #667eea22, #764ba222); border-left: 3px solid #667eea; }
.stop-number { width: 28px; height: 28px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #666; flex-shrink: 0; }
.stop-item.current .stop-number, .stop-item.visited .stop-number { background: #667eea; color: white; }
.stop-details { flex: 1; min-width: 0; }
.stop-name { font-size: 14px; font-weight: 500; }
.stop-type { font-size: 12px; color: #999; }
.stop-icon-small { font-size: 18px; opacity: 0.7; flex-shrink: 0; }
.point-count { font-size: 12px; color: #999; font-weight: normal; }
.delete-point-btn { background: none; border: none; color: #ccc; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
.delete-point-btn:hover { background: #fee; color: #e33; }
.segment-travel-type { position: relative; }
.travel-badge {
  display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; white-space: nowrap;
  position: absolute; bottom: -20px;
}
.travel-badge.fly { background: #e8f0fe; color: #1a73e8; }
.travel-badge.fly:hover { background: #d0e1fd; }
.travel-badge.drive { background: #fef3e2; color: #e37400; }
.travel-badge.drive:hover { background: #fde9cc; }
.test-flex { display: flex; margin-bottom: 14px; }
</style>
