import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import gsap from 'gsap'

/**
 * TripDetailHeader.spec.js
 * 测试源：src/components/business/trip-detail/TripDetailHeader.vue
 * 规范：tech-spec-card-detail.md §3（gsap.context 生命周期）+ §4.2（Props/Events）
 *
 * 覆盖范围：
 *   • Props 渲染（tripName / pointCount / isPlaying / mapReady）
 *   • Events 触发（back / toggle-play / next-step / reset）
 *   • GSAP ctx 生命周期（onMounted 创建 / onUnmounted revert）
 */

// 静态导入（避免 @vue/test-utils 的 defineAsyncComponent bug）
import TripDetailHeader from '../../src/components/business/trip-detail/TripDetailHeader.vue'

const DEFAULT_PROPS = {
  tripName: '北京三日游',
  pointCount: 5,
  isPlaying: false,
  mapReady: true,
}

function mountHeader(props = {}) {
  return mount(TripDetailHeader, {
    props: { ...DEFAULT_PROPS, ...props },
    global: { plugins: [] },
    attachTo: document.body,
  })
}

// ─── Suite: Props 渲染 ────────────────────────────────────────

describe('TripDetailHeader — Props 渲染', () => {
  let wrapper
  afterEach(() => { wrapper?.unmount(); wrapper = null })

  it('renders tripName as heading text', () => {
    wrapper = mountHeader({ tripName: '上海半日游' })
    const nameEl = wrapper.find('.detail-trip-name')
    expect(nameEl.exists()).toBe(true)
    expect(nameEl.text()).toBe('上海半日游')
  })

  it('renders pointCount as badge text', () => {
    wrapper = mountHeader({ pointCount: 3 })
    const badge = wrapper.find('.count-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('3 个地点')
  })

  it('renders pointCount=0 gracefully', () => {
    wrapper = mountHeader({ pointCount: 0 })
    expect(wrapper.find('.count-badge').text()).toBe('0 个地点')
  })

  it('isPlaying=true applies .active class to play button', () => {
    wrapper = mountHeader({ isPlaying: true, mapReady: true })
    expect(wrapper.find('.ctrl-icon-btn.play').classes()).toContain('active')
  })

  it('isPlaying=false removes .active class from play button', () => {
    wrapper = mountHeader({ isPlaying: false })
    expect(wrapper.find('.ctrl-icon-btn.play').classes()).not.toContain('active')
  })

  it('mapReady=false disables play button', () => {
    wrapper = mountHeader({ mapReady: false, isPlaying: false })
    expect(wrapper.find('.ctrl-icon-btn.play').attributes('disabled')).toBeDefined()
  })

  it('mapReady=true does not disable play button', () => {
    wrapper = mountHeader({ mapReady: true, isPlaying: false })
    expect(wrapper.find('.ctrl-icon-btn.play').attributes('disabled')).toBeUndefined()
  })

  it('renders back button always enabled regardless of mapReady', () => {
    wrapper = mountHeader({ mapReady: false })
    expect(wrapper.find('.back-btn').attributes('disabled')).toBeUndefined()
  })

  it('renders next-step button always enabled regardless of mapReady', () => {
    wrapper = mountHeader({ mapReady: false })
    expect(wrapper.find('.ctrl-icon-btn[title="下一步"]').attributes('disabled')).toBeUndefined()
  })

  it('renders reset button always enabled', () => {
    wrapper = mountHeader({ mapReady: false })
    expect(wrapper.find('.ctrl-icon-btn[title="重置"]').attributes('disabled')).toBeUndefined()
  })

  it('renders play button icon exists when not playing', () => {
    wrapper = mountHeader({ isPlaying: false })
    expect(wrapper.find('.ctrl-icon-btn.play svg').exists()).toBe(true)
  })

  it('renders play button icon exists when playing', () => {
    wrapper = mountHeader({ isPlaying: true, mapReady: true })
    expect(wrapper.find('.ctrl-icon-btn.play svg').exists()).toBe(true)
  })
})

// ─── Suite: Events ─────────────────────────────────────────────

describe('TripDetailHeader — Events', () => {
  let wrapper
  afterEach(() => { wrapper?.unmount(); wrapper = null })

  it('emits "back" when back button clicked', () => {
    wrapper = mountHeader()
    wrapper.find('.back-btn').trigger('click')
    expect(wrapper.emitted('back')).toBeDefined()
    expect(wrapper.emitted('back').length).toBe(1)
  })

  it('emits "toggle-play" when play button clicked (mapReady=true)', () => {
    wrapper = mountHeader({ mapReady: true })
    wrapper.find('.ctrl-icon-btn.play').trigger('click')
    expect(wrapper.emitted('toggle-play')).toBeDefined()
    expect(wrapper.emitted('toggle-play').length).toBe(1)
  })

  it('emits "toggle-play" once on each rapid click', () => {
    wrapper = mountHeader({ mapReady: true })
    const btn = wrapper.find('.ctrl-icon-btn.play')
    btn.trigger('click'); btn.trigger('click'); btn.trigger('click')
    expect(wrapper.emitted('toggle-play')?.length).toBe(3)
  })

  it('emits "next-step" when next-step button clicked', () => {
    wrapper = mountHeader()
    wrapper.find('.ctrl-icon-btn[title="下一步"]').trigger('click')
    expect(wrapper.emitted('next-step')).toBeDefined()
    expect(wrapper.emitted('next-step').length).toBe(1)
  })

  it('emits "reset" when reset button clicked', () => {
    wrapper = mountHeader()
    wrapper.find('.ctrl-icon-btn[title="重置"]').trigger('click')
    expect(wrapper.emitted('reset')).toBeDefined()
    expect(wrapper.emitted('reset').length).toBe(1)
  })

  it('does NOT emit toggle-play when play button disabled (map not ready)', () => {
    wrapper = mountHeader({ mapReady: false, isPlaying: false })
    wrapper.find('.ctrl-icon-btn.play').trigger('click')
    expect(wrapper.emitted('toggle-play')).toBeUndefined()
  })

  it('back button does NOT emit toggle-play', () => {
    wrapper = mountHeader()
    wrapper.find('.back-btn').trigger('click')
    expect(wrapper.emitted('toggle-play')).toBeUndefined()
  })
})

// ─── Suite: GSAP ctx 生命周期 ─────────────────────────────────

describe('TripDetailHeader — GSAP ctx 生命周期', () => {
  let wrapper
  afterEach(() => { wrapper?.unmount(); wrapper = null })

  it('[ctx] onMounted creates gsap.context', () => {
    const spy = vi.spyOn(gsap, 'context')
    wrapper = mountHeader()
    expect(spy).toHaveBeenCalled()
  })

  it('[ctx] onUnmounted calls ctx.revert()', () => {
    const revertSpy = vi.fn()
    const origCtx = gsap.context
    gsap.context = (cb, el) => {
      const ctx = origCtx.call(gsap, cb, el)
      ctx.revert = revertSpy
      return ctx
    }
    wrapper = mountHeader()
    wrapper.unmount()
    expect(revertSpy).toHaveBeenCalled()
    gsap.context = origCtx
  })

  it('[ctx] ctx.revert is called exactly once on unmount', () => {
    const revertSpy = vi.fn()
    const origCtx = gsap.context
    gsap.context = (cb, el) => {
      const ctx = origCtx.call(gsap, cb, el)
      ctx.revert = revertSpy
      return ctx
    }
    wrapper = mountHeader()
    wrapper.unmount()
    expect(revertSpy).toHaveBeenCalledTimes(1)
    gsap.context = origCtx
  })

  it('[ctx] component exposes entrance() method', () => {
    wrapper = mountHeader()
    expect(typeof wrapper.vm.entrance).toBe('function')
  })

  it('[ctx] entrance() creates a new gsap context', () => {
    const spy = vi.spyOn(gsap, 'context')
    const origCtx = gsap.context
    gsap.context = (cb, el) => {
      const ctx = origCtx.call(gsap, cb, el)
      return ctx
    }
    wrapper = mountHeader()
    const before = spy.mock.calls.length
    wrapper.vm.entrance()
    expect(spy.mock.calls.length).toBeGreaterThan(before)
    gsap.context = origCtx
  })
})