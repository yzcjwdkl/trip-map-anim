<script setup lang="ts">
import TravelMap from '@/views/TravelMap.vue'
</script>

<template>
  <div class="app-shell">
    <TravelMap />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}
</style>
