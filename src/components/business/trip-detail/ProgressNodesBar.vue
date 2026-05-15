<template>
  <div class="progress-nodes-bar" ref="barRef">
    <div class="nodes-track">
      <div
        v-for="(point, index) in points"
        :key="point.id"
        class="node-item"
        :class="{
          'is-visited': index < currentIndex,
          'is-current': index === currentIndex,
          'is-future': index > currentIndex,
        }"
        :ref="el => setNodeEl(index, el)"
        @click="emit('node-click', index)"
      >
        <!-- 连接线（起点到终点方向） -->
        <div class="node-connector" v-if="index < points.length - 1"></div>

        <!-- 节点圆点 -->
        <div class="node-dot" :class="{ 'pulse': index === currentIndex }">
          <!-- 当前节点：数字编号 -->
          <span v-if="index === currentIndex" class="node-number">{{ index + 1 }}</span>
          <!-- 已访问节点：勾选 -->
          <svg v-else-if="index < currentIndex" class="node-check" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <!-- 未访问节点：序号 -->
          <span v-else class="node-pending">{{ index + 1 }}</span>
        </div>

        <!-- 节点名称标签 -->
        <div class="node-label" :class="{ 'label-active': index === currentIndex }">
          <span class="node-name">{{ point.name }}</span>
        </div>
      </div>

      <!-- 进度条轨道（覆盖在连接线上） -->
      <div class="progress-overlay" :style="{ width: progressWidth + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  points: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
})

const emit = defineEmits(['node-click'])

const barRef = ref(null)
const nodeEls = ref([])

// 进度条覆盖宽度
const progressWidth = computed(() => {
  if (!props.points.length) return 0
  const segment = 100 / (props.points.length - 1 || 1)
  return segment * props.currentIndex
})

// 收集 node-item DOM refs
function setNodeEl(index, el) {
  if (el) nodeEls.value[index] = el
}

let ctx = null

onMounted(() => {
  if (!barRef.value) return
  ctx = gsap.context(() => {
    // 入场：所有节点从下往上淡入
    gsap.fromTo('.node-item',
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'back.out(1.6)',
        stagger: 0.07,
        delay: 0.2,
      }
    )
  }, barRef)
})

onUnmounted(() => {
  ctx?.revert()
})

// 监听当前节点变化 → 触发高亮动画
watch(() => props.currentIndex, (newIdx, oldIdx) => {
  if (newIdx === oldIdx) return

  // 旧节点退场
  if (oldIdx !== undefined && nodeEls.value[oldIdx]) {
    gsap.to(nodeEls.value[oldIdx].querySelector('.node-dot'), {
      scale: 1,
      duration: 0.3,
      ease: 'power2.in',
    })
  }

  // 新节点入场
  nextTick(() => {
    const newEl = nodeEls.value[newIdx]
    if (!newEl) return

    const dot = newEl.querySelector('.node-dot')

    // 弹入效果
    gsap.fromTo(dot,
      { scale: 0.3, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.55,
        ease: 'back.out(2)',
      }
    )

    // label 上浮
    gsap.fromTo(newEl.querySelector('.node-label'),
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', delay: 0.15 }
    )
  })
})
</script>

<style scoped>
.progress-nodes-bar {
  width: 100%;
  padding: 8px 20px 6px;
  flex-shrink: 0;
}

.nodes-track {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

/* 进度覆盖轨道（绝对定位在节点连接线上） */
.progress-overlay {
  position: absolute;
  top: 11px;
  left: 0;
  height: 3px;
  background: oklch(58% 0.14 25);
  border-radius: 2px;
  pointer-events: none;
  transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 0;
}

.node-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  cursor: pointer;
  z-index: 1;
}

/* 节点连接线 */
.node-connector {
  position: absolute;
  top: 11px;
  left: 50%;
  right: -50%;
  height: 3px;
  background: oklch(88% 0.008 55);
  border-radius: 2px;
  z-index: -1;
}

.node-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

/* 已访问 */
.is-visited .node-dot {
  background: oklch(72% 0.08 145);
  color: oklch(99% 0 0);
  box-shadow: 0 2px 6px oklch(65% 0.1 145 / 0.25);
}

/* 当前 */
.is-current .node-dot {
  background: oklch(58% 0.14 25);
  color: oklch(99% 0 0);
  box-shadow:
    0 0 0 3px oklch(100% 0 0),
    0 0 0 5px oklch(58% 0.14 25 / 0.18),
    0 4px 12px oklch(50% 0.12 25 / 0.25);
}

/* 未访问 */
.is-future .node-dot {
  background: oklch(92% 0.005 55);
  color: oklch(58% 0.01 55);
  border: 1.5px solid oklch(82% 0.008 55);
}

/* pulse 动画 */
.node-dot.pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid oklch(58% 0.14 25 / 0.4);
  animation: nodePulse 1.6s ease-out infinite;
}

@keyframes nodePulse {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}

.node-number {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.625rem;
  font-weight: 700;
  color: oklch(99% 0 0);
  line-height: 1;
}

.node-check {
  width: 12px;
  height: 12px;
  color: oklch(99% 0 0);
}

.node-pending {
  font-size: 0.625rem;
  font-weight: 600;
  color: oklch(58% 0.01 55);
  line-height: 1;
}

/* 标签 */
.node-label {
  margin-top: 5px;
  max-width: 56px;
  text-align: center;
  transition: all 0.25s ease;
}

.node-name {
  font-size: 0.5625rem;
  font-weight: 500;
  color: oklch(55% 0.008 55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  letter-spacing: 0.01em;
  line-height: 1.3;
}

.label-active .node-name {
  color: oklch(52% 0.1 25);
  font-weight: 700;
}
</style>