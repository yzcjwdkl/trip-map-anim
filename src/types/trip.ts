export type TravelType = 'fly' | 'drive'
export type PointType = 'food' | 'attraction' | 'activity' | 'hotel' | 'transport'

export interface TripPoint {
  id: number
  name: string
  position: [number, number] // [lng, lat]
  description: string
  type: PointType
  travelTypeToHere: TravelType
}

export interface TripData {
  title: string
  date: string
  points: TripPoint[]
}

export interface TripStats {
  totalDistance: number
  totalDuration: string
}

export interface PlayerState {
  isPlaying: boolean
  currentIndex: number
  currentSpeed: number
  enableMapRotation: boolean
}

export interface RingState {
  screenX: number
  screenY: number
  outerR: number
  innerR: number
  opacity: number
  strokeW: number
}
