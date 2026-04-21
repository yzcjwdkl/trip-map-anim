import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import type { TripData, TripPoint } from '@/types/trip'
import { sampleTrip } from '@/data/sampleTrip'

export const useTripStore = defineStore('trip', () => {
  // — State —
  const tripData = shallowRef<TripData>(sampleTrip)

  // — Getters —
  const points = computed(() => tripData.value.points)
  const title   = computed(() => tripData.value.title)
  const date    = computed(() => tripData.value.date)
  const count   = computed(() => tripData.value.points.length)

  // — Actions —
  function updateTrip(newData: Partial<TripData>) {
    tripData.value = { ...tripData.value, ...newData }
  }

  function addPoint(point: TripPoint) {
    tripData.value.points.push(point)
  }

  function removePoint(id: number) {
    tripData.value.points = tripData.value.points.filter(p => p.id !== id)
  }

  function updatePoint(id: number, updates: Partial<TripPoint>) {
    const idx = tripData.value.points.findIndex(p => p.id === id)
    if (idx !== -1) {
      tripData.value.points[idx] = { ...tripData.value.points[idx], ...updates }
    }
  }

  function reorderPoints(from: number, to: number) {
    const arr = [...tripData.value.points]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    tripData.value.points = arr
  }

  function resetTrip() {
    tripData.value = { ...sampleTrip }
  }

  return {
    tripData,
    points,
    title,
    date,
    count,
    updateTrip,
    addPoint,
    removePoint,
    updatePoint,
    reorderPoints,
    resetTrip,
  }
})
