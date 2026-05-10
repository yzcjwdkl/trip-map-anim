<template>
  <div class="travel-map" :class="{ 'is-fullscreen': props.fullscreen }" ref="travelMapRef">
    <!-- 鼠标跟随效果 - 使用 Teleport 渲染到 body -->
    <Teleport to="body">
      <div class="flair" ref="flairRef"></div>
    </Teleport>

    <!-- 波浪背景 -->
    <TransitionWave
      :phase="wavePhase"
      @canHideList="onCanHideList"
    />

    <!-- 内容层 -->
    <div class="view-layer" ref="viewLayerRef">
      <TripCardList v-if="effectiveMode === 'list'" />
      <TripDetail
        v-else
        ref="detailRef"
        :trip-id="currentDetailTripId"
        :fullscreen="props.fullscreen"
        @toggle-fullscreen="emit('toggle-fullscreen')"
        @back="exitDetailAnimated"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import TripCardList from '../components/TripCardList.vue'
import TripDetail from '../components/TripDetail.vue'
import TransitionWave from '../components/TransitionWave.vue'
import { useTripStore } from '../composables/useTripStore.js'

const props = defineProps({ fullscreen: Boolean })
const emit = defineEmits(['toggle-fullscreen'])

const { viewMode, currentDetailTripId, exitDetail } = useTripStore()

const travelMapRef = ref(null)
const flairRef = ref(null)
const viewLayerRef = ref(null)
const detailRef = ref(null)

const effectiveMode = ref('list')
const wavePhase = ref('idle')

// ==================== 鼠标跟随效果 ====================
let xTo = null
let yTo = null

function initFlair() {
  if (!flairRef.value) return

  gsap.set(flairRef.value, { xPercent: -50, yPercent: -50 })

  xTo = gsap.quickTo(flairRef.value, "x", { duration: 0.6, ease: "power3" })
  yTo = gsap.quickTo(flairRef.value, "y", { duration: 0.6, ease: "power3" })

  const handleMouseMove = (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
  }

  window.addEventListener('mousemove', handleMouseMove)
}

// ─── 进入详情 ───
watch(viewMode, (next) => {
  if (next === 'detail') {
    // 1. 波浪开始从底部升起（盖住列表）
    wavePhase.value = 'entering'
    // 2. 等波浪动画完整完成（0.9s + buffer）后，展示详情内容
    setTimeout(() => {
      if (wavePhase.value !== 'entering') return
      // 波沉为背景（z:1），详情内容在 z:10 上方出现
      wavePhase.value = 'cover'
      effectiveMode.value = 'detail'
      gsap.fromTo(viewLayerRef.value,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      )
    }, 1550)
  } else {
    // 返回：先淡出详情内容，再做波浪退出动画
    gsap.to(viewLayerRef.value, {
      opacity: 0, y: -6, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        // 内容淡出后，波浪开始退出
        wavePhase.value = 'exiting'
        // 波浪退完动画（约 1250ms），再切换到列表
        setTimeout(() => {
          effectiveMode.value = 'list'
          // 切换到列表后立即重置透明度，让卡片列表可见
          gsap.set(viewLayerRef.value, { opacity: 1, y: 0 })
        }, 1300)
      }
    })
  }
})

function onCanHideList() {
  wavePhase.value = 'idle'
}

function exitDetailAnimated() {
  gsap.set(viewLayerRef.value, { opacity: 1, y: 0 })
  exitDetail()
}

onMounted(() => {
  initFlair()
})
</script>

<style scoped>
.travel-map {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.view-layer {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: auto;
}
</style>
