import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTripStore } from './trip'

export const usePlayerStore = defineStore('player', () => {
  // — State —
  const isPlaying          = ref(false)
  const currentIndex       = ref(0)
  const currentSpeed       = ref(1)
  const enableMapRotation  = ref(false)
  const mapReady           = ref(false)

  const speeds = [0.5, 1, 2, 4]

  // — Getters —
  const tripStore = useTripStore()
  const progressPercent = computed(() =>
    tripStore.count > 0
      ? (currentIndex.value / tripStore.count) * 100
      : 0
  )
  const currentPoint = computed(() =>
    tripStore.points[currentIndex.value] ?? null
  )
  const hasNext = computed(() => currentIndex.value < tripStore.count - 1)
  const hasPrev = computed(() => currentIndex.value > 0)

  // — Actions —
  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function play() {
    isPlaying.value = true
  }

  function pause() {
    isPlaying.value = false
  }

  function nextStep() {
    if (hasNext.value) currentIndex.value++
  }

  function prevStep() {
    if (hasPrev.value) currentIndex.value--
  }

  function jumpTo(index: number) {
    if (index >= 0 && index < tripStore.count) {
      currentIndex.value = index
    }
  }

  function reset() {
    isPlaying.value = false
    currentIndex.value = 0
  }

  function setSpeed(speed: number) {
    currentSpeed.value = speed
  }

  function toggleRotation() {
    enableMapRotation.value = !enableMapRotation.value
  }

  function setMapReady(ready: boolean) {
    mapReady.value = ready
  }

  return {
    isPlaying,
    currentIndex,
    currentSpeed,
    enableMapRotation,
    mapReady,
    speeds,
    progressPercent,
    currentPoint,
    hasNext,
    hasPrev,
    togglePlay,
    play,
    pause,
    nextStep,
    prevStep,
    jumpTo,
    reset,
    setSpeed,
    toggleRotation,
    setMapReady,
  }
})
