<template>
  <div class="app">
    <header class="header">
      <h1>🗺️ 旅行轨迹动画</h1>
      <p class="subtitle">用动画展示你的旅行足迹</p>
    </header>
    <main class="main">
      <TravelMap />
    </main>
  </div>
</template>

<script setup>
import TravelMap from './views/TravelMap.vue'
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 32px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 4px 0 0;
  opacity: 0.85;
  font-size: 14px;
}

.main {
  flex: 1;
  padding: 24px;
}
</style>
