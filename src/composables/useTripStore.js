import { ref, computed } from 'vue'
import { sampleTrip } from '../data/sampleTrip.js'

const trips = ref([
  {
    id: Date.now(),
    name: '我的旅程',
    points: [...sampleTrip.points],
    travelType: 'fly'
  }
])
const activeTripId = ref(trips.value[0].id)
const viewMode = ref('list')
const currentDetailTripId = ref(trips.value[0].id)
const expandedTripIds = ref(new Set())
const defaultTravelType = ref('fly')

export function useTripStore() {
  const currentTrip = computed(() => trips.value.find(t => t.id === activeTripId.value) || trips.value[0])
  const currentDetailTrip = computed(() => trips.value.find(t => t.id === currentDetailTripId.value) || null)
  const detailEmpty = computed(() => !currentDetailTrip.value?.points || currentDetailTrip.value.points.length === 0)

  function createTrip(name = '新行程') {
    const trip = {
      id: Date.now(),
      name,
      points: [],
      travelType: defaultTravelType.value
    }
    trips.value.push(trip)
    switchToTrip(trip.id)
    return trip
  }

  function switchToTrip(id) {
    activeTripId.value = id
  }

  function updateTripName(id, newName) {
    const trip = trips.value.find(t => t.id === id)
    if (!trip || !newName?.trim()) return false
    trip.name = newName.trim()
    return true
  }

  function moveTrip(fromIndex, toIndex) {
    if (fromIndex === toIndex) return false
    const total = trips.value.length
    if (fromIndex < 0 || fromIndex >= total) return false
    if (toIndex < 0 || toIndex >= total) return false
    const [moved] = trips.value.splice(fromIndex, 1)
    trips.value.splice(toIndex, 0, moved)
    return true
  }

  function deleteTrip(id) {
    if (trips.value.length <= 1) return
    const idx = trips.value.findIndex(t => t.id === id)
    if (idx < 0) return
    trips.value.splice(idx, 1)
    if (activeTripId.value === id) {
      switchToTrip(trips.value[0].id)
    }
    if (currentDetailTripId.value === id && viewMode.value === 'detail') {
      exitDetail()
    }
  }

  function toggleTripCard(id) {
    const s = new Set(expandedTripIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    expandedTripIds.value = s
  }

  function getRouteSummary(trip) {
    if (!trip.points || trip.points.length === 0) return ''
    return trip.points.map(p => p.name).join('->')
  }

  function enterDetail(tripId) {
    currentDetailTripId.value = tripId
    viewMode.value = 'detail'
  }

  function exitDetail() {
    viewMode.value = 'list'
  }

  // ===== 点位操作 =====
  function addPointToTrip(tripId, point) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return
    const newPoint = {
      id: Date.now(),
      name: point.name,
      position: point.position,
      type: point.type,
      description: point.description || '',
      travelTypeToHere: defaultTravelType.value
    }
    trip.points.push(newPoint)
    return newPoint
  }

  function deletePointFromTrip(tripId, index) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip || trip.points.length <= 1) { alert('至少保留一个点位'); return false }
    if (!confirm('确定删除该点位？')) return false
    trip.points.splice(index, 1)
    return true
  }

  function batchDeletePointsFromTrip(tripId, indexes) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip || !indexes.size) return false
    if (!confirm(`确定删除选中的 ${indexes.size} 个点位？`)) return false
    const sorted = [...indexes].sort((a, b) => b - a)
    sorted.forEach(idx => {
      trip.points.splice(idx, 1)
    })
    return true
  }

  function updatePointInTrip(tripId, index, data) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip || index < 0 || index >= trip.points.length) return
    trip.points[index] = { ...trip.points[index], ...data }
  }

  function movePointInTrip(tripId, fromIndex, toIndex) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip || fromIndex < 0 || toIndex < 0) return
    const [moved] = trip.points.splice(fromIndex, 1)
    trip.points.splice(toIndex, 0, moved)
  }

  function toggleSegmentTravelType(tripId, index) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip || index < 0 || index >= trip.points.length) return
    const point = trip.points[index]
    point.travelTypeToHere = point.travelTypeToHere === 'fly' ? 'drive' : 'fly'
  }

  function getTypeName(type) {
    const names = { food: '🍜 美食', attraction: '🏛️ 景点', activity: '🎉 活动', hotel: '🏨 住宿', transport: '🚗 交通' }
    return names[type] || '📍'
  }

  return {
    trips,
    activeTripId,
    viewMode,
    currentDetailTripId,
    expandedTripIds,
    defaultTravelType,
    currentTrip,
    currentDetailTrip,
    detailEmpty,
    createTrip,
    switchToTrip,
    deleteTrip,
    toggleTripCard,
    getRouteSummary,
    enterDetail,
    exitDetail,
    addPointToTrip,
    deletePointFromTrip,
    batchDeletePointsFromTrip,
    updatePointInTrip,
    movePointInTrip,
    updateTripName,
    moveTrip,
    toggleSegmentTravelType,
    getTypeName
  }
}
