<template>
  <div class="bottom-toolbar" ref="toolbarWrapRef">
    <!-- accordion 展开的目标面板 -->
    <div class="toolbar-panel" ref="panelRef">
      <ul class="toolbar-list" ref="listRef">
        <li
          class="toolbar-item"
          v-for="(btn, idx) in buttons"
          :key="btn.action"
          :ref="el => setItemEl(idx, el)"
          @click="btn.handler"
          :title="btn.label"
        >
          <svg class="toolbar-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="btn.iconPath"></svg>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const emit = defineEmits(['add-point', 'toggle-list', 'toggle-settings'])

const toolbarWrapRef = ref(null)
const panelRef       = ref(null)
const listRef        = ref(null)
const itemEls        = []

let ctx = null

// 物理动效参数（桌面）
const MIN    = 48   // 按钮间距
const MAX    = 80   // 最大宽度
const BOUND  = MIN * Math.PI

const buttons = [
  {
    action: 'add',
    label: '新增点位',
    iconPath: `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/>`,
    handler: () => emit('add-point'),
  },
  {
    action: 'list',
    label: '点位列表',
    iconPath: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
    handler: () => emit('toggle-list'),
  },
  {
    action: 'settings',
    label: '设置面板',
    iconPath: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    handler: () => emit('toggle-settings'),
  },
]

// 设备检测
const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0

function setItemEl(idx, el) {
  if (el) itemEls[idx] = el
}

onMounted(() => {
  if (!toolbarWrapRef.value) return
  ctx = gsap.context(() => {
    // 桌面端：accordion 展开效果（移动端始终展开）
    if (!isMobile && panelRef.value) {
      gsap.set(panelRef.value, { scaleX: 0, transformOrigin: '50% 100%' })
      gsap.to(panelRef.value, { scaleX: 1, duration: 0.4, ease: 'back.out(1.5)' })
    }

    // 工具按钮初始状态
    if (listRef.value) {
      const items = listRef.value.querySelectorAll('.toolbar-item')
      gsap.set(items, { transformOrigin: '50% 120%', height: 40 })
    }
  }, toolbarWrapRef.value)

  // mouse-follow 物理动效（仅桌面）
  if (!isMobile && listRef.value) {
    setupMouseFollow()
  }
})

function setupMouseFollow() {
  const items = itemEls.filter(Boolean)
  if (!items.length || !listRef.value) return
  const firstIcon = items[0]
  const list = listRef.value

  gsap.set(list, { position: 'relative', height: 60 })

  function updateIcons(pointer) {
    items.forEach((icon, i) => {
      const distance = (i * MIN + MIN / 2) - pointer
      let x = 0, scale = 1

      if (-BOUND < distance && distance < BOUND) {
        const rad = distance / MIN * 0.5
        scale = 1 + (MAX / MIN - 1) * Math.cos(rad)
        x = 2 * (MAX - MIN) * Math.sin(rad)
      } else {
        x = (-BOUND < distance ? 2 : -2) * (MAX - MIN)
      }

      gsap.to(icon, { duration: 0.3, x, scale })
    })
  }

  const onMouseMove = (e) => {
    const offset = list.getBoundingClientRect().left + firstIcon.offsetLeft
    updateIcons(e.clientX - offset)
  }
  const onMouseLeave = () => {
    gsap.to(items, { duration: 0.3, scale: 1, x: 0 })
  }

  list.addEventListener('mousemove', onMouseMove)
  list.addEventListener('mouseleave', onMouseLeave)

  ctx?.add(() => {
    list.removeEventListener('mousemove', onMouseMove)
    list.removeEventListener('mouseleave', onMouseLeave)
  })
}

onUnmounted(() => {
  ctx?.revert()
})
</script>

<style scoped>
.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.bottom-toolbar > * { pointer-events: auto; }

.toolbar-panel {
  display: inline-flex;
  justify-content: center;
  align-items: flex-end;
}

.toolbar-list {
  display: inline-flex;
  justify-content: center;
  align-items: flex-end;
  height: 40px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  margin: 0;
  padding: 10px;
  background: rgba(55, 66, 77, 0.25);
  list-style: none;
  backdrop-filter: blur(8px);
}

.toolbar-item {
  width: 40px;
  height: 40px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: oklch(99% 0 0);
  border-radius: 50%;
  transition: color 0.15s ease;
}

.toolbar-icon-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
}

/* 移动端：始终展开 */
@media (max-width: 767px) {
  .toolbar-panel {
    transform: none;
  }
  .toolbar-list {
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
  }
}
</style>