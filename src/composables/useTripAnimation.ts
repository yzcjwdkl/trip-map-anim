import { ref, shallowRef, watch } from 'vue'
import type AMap from 'AMap'
import { usePlayerStore } from '@/stores/player'
import { useTripStore } from '@/stores/trip'
import { easeOutQuart, calcDistance } from '@/utils/mapUtils'

export function useTripAnimation(map: AMap.Map | null) {
  const player = usePlayerStore()
  const tripStore = useTripStore()

  // — Mutable animation state (not reactive, updated imperatively) —
  let mainPolyline:    AMap.Polyline | null = null
  let mainMarker:       AMap.Marker   | null = null
  let arrivalRingTimer: ReturnType<typeof setTimeout> | null = null
  let animTimer:        ReturnType<typeof setTimeout> | null = null

  // Tracks the full accumulated path (array of LngLat arrays)
  const traveledPath = shallowRef<[number, number][]>([])

  // Ring animation state
  const ringState = ref({
    screenX: 0, screenY: 0,
    outerR: 0,  innerR: 0,
    opacity: 0,  strokeW: 2,
  })
  const ringVisible = ref(false)
  const uid = Math.random().toString(36).slice(2, 8)

  // — SVG icon generators —
  const flyIcon  = () => createSvgIcon('fly')
  const driveIcon = () => createSvgIcon('drive')

  function createSvgIcon(type: 'fly' | 'drive'): AMap.Icon {
    const svg = type === 'fly'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="36" height="36"><path fill="#C17F59" d="M512 128c-35.3 0-64 28.7-64 64 0 35.3 28.7 64 64 64 35.3 0 64-28.7 64-64 0-35.3-28.7-64-64-64z"/><path fill="#C17F59" d="M832 320l-160 128-96-64 32-128zM384 448l96 64-160 128V448zM704 320h128v128H704z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="36" height="36"><ellipse fill="#C17F59" cx="512" cy="512" rx="384" ry="256"/><circle fill="#F5EDE4" cx="320" cy="560" r="60"/><circle fill="#F5EDE4" cx="704" cy="560" r="60"/><rect fill="#9B6345" x="380" y="380" width="264" height="120" rx="24"/></svg>`

    const icon = new AMap.Icon({
      size:  new AMap.Size(36, 36),
      image: `data:image/svg+xml;base64,${btoa(svg)}`,
      imageSize: new AMap.Size(36, 36),
    })
    return icon
  }

  // — Polyline setup —

  function initPolyline() {
    if (!map) return

    mainPolyline = new AMap.Polyline({
      map,
      strokeColor: '#C17F59',
      strokeWeight: 4,
      lineJoin: 'round',
      showDir: true,
      dirColor: '#D4A04A',
    })
    map.add(mainPolyline)
  }

  // — Moving marker setup —

  function initMarker() {
    if (!map) return

    mainMarker = new AMap.Marker({
      map,
      icon: flyIcon(),
      position: tripStore.points[0]?.position ?? [105, 36],
      offset: new AMap.Pixel(-18, -18),
      autoRotation: true,
    })
  }

  // — Segment animation —

  function planAndAnimate() {
    if (!map || tripStore.count < 2) return

    const fromIdx = player.currentIndex
    const toIdx   = player.currentIndex + 1
    if (toIdx >= tripStore.count) return

    const from = tripStore.points[fromIdx]
    const to   = tripStore.points[toIdx]

    if (!from || !to) return

    const speedKey = player.currentSpeed === 0.5 ? 0.25
                   : player.currentSpeed === 2   ? 2
                   : player.currentSpeed === 4  ? 4 : 1

    if (to.travelTypeToHere === 'drive') {
      driveSegment(from.position, to.position, speedKey, (pos, done) => {
        mainMarker?.setPosition(pos)
        if (done) onSegmentDone(toIdx, to.position)
      })
    } else {
      flySegment(from.position, to.position, speedKey, (pos, done) => {
        mainMarker?.setPosition(pos)
        mainMarker?.setIcon(flyIcon())
        if (done) onSegmentDone(toIdx, to.position)
      })
    }
  }

  function driveSegment(
    from: [number, number], to: [number, number],
    speedFactor: number,
    onUpdate: (pos: [number, number], done: boolean) => void
  ) {
    if (!map) return
    ;(AMap as any).plugin('AMap.Driving', () => {
      const d = new (AMap as any).Driving({
        map, policy: (AMap as any).DrivingPolicy.LEAST_DISTANCE,
      })
      d.search(from, to, (status: string, result: any) => {
        if (status !== 'complete' || !result.routes?.length) return
        const steps = result.routes[0].steps as any[]
        let stepIdx = 0, segProgress = 0
        const INTERVAL = 16

        function tick() {
          if (stepIdx >= steps.length) {
            onUpdate(to, true)
            return
          }
          const segs = steps[stepIdx].path as [number, number][]
          if (!segs?.length) { stepIdx++; tick(); return }

          const target = segs[Math.min(Math.floor(segProgress), segs.length - 1)]
          onUpdate(target, false)

          segProgress += speedFactor
          if (segProgress >= segs.length) {
            segProgress = 0
            stepIdx++
          }

          animTimer = setTimeout(tick, INTERVAL)
        }
        tick()
      })
    })
  }

  function flySegment(
    from: [number, number], to: [number, number],
    speedFactor: number,
    onUpdate: (pos: [number, number], done: boolean) => void
  ) {
    const DIST_STEP = 0.8 * speedFactor
    const dist = calcDistance(from, to)
    if (dist < 1) { onUpdate(to, true); return }

    let t = 0

    function tick() {
      t = Math.min(t + DIST_STEP / dist, 1)
      const eased = easeOutQuart(t)
      const lng = from[0] + (to[0] - from[0]) * eased
      const lat = from[1] + (to[1] - from[1]) * eased

      onUpdate([lng, lat], t >= 1)
      if (t < 1) animTimer = setTimeout(tick, 16)
    }
    tick()
  }

  function onSegmentDone(newIdx: number, position: [number, number]) {
    // Append this segment to traveled path
    traveledPath.value = [...traveledPath.value, position]
    mainPolyline?.setPath(traveledPath.value.map(p => new AMap.LngLat(p[0], p[1])))

    // Update player index
    player.jumpTo(newIdx)

    // Arrival effects
    triggerArrivalRing(position)
    map?.setCenter(position)
  }

  // — Arrival ring —

  function triggerArrivalRing(pos: [number, number]) {
    if (!map) return
    const pixel = map.lngLatToContainer(pos)
    if (isNaN(pixel.x) || isNaN(pixel.y)) return

    if (arrivalRingTimer) clearTimeout(arrivalRingTimer)

    ringVisible.value = true
    ringState.value   = { screenX: pixel.x, screenY: pixel.y, outerR: 0, innerR: 0, opacity: 0.8, strokeW: 2 }

    let outerR = 0
    const INTERVAL = 20

    function expand() {
      outerR += 1.5
      const innerR = Math.max(0, outerR - 40)
      const opacity = Math.max(0, 0.8 - outerR / 100)

      ringState.value = { screenX: pixel.x, screenY: pixel.y, outerR, innerR, opacity, strokeW: 2 }

      if (outerR < 100) {
        arrivalRingTimer = setTimeout(expand, INTERVAL)
      } else {
        ringVisible.value = false
      }
    }
    expand()
  }

  // — Playback control —

  function startPlay() {
    if (!map) return
    cancelAnim()
    // Seed polyline with completed path up to current index
    const completed = tripStore.points.slice(0, player.currentIndex + 1).map(p => p.position)
    traveledPath.value = completed
    mainPolyline?.setPath(completed.map(p => new AMap.LngLat(p[0], p[1])))
    mainMarker?.setPosition(tripStore.points[player.currentIndex]?.position)
    player.play()
    planAndAnimate()
  }

  function cancelAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null }
    if (player.isPlaying) return
    traveledPath.value = []
  }

  function resetAll() {
    cancelAnim()
    player.reset()
    traveledPath.value = []
    mainPolyline?.setPath([])
    mainMarker?.setPosition(tripStore.points[0]?.position)
    map?.setCenter(tripStore.points[0]?.position)
    map?.setZoom(5)
  }

  // — Watch playback state —
  watch(() => player.isPlaying, (playing) => {
    if (playing) startPlay()
    else cancelAnim()
  })

  return {
    traveledPath,
    ringState,
    ringVisible,
    uid,
    initPolyline,
    initMarker,
    startPlay,
    cancelAnim,
    resetAll,
    planAndAnimate,
  }
}
