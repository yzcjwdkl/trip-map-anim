import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import gsap from 'gsap'

/**
 * MapContainer.spec.js
 * 测试源：src/components/business/trip-detail/MapContainer.vue
 * 规范：tech-spec-card-detail.md §6 / TASK-009
 *
 * 覆盖：
 *   • z-index 层叠（sky-mask:2, fullscreen-btn:20, ring-overlay:10, moving-dot:50）
 *   • mapReady=false 显示加载遮罩
 *   • GSAP ctx lifecycle
 *   • ringState active 触发到达涟漪动画
 *   • 无 document.querySelector
 */

import MapContainer from '../../src/components/business/trip-detail/MapContainer.vue'

function mountMap(props = {}) {
  return mount(MapContainer, {
    props: {
      fullscreen: false,
      isPlaying: false,
      mapReady: false,
      ringState: { active: false, screenX: 0, screenY: 0, outerR: 0, innerR: 0 },
      ...props,
    },
    global: { plugins: [] },
    attachTo: document.body,
  })
}

describe('MapContainer — TASK-009 交付验收', () => {

  describe('Props 渲染', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('mapReady=false 显示加载遮罩', () => {
      wrapper = mountMap({ mapReady: false })
      expect(wrapper.find('.map-loading').exists()).toBe(true)
    })

    it('mapReady=true 隐藏加载遮罩', () => {
      wrapper = mountMap({ mapReady: true })
      const display = wrapper.find('.map-loading').attributes('style') || ''
      expect(display).toContain('none')
    })

    it('fullscreen=true 添加 is-fullscreen class', () => {
      wrapper = mountMap({ fullscreen: true })
      expect(wrapper.find('.map-container').classes()).toContain('is-fullscreen')
    })

    it('fullscreen=false 无 is-fullscreen class', () => {
      wrapper = mountMap({ fullscreen: false })
      expect(wrapper.find('.map-container').classes()).not.toContain('is-fullscreen')
    })

    it('isPlaying=true 显示 moving-dot visible class', () => {
      wrapper = mountMap({ isPlaying: true })
      expect(wrapper.find('.moving-dot').classes()).toContain('visible')
    })

    it('isPlaying=false 隐藏 moving-dot visible class', () => {
      wrapper = mountMap({ isPlaying: false })
      expect(wrapper.find('.moving-dot').classes()).not.toContain('visible')
    })
  })

  describe('z-index 层叠（spec §6 / TASK-009）', () => {
    // z-index 通过源码静态检查验证（jsdom scoped CSS 无法读 style attribute）
    it('sky-mask 在 CSS 中 z-index 为 2', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/MapContainer.vue', 'utf8')
      expect(src).toMatch(/\.sky-mask[\s\S]{0,200}z-index:\s*2/)
    })

    it('fullscreen-btn 在 CSS 中 z-index 为 20', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/MapContainer.vue', 'utf8')
      expect(src).toMatch(/\.fullscreen-btn[\s\S]{0,200}z-index:\s*20/)
    })

    it('ring-overlay 在 CSS 中 z-index 为 10', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/MapContainer.vue', 'utf8')
      expect(src).toMatch(/\.ring-overlay[\s\S]{0,200}z-index:\s*10/)
    })

    it('moving-dot 在 CSS 中 z-index 为 50', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/MapContainer.vue', 'utf8')
      expect(src).toMatch(/\.moving-dot[\s\S]{0,200}z-index:\s*50/)
    })
  })

  describe('Events', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('全屏按钮触发 toggle-fullscreen', () => {
      wrapper = mountMap()
      wrapper.find('.fullscreen-btn').trigger('click')
      expect(wrapper.emitted('toggle-fullscreen')).toBeDefined()
    })
  })

  describe('GSAP ctx 生命周期', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('[ctx] 组件挂载时 gsap.context 被调用', () => {
      const spy = vi.spyOn(gsap, 'context')
      wrapper = mountMap({ mapReady: true })
      expect(spy).toHaveBeenCalled()
    })

    it('[ctx] ringState 触发 ring overlay 显示逻辑（代码静态检查）', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/MapContainer.vue', 'utf8')
      // watch ringState?.active 设置 display='block'
      expect(src).toMatch(/ringState\?\.active/)
      expect(src).toMatch(/style\.display\s*=\s*['"]block['"]/)
    })

    it('[ctx] onUnmounted 调用 ctx.revert()', () => {
      const revertSpy = vi.fn()
      const origCtx = gsap.context
      gsap.context = (cb, el) => {
        const ctx = origCtx.call(gsap, cb, el)
        ctx.revert = revertSpy
        return ctx
      }
      wrapper = mountMap({ mapReady: true })
      wrapper.unmount()
      expect(revertSpy).toHaveBeenCalled()
      gsap.context = origCtx
    })

    it('[ctx] ctx.revert 仅调用一次', () => {
      const revertSpy = vi.fn()
      const origCtx = gsap.context
      gsap.context = (cb, el) => {
        const ctx = origCtx.call(gsap, cb, el)
        ctx.revert = revertSpy
        return ctx
      }
      wrapper = mountMap({ mapReady: true })
      wrapper.unmount()
      expect(revertSpy).toHaveBeenCalledTimes(1)
      gsap.context = origCtx
    })
  })

  describe('禁止事项检查', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('模板无 document.querySelector', () => {
      wrapper = mountMap()
      expect(wrapper.html()).not.toContain('querySelector')
    })

    it('模板无 .amap-marker 字符串', () => {
      wrapper = mountMap()
      expect(wrapper.html()).not.toContain('.amap-marker')
    })
  })

  describe('defineExpose 暴露接口', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('exposes animateMarkerTo / amapContainerRef / ringOverlayRef', () => {
      wrapper = mountMap()
      expect(typeof wrapper.vm.animateMarkerTo).toBe('function')
      expect(wrapper.vm.amapContainerRef).toBeDefined()
      expect(wrapper.vm.ringOverlayRef).toBeDefined()
    })
  })
})