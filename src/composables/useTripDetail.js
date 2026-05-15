import { ref, computed, onUnmounted } from 'vue'

/**
 * useTripDetail
 * Composable for trip-detail page state management.
 * Addresses: clamp, dispose, computed, panel mutex.
 */
export function useTripDetail() {
  // ── 状态 ──────────────────────────────────────────────
  const mapReady = ref(false)
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const currentSpeed = ref(1)
  const speeds = [0.5, 1, 2, 4]

  // 面板状态
  const showPointList = ref(false)
  const showSettings = ref(false)

  // GSAP / animation 清理
  const _gsapTweens = []

  // Timer / listener 清理
  const _timerIds = []
  const _eventListeners = []

  // ── Computed ──────────────────────────────────────────
  const totalNodes = computed(() => {
    // tripData 由调用方通过 init() 或直接赋值注入
    return _tripData?.value?.points?.length ?? 0
  })

  const progressPercent = computed(() => {
    const total = totalNodes.value
    if (total <= 1) return 0
    return (currentIndex.value / (total - 1)) * 100
  })

  const currentPoint = computed(() => {
    const pts = _tripData?.value?.points
    if (!pts || !pts.length) return null
    return pts[currentIndex.value] ?? null
  })

  const prevPoint = computed(() => {
    const pts = _tripData?.value?.points
    if (!pts || !pts.length) return null
    return currentIndex.value > 0 ? pts[currentIndex.value - 1] : null
  })

  const nextPoint = computed(() => {
    const pts = _tripData?.value?.points
    if (!pts || !pts.length) return null
    return currentIndex.value < pts.length - 1 ? pts[currentIndex.value + 1] : null
  })

  // 三点流向字符串数组，用于模板遍历
  const pointFlow = computed(() => {
    const prev = prevPoint.value
    const cur  = currentPoint.value
    const next = nextPoint.value
    return [
      prev ? prev.name : '起点',
      cur  ? cur.name  : '—',
      next ? next.name : '终点',
    ]
  })

  // ── 内部引用（由调用方注入） ──────────────────────────
  // eslint-disable-next-line no-unused-vars
  let _tripData = ref({ points: [] })

  // ── Navigation（带 clamp） ────────────────────────────
  function navigateTo(idx) {
    const total = totalNodes.value
    if (total === 0) return
    currentIndex.value = Math.max(0, Math.min(idx, total - 1))
  }

  function next() {
    const total = totalNodes.value
    if (currentIndex.value >= total - 1) return  // no-op at last node
    currentIndex.value++
  }

  function prev() {
    if (currentIndex.value <= 0) return  // no-op at first node
    currentIndex.value--
  }

  // ── 面板互斥 ──────────────────────────────────────────
  function openPointList() {
    showSettings.value = false   // 关闭设置面板
    showPointList.value = true
  }

  function closePointList() {
    showPointList.value = false
  }

  function openSettings() {
    showPointList.value = false  // 关闭点位列表面板
    showSettings.value = true
  }

  function closeSettings() {
    showSettings.value = false
  }

  function closeAllPanels() {
    showPointList.value = false
    showSettings.value = false
  }

  // ── 注册清理 ──────────────────────────────────────────
  function addTimer(id) {
    _timerIds.push(id)
  }

  function addListener(el, event, handler, options) {
    if (!el) return
    el.addEventListener(event, handler, options)
    _eventListeners.push({ el, event, handler, options })
  }

  function registerTween(tween) {
    _gsapTweens.push(tween)
  }

  // ── dispose ──────────────────────────────────────────
  function dispose() {
    // 1. 清理 timers（只清理通过 addTimer 注册的内部 timer）
    _timerIds.forEach(id => {
      try { clearTimeout(id) } catch (_) {}
      try { clearInterval(id) } catch (_) {}
    })
    _timerIds.length = 0

    // 2. 清理 event listeners
    for (const { el, event, handler, options } of _eventListeners) {
      try { el?.removeEventListener(event, handler, options) } catch (_) {}
    }
    _eventListeners.length = 0

    // 3. 清理 GSAP tweens
    for (const tween of _gsapTweens) {
      try { tween?.kill() } catch (_) {}
    }
    _gsapTweens.length = 0

    // 4. 重置面板状态（幂等，多次调用无错）
    showPointList.value = false
    showSettings.value = false
    isPlaying.value = false
  }

  // ── 初始化（供调用方注入 trip data） ──────────────────
  function init(tripDataRef) {
    _tripData = tripDataRef
  }

  // 组件卸载时自动清理
  onUnmounted(() => dispose())

  return {
    // state
    mapReady,
    currentIndex,
    isPlaying,
    currentSpeed,
    speeds,
    showPointList,
    showSettings,

    // computed
    totalNodes,
    progressPercent,
    currentPoint,
    prevPoint,
    nextPoint,
    pointFlow,

    // navigation
    navigateTo,
    next,
    prev,

    // panel controls
    openPointList,
    closePointList,
    openSettings,
    closeSettings,
    closeAllPanels,

    // lifecycle
    dispose,

    // internals (供注册清理)
    addTimer,
    addListener,
    registerTween,
    init,
  }
}