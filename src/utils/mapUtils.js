// 地图相关纯工具函数

/**
 * 计算从 pos1 到 pos2 的方位角
 * @param {number[]} pos1 [lng, lat]
 * @param {number[]} pos2 [lng, lat]
 * @returns {number} 0-360，0=北，90=东
 */
export function getBearing(pos1, pos2) {
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

/**
 * 根据两点跨度估算合适的 zoom，使两点占满约 80% 窗口
 * @param {number[]} from [lng, lat]
 * @param {number[]} to   [lng, lat]
 * @returns {number} 地图 zoom 值
 */
export function calcFitZoom(from, to) {
  const lngSpan = Math.abs(to[0] - from[0])
  const latSpan = Math.abs(to[1] - from[1])
  const span = Math.max(lngSpan, latSpan)
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

/**
 * 根据两点的直线距离估算动画时长
 * @param {number[]} from [lng, lat]
 * @param {number[]} to   [lng, lat]
 * @returns {number} 毫秒数
 */
export function getSegmentDuration(from, to) {
  const maxDist = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
  if (maxDist > 5) return 4000
  if (maxDist > 2) return 3000
  if (maxDist > 1) return 2200
  if (maxDist > 0.5) return 1600
  if (maxDist > 0.2) return 1200
  return 1000
}

/**
 * 在路径坐标数组中，根据进度 eased 插值返回 [lng, lat]
 * @param {number[][]} pathCoords [[lng,lat], ...]
 * @param {number}     eased      0-1，已ease的进度
 */
export function interpolatePathCoord(pathCoords, eased) {
  if (!pathCoords || !Array.isArray(pathCoords) || pathCoords.length < 2) return null
  const totalSegments = pathCoords.length - 1
  const rawT = Math.min(Math.max(eased, 0), 1) * totalSegments
  const segIdx = Math.min(Math.floor(rawT), totalSegments - 1)
  const segT = rawT - segIdx
  const from = pathCoords[segIdx]
  const to = pathCoords[segIdx + 1]
  if (!from || !to) return null
  return [from[0] + (to[0] - from[0]) * segT, from[1] + (to[1] - from[1]) * segT]
}

/**
 * 构建跟随线的路径（从起点到当前位置）
 * @param {number[][]} pathCoords 完整路径
 * @param {number}     eased      0-1，已ease的进度
 * @returns {number[][]} 跟随线坐标数组
 */
export function buildTrailPath(pathCoords, eased) {
  if (!pathCoords || !Array.isArray(pathCoords) || pathCoords.length < 2) return pathCoords || []
  const totalSegments = pathCoords.length - 1
  const rawT = Math.min(Math.max(eased, 0), 1) * totalSegments
  const segIdx = Math.min(Math.floor(rawT), totalSegments - 1)
  const segT = rawT - segIdx
  const from = pathCoords[segIdx]
  const to = pathCoords[segIdx + 1]
  if (!from || !to) return pathCoords.slice(0, segIdx + 1)
  const curPos = [from[0] + (to[0] - from[0]) * segT, from[1] + (to[1] - from[1]) * segT]
  if (pathCoords.length === 2) return [pathCoords[0], curPos]
  return [...pathCoords.slice(0, segIdx + 1), curPos]
}

/**
 * 生成两点之间的弧线坐标（贝塞尔曲线，中点拱起模拟大圆航线）
 * @param {number[]} from       [lng, lat]
 * @param {number[]} to         [lng, lat]
 * @param {number}   routeIndex 段索引（用于往返交替）
 * @param {number}   segments   插值段数
 * @param {object}   dirMap    往返计数器对象（key: routeIndex, value: 步数）
 * @returns {number[][]}
 */
export function makeArcPath(from, to, routeIndex, segments = 30, dirMap = {}) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const maxDist = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
  const bulge = Math.min(maxDist * 0.15, 1.5)
  const dir = dirMap[routeIndex] ?? 1
  const sign = dir % 2 === 0 ? 1 : -1
  dirMap[routeIndex] = dir + 1

  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ctrl = [mid[0] - dy / len * bulge * sign, mid[1] + dx / len * bulge * sign]

  const result = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    result.push([
      mt * mt * from[0] + 2 * mt * t * ctrl[0] + t * t * to[0],
      mt * mt * from[1] + 2 * mt * t * ctrl[1] + t * t * to[1]
    ])
  }
  return result
}

/**
 * 检查坐标是否在当前地图窗口的安全区内
 * @param {object} map   AMap.Map 实例
 * @param {number[]} pos [lng, lat]
 * @param {number} padding 安全区边距比例，默认 0.45
 */
export function isPosInView(map, pos, padding = 0.45) {
  if (!map) return true
  const bounds = map.getBounds()
  if (!bounds) return true
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const lngRange = ne.lng - sw.lng
  const latRange = ne.lat - sw.lat
  const minLng = sw.lng + lngRange * padding
  const maxLng = ne.lng - lngRange * padding
  const minLat = sw.lat + latRange * padding
  const maxLat = ne.lat - latRange * padding
  return pos[0] >= minLng && pos[0] <= maxLng && pos[1] >= minLat && pos[1] <= maxLat
}

/**
 * Haversine 公式：计算两点之间的球面距离（公里）
 */
export function haversineDistance(pos1, pos2) {
  const R = 6371  // 地球半径 km
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(pos2[1] - pos1[1])
  const dLng = toRad(pos2[0] - pos1[0])
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pos1[1])) * Math.cos(toRad(pos2[1])) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Ease out quart — 0..1 → 0..1
 */
export function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

/**
 * 直线距离（米），基于 Haversine
 */
export function calcDistance(p1, p2) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(p2[1] - p1[1])
  const dLng = toRad(p2[0] - p1[0])
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
