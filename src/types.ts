export type TrafficMode = 'overview' | 'congestion' | 'transit' | 'incident'

export interface TrafficEvent {
  id: number
  time: string
  title: string
  location: string
  level: '紧急' | '警告' | '提示'
  status: string
}

export interface DistrictData {
  name: string
  speed: number
  flow: number
  efficiency: number
}
