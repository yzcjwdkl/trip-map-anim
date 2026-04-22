<template>
  <div class="app" :class="{ 'is-fullscreen': isFullscreen }">
    <header class="header" v-show="!isFullscreen">
      <div class="header-content">
        <h1>旅行轨迹动画</h1>
        <span class="header-subtitle">用动画展示你的旅行足迹</span>
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

// ESC 退出全屏时同步状态
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    isFullscreen.value = false
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.header h1 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.02em;
  margin: 0;
}

.header-subtitle {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 400;
}

.main {
  flex: 1;
  padding: 24px;
  overflow: hidden;
}

.app.is-fullscreen {
  min-height: 100vh;
}

.main.no-padding {
  padding: 0;
  height: 100vh;
}
</style>
