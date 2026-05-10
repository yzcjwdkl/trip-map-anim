<template>
  <div class="app" :class="{ 'is-fullscreen': isFullscreen }">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <svg class="brand-mark" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1.2"/>
            <path d="M8 14 Q14 8 20 14 Q14 20 8 14Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
            <circle cx="14" cy="14" r="2" fill="currentColor"/>
          </svg>
          <div class="brand-text">
            <span class="brand-name">旅行轨迹</span>
            <span class="brand-tagline">用动画记录你的每一步</span>
          </div>
        </div>
        <div class="header-meta">
          <span class="meta-hint">向下滚动切换行程</span>
        </div>
      </div>
    </header>
    <main class="main" :class="{ 'no-padding': isFullscreen }">
      <TravelMap :fullscreen="isFullscreen" @toggle-fullscreen="toggleFullscreen" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TravelMap from './views/TravelMap.vue'

const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      isFullscreen.value = true
    }).catch(() => {
      isFullscreen.value = !isFullscreen.value
    })
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false
    })
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    isFullscreen.value = false
  }
})
</script>

<style scoped>
/* ─── App Shell ─── */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: oklch(98% 0.004 80);
}

/* ─── Header ─── */
.header {
  flex-shrink: 0;
  border-bottom: 1px solid oklch(88% 0.008 80);
  background: oklch(99% 0.003 80);
  position: relative;
}

.header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    oklch(65% 0.08 290) 20%,
    oklch(55% 0.1 290) 50%,
    oklch(65% 0.08 290) 80%,
    transparent 100%
  );
  opacity: 0.25;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
}

/* ─── Brand ─── */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  color: oklch(55% 0.18 290);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.brand-name {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: oklch(25% 0.02 290);
  line-height: 1;
}

.brand-tagline {
  font-family: 'Noto Sans SC', -apple-system, sans-serif;
  font-size: 0.6875rem;
  color: oklch(55% 0.02 290);
  letter-spacing: 0.06em;
  font-weight: 300;
}

/* ─── Header Meta ─── */
.header-meta {
  display: flex;
  align-items: center;
  gap: 20px;
}

.meta-hint {
  font-family: 'Noto Sans SC', -apple-system, sans-serif;
  font-size: 0.6875rem;
  color: oklch(62% 0.015 290);
  letter-spacing: 0.05em;
  font-weight: 400;
}

/* ─── Main ─── */
.main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

/* ─── Fullscreen ─── */
.app.is-fullscreen .header {
  display: none;
}

.main.no-padding {
  padding: 0;
}
</style>
