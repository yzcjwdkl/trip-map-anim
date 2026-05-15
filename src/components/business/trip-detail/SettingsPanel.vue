<template>
  <!-- 遮罩层 -->
  <Teleport to="body">
    <div
      class="side-overlay"
      ref="overlayRef"
      v-show="visible"
      @click="emit('close')"
    ></div>

    <!-- 设置面板 -->
    <div class="side-panel settings-panel" ref="panelRef">
      <div class="side-panel-header">
        <span class="side-panel-title">设置</span>
        <button class="side-panel-close" @click="emit('close')" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="side-panel-body">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const panelRef   = ref(null)
const overlayRef = ref(null)

let ctx = null

onMounted(() => {
  ctx = gsap.context(() => {}, panelRef.value)
})

watch(() => props.visible, (val) => {
  if (!panelRef.value) return
  if (!ctx) ctx = gsap.context(() => {}, panelRef.value)

  if (val) {
    gsap.set(panelRef.value, { x: '100%' })
    const tl = gsap.timeline()
    tl.to(panelRef.value, { x: '0%', duration: 0.55, ease: 'back.out(1.2)' })
      .then(() => {
        gsap.set(overlayRef.value, { opacity: 0 })
        gsap.to(overlayRef.value, { opacity: 1, duration: 0.3 })
      })
  } else {
    gsap.to(panelRef.value, {
      x: '100%',
      duration: 0.35,
      ease: 'power3.in',
    })
    gsap.to(overlayRef.value, { opacity: 0, duration: 0.25 })
  }
}, { immediate: true })

onUnmounted(() => ctx?.revert())
</script>

<style scoped>
.side-overlay {
  position: fixed;
  inset: 0;
  background: oklch(15% 0.01 55 / 0.35);
  z-index: 50;
  backdrop-filter: blur(3px);
  pointer-events: auto;
}

.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: oklch(100% 0 0);
  z-index: 60;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px oklch(30% 0.01 55 / 0.1);
  will-change: transform;
}

.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid oklch(88% 0.008 55);
  flex-shrink: 0;
}

.side-panel-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  font-weight: 700;
  color: oklch(22% 0.012 55);
}

.side-panel-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: oklch(96% 0.005 55);
  color: oklch(40% 0.012 55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s ease;
}
.side-panel-close:hover { background: oklch(88% 0.008 55); }

.side-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

@media (max-width: 767px) {
  .side-panel { width: 100vw; height: 100dvh; }
}
</style>