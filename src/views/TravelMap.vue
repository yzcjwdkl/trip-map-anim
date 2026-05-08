<template>
  <div class="travel-map" :class="{ 'is-fullscreen': props.fullscreen }">
    <TripCardList v-if="viewMode === 'list'" />
    <TripDetail
      v-else
      :trip-id="currentDetailTripId"
      :fullscreen="props.fullscreen"
      @toggle-fullscreen="emit('toggle-fullscreen')"
      @back="exitDetail"
    />
  </div>
</template>

<script setup>
import TripCardList from '../components/TripCardList.vue'
import TripDetail from '../components/TripDetail.vue'
import { useTripStore } from '../composables/useTripStore.js'

const props = defineProps({ fullscreen: Boolean })
const emit = defineEmits(['toggle-fullscreen'])

const { viewMode, currentDetailTripId, exitDetail } = useTripStore()
</script>

<style scoped>
.travel-map {
  display: flex;
  height: 100%;
  overflow: hidden;
}
</style>
