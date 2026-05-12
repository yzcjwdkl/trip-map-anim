import { markerIcons } from '../data/sampleTrip.js'

export function createDotMarker(AMap, position, opts = {}) {
  return new AMap.CircleMarker({
    center: position,
    radius: opts.radius ?? 6,
    fillColor: opts.fillColor ?? '#667eea',
    fillOpacity: opts.fillOpacity ?? 1,
    strokeWidth: opts.strokeWidth ?? 0,
    zIndex: opts.zIndex ?? 10
  })
}

export function createLabelMarker(AMap, point, opts = {}) {
  const label = new AMap.Marker({
    position: point.position,
    offset: new AMap.Pixel(0, -35),
    content: `<div class="label-tag">${markerIcons[point.type] || '📍'} ${point.name}</div>`,
    zIndex: opts.zIndex ?? 20
  })
  if (opts.onClick) label.on('click', opts.onClick)
  if (opts.hidden) label.hide()
  return label
}

export function clearMarkers(markers) {
  markers.forEach(m => m && m.setMap && m.setMap(null))
  return []
}

export function safeSetPath(polyline, path) {
  if (!polyline || !path || !Array.isArray(path) || path.length < 2) return
  polyline.setPath(path)
}

// 改后（用相对路径，自动适配当前页面地址）
export const FLY_SVG_CONTENT = `<div style="width:32px;height:32px;background:url('../assets/fj.png') center/contain no-repeat;"></div>`;
export const CAR_SVG_CONTENT = `<div style="width:32px;height:32px;background:url('../assets/car.png') center/contain no-repeat;"></div>`;
export const INVISIBLE_MARKER_ICON = '<div style="width:12px;height:12px;background:transparent;border-radius:50%;display:inline-block;"></div>'
