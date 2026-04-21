import { shallowRef, onUnmounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { shallowRef as shallowRefCore } from 'vue'
import type AMap from 'AMap'

export function useAMap() {
  const mapInstance = shallowRefCore<AMap.Map | null>(null)
  const mapLoaded   = shallowRef(false)
  let   _map: AMap.Map | null = null

  async function initMap(containerId: string) {
    const key    = import.meta.env.VITE_AMAP_KEY         || ''
    const secCode = import.meta.env.VITE_AMAP_SECURITY_CODE || ''

    // 安全密钥配置
    window._AMapSecurityConfig = {
      securityJsCode: secCode,
    }

    const AMap = await AMapLoader.load({
      key,
      version: '2.0',
      plugins: [],
    })

    _map = new AMap.Map(containerId, {
      zoom:   5,
      center: [105, 36],
      mapStyle: 'amap://styles/whitesmoke', // 浅色地图，配暖色 UI
      viewMode: '3D',
      pitch: 30,
    })

    mapInstance.value = _map
    mapLoaded.value   = true

    return _map
  }

  function getMap() {
    return _map
  }

  onUnmounted(() => {
    _map?.destroy()
    _map = null
  })

  return { mapInstance, mapLoaded, initMap, getMap }
}
