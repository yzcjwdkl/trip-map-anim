// 示例行程数据 - 云南德宏芒市三日游
export const sampleTrip = {
  title: '云南之旅',
  date: '2026年4月',
  points: [
    {
      id: 1,
      name: '厦门市',
      position: [118.0878, 24.4392],
      description: '起点',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 2,
      name: '昆明市',
      position: [102.8329, 24.8801],
      description: '',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 3,
      name: '腾冲市',
      position: [98.4906, 25.0116],
      description: '',
      type: 'attraction',
      travelTypeToHere: 'drive'
    },
    {
      id: 4,
      name: '芒市',
      position: [98.5865, 24.4336],
      description: '',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 5,
      name: '昆明市',
      position: [102.8329, 24.8801],
      description: '',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 6,
      name: '厦门市',
      position: [118.0878, 24.4392],
      description: '返程',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 7,
      name: '昆明市',
      position: [102.8329, 24.8801],
      description: '',
      type: 'attraction',
      travelTypeToHere: 'fly'
    },
    {
      id: 8,
      name: '厦门市',
      position: [118.0878, 24.4392],
      description: '返程',
      type: 'attraction',
      travelTypeToHere: 'fly'
    }
  ]
}

// 图标类型映射
export const markerIcons = {
  food: '🍜',
  attraction: '🏛️',
  activity: '🎉',
  hotel: '🏨',
  transport: '🚗'
}
