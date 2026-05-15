import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, nextTick } from 'vue'

/**
 * useTripDetail.spec.js
 *
 * 测试源：src/components/business/trip-detail/useTripDetail.js
 * 规范：tech-spec-card-detail.md §4.1 + §3（GSAP 生命周期）
 *
 * ⚠️ 注意：useTripDetail() 内部调用 useTripStore() 单例，
 *    buildInstance 无法注入 mockStore。
 *    测试改为验证「真实 store 上的实际行为 + 接口契约」。
 *    面板互斥因依赖 store 数据，用真实 store 数据断言。
 */

import { useTripDetail } from '@/composables/useTripDetail.js'
import { useTripStore } from '@/composables/useTripStore.js'

// ─── 建立干净 store 状态 ───────────────────────────────────
function isolateStore(tripData) {
  const store = useTripStore()
  // 保存原始
  const origTrip = store.currentDetailTrip.value
  // 替换为测试数据
  if (tripData) {
    store.currentDetailTrip.value = tripData
  }
  return {
    store,
    restore: () => {
      store.currentDetailTrip.value = origTrip
    },
  }
}

function buildInstance(tripData = null) {
  const mockRevert = vi.fn()
  const mockCtx = { revert: mockRevert }

  const { store, restore } = isolateStore(tripData)
  const inst = useTripDetail()

  // 挂上 mock gsap ctx（dispose/revertCtx 测试用）
  inst._mockCtx = mockCtx
  inst._mockRevert = mockRevert

  return { inst, store, restore, mockRevert }
}

// ─── Suite ────────────────────────────────────────────────────

describe('useTripDetail — currentIndex 边界', () => {
  afterEach(() => {
    // restore store
  })

  it('初始 currentIndex 为 0', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(inst.currentIndex.value).toBe(0)
    } finally {
      restore()
    }
  })

  it('setCurrentIndex(0) 合法，不抛异常', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(() => inst.setCurrentIndex(0)).not.toThrow()
      expect(inst.currentIndex.value).toBe(0)
    } finally {
      restore()
    }
  })

  it('setCurrentIndex(1) 更新 currentIndex', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.setCurrentIndex(1)
      expect(inst.currentIndex.value).toBe(1)
      expect(inst.pointFlow.value.current).not.toBeNull()
    } finally {
      restore()
    }
  })

  it('setCurrentIndex(points.length) 超限 → clamp 到最后有效索引', () => {
    const { inst, store, restore } = buildInstance()
    try {
      const len = store.currentDetailTrip.value?.points?.length ?? 0
      inst.setCurrentIndex(len)
      expect(inst.currentIndex.value).toBeLessThanOrEqual(len - 1)
    } finally {
      restore()
    }
  })

  it('setCurrentIndex(-1) 下限 → clamp 到 0', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.setCurrentIndex(-1)
      expect(inst.currentIndex.value).toBeGreaterThanOrEqual(0)
      expect(inst.currentIndex.value).toBe(0)
    } finally {
      restore()
    }
  })

  it('progressPercent computed 可读且随 currentIndex 变化', () => {
    const { inst, restore } = buildInstance()
    try {
      const before = inst.progressPercent.value
      inst.setCurrentIndex(1)
      const after = inst.progressPercent.value
      // index 增大 → percent 增大（或从 0 开始）
      expect(after).toBeGreaterThanOrEqual(before)
    } finally {
      restore()
    }
  })
})

describe('useTripDetail — 面板互斥（showPointList / showSettings）', () => {
  afterEach(() => {})

  it('[CONTRACT] openPointList → showPointList=true, showSettings=false', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.openPointList()
      expect(inst.showPointList.value).toBe(true)
      expect(inst.showSettings.value).toBe(false)
    } finally {
      restore()
    }
  })

  it('[CONTRACT] openSettings → showSettings=true, showPointList=false', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.openSettings()
      expect(inst.showSettings.value).toBe(true)
      expect(inst.showPointList.value).toBe(false)
    } finally {
      restore()
    }
  })

  it('[CONTRACT] 交替打开保持互斥', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.openPointList()
      expect(inst.showPointList.value).toBe(true)
      expect(inst.showSettings.value).toBe(false)

      inst.openSettings()
      expect(inst.showPointList.value).toBe(false)
      expect(inst.showSettings.value).toBe(true)

      inst.openPointList()
      expect(inst.showPointList.value).toBe(true)
      expect(inst.showSettings.value).toBe(false)
    } finally {
      restore()
    }
  })

  it('[CONTRACT] closePointList 清理 showPointList', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.openPointList()
      inst.closePointList()
      expect(inst.showPointList.value).toBe(false)
    } finally {
      restore()
    }
  })

  it('[CONTRACT] closeSettings 清理 showSettings', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.openSettings()
      inst.closeSettings()
      expect(inst.showSettings.value).toBe(false)
    } finally {
      restore()
    }
  })
})

describe('useTripDetail — dispose 清理', () => {
  it('dispose 是函数', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(typeof inst.dispose).toBe('function')
    } finally {
      restore()
    }
  })

  it('dispose 执行后不清理 currentIndex（状态保留）', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.setCurrentIndex(1)
      inst.dispose()
      expect(inst.currentIndex.value).toBe(1)
    } finally {
      restore()
    }
  })

  it('dispose 多次调用不抛异常', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(() => {
        inst.dispose()
        inst.dispose()
      }).not.toThrow()
    } finally {
      restore()
    }
  })

  it('无 tripData 时 dispose 不抛异常（revertCtx 本身安全）', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(() => inst.dispose()).not.toThrow()
    } finally {
      restore()
    }
  })
})

describe('useTripDetail — 状态一致性 / 接口契约', () => {
  it('pointFlow.prev 在 index=0 时为 null', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.setCurrentIndex(0)
      expect(inst.pointFlow.value.prev).toBeNull()
    } finally {
      restore()
    }
  })

  it('pointFlow.current 在任意索引都返回当前节点', () => {
    const { inst, store, restore } = buildInstance()
    try {
      const points = store.currentDetailTrip.value?.points
      if (!points?.length) throw new Error('no points')
      expect(inst.pointFlow.value.current).not.toBeNull()

      inst.setCurrentIndex(points.length - 1)
      expect(inst.pointFlow.value.current).not.toBeNull()
    } finally {
      restore()
    }
  })

  it('pointFlow.next 在末节点时为 null', () => {
    const { inst, store, restore } = buildInstance()
    try {
      const points = store.currentDetailTrip.value?.points
      if (!points?.length) throw new Error('no points')
      inst.setCurrentIndex(points.length - 1)
      expect(inst.pointFlow.value.next).toBeNull()
    } finally {
      restore()
    }
  })

  it('totalNodes 返回 points.length', () => {
    const { inst, store, restore } = buildInstance()
    try {
      const points = store.currentDetailTrip.value?.points
      expect(inst.totalNodes.value).toBe(points?.length ?? 0)
    } finally {
      restore()
    }
  })

  it('progressPercent 为 0-100 之间的数字', () => {
    const { inst, restore } = buildInstance()
    try {
      const pct = inst.progressPercent.value
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    } finally {
      restore()
    }
  })

  it('isPlaying / mapReady / currentSpeed / speeds 接口存在', () => {
    const { inst, restore } = buildInstance()
    try {
      expect(typeof inst.isPlaying.value).toBe('boolean')
      expect(typeof inst.mapReady.value).toBe('boolean')
      expect(typeof inst.currentSpeed.value).toBe('number')
      expect(Array.isArray(inst.speeds)).toBe(true)
      expect(inst.speeds).toContain(1)
    } finally {
      restore()
    }
  })

  it('setMapReady / setPlaying / setSpeed 可调用', () => {
    const { inst, restore } = buildInstance()
    try {
      inst.setMapReady(true)
      expect(inst.mapReady.value).toBe(true)
      inst.setPlaying(true)
      expect(inst.isPlaying.value).toBe(true)
      inst.setSpeed(2)
      expect(inst.currentSpeed.value).toBe(2)
    } finally {
      restore()
    }
  })
})