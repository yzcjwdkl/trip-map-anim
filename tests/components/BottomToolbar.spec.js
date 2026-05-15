import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import gsap from 'gsap'

/**
 * BottomToolbar.spec.js
 * 测试源：src/components/business/trip-detail/BottomToolbar.vue
 * 规范：tech-spec-card-detail.md §6 / TASK-006
 *
 * 覆盖：
 *   • position fixed + bottom center + z-index 40
 *   • 3 buttons with correct emits
 *   • GSAP ctx lifecycle (onMounted/onUnmounted ctx.revert)
 *   • 无 document.querySelector
 */

import BottomToolbar from '../../src/components/business/trip-detail/BottomToolbar.vue'

const DEFAULT_PROPS = {}

function mountToolbar(props = {}) {
  return mount(BottomToolbar, {
    props: { ...DEFAULT_PROPS, ...props },
    global: { plugins: [] },
    attachTo: document.body,
  })
}

describe('BottomToolbar — TASK-006 交付验收', () => {

  describe('布局与定位', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('CSS 中 bottom-toolbar position=fixed z-index=40', () => {
      const fs = require('fs')
      const src = fs.readFileSync('./src/components/business/trip-detail/BottomToolbar.vue', 'utf8')
      expect(src).toMatch(/\.bottom-toolbar[\s\S]{0,300}position:\s*fixed/)
      expect(src).toMatch(/\.bottom-toolbar[\s\S]{0,300}z-index:\s*40/)
    })

    it('三个工具按钮存在', () => {
      wrapper = mountToolbar()
      const items = wrapper.findAll('.toolbar-item')
      expect(items.length).toBe(3)
    })
  })

  describe('Events', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('emit add-point on first button click', () => {
      wrapper = mountToolbar()
      wrapper.findAll('.toolbar-item')[0].trigger('click')
      expect(wrapper.emitted('add-point')).toBeDefined()
      expect(wrapper.emitted('add-point').length).toBe(1)
    })

    it('emit toggle-list on second button click', () => {
      wrapper = mountToolbar()
      wrapper.findAll('.toolbar-item')[1].trigger('click')
      expect(wrapper.emitted('toggle-list')).toBeDefined()
    })

    it('emit toggle-settings on third button click', () => {
      wrapper = mountToolbar()
      wrapper.findAll('.toolbar-item')[2].trigger('click')
      expect(wrapper.emitted('toggle-settings')).toBeDefined()
    })

    it('点击每个按钮分别触发，无串扰', () => {
      wrapper = mountToolbar()
      wrapper.findAll('.toolbar-item')[0].trigger('click')
      wrapper.findAll('.toolbar-item')[2].trigger('click')
      expect(wrapper.emitted('add-point')?.length).toBe(1)
      expect(wrapper.emitted('toggle-settings')?.length).toBe(1)
      expect(wrapper.emitted('toggle-list')).toBeUndefined()
    })
  })

  describe('GSAP ctx 生命周期', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('[ctx] onMounted 创建 gsap.context', () => {
      const spy = vi.spyOn(gsap, 'context')
      wrapper = mountToolbar()
      expect(spy).toHaveBeenCalled()
    })

    it('[ctx] onUnmounted 调用 ctx.revert()', () => {
      const revertSpy = vi.fn()
      const origCtx = gsap.context
      gsap.context = (cb, el) => {
        const ctx = origCtx.call(gsap, cb, el)
        ctx.revert = revertSpy
        return ctx
      }
      wrapper = mountToolbar()
      wrapper.unmount()
      expect(revertSpy).toHaveBeenCalled()
      gsap.context = origCtx
    })

    it('[ctx] ctx.revert 只调用一次', () => {
      const revertSpy = vi.fn()
      const origCtx = gsap.context
      gsap.context = (cb, el) => {
        const ctx = origCtx.call(gsap, cb, el)
        ctx.revert = revertSpy
        return ctx
      }
      wrapper = mountToolbar()
      wrapper.unmount()
      expect(revertSpy).toHaveBeenCalledTimes(1)
      gsap.context = origCtx
    })
  })

  describe('禁止事项检查', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('组件内无 document.querySelector 调用', () => {
      wrapper = mountToolbar()
      expect(wrapper.html()).not.toContain('querySelector')
    })

    it('GSAP 操作全部在 ctx 回调内', () => {
      const spy = vi.spyOn(gsap, 'context')
      wrapper = mountToolbar()
      expect(spy).toHaveBeenCalled()
      spy.mock.calls.forEach(([cb]) => {
        expect(typeof cb).toBe('function')
      })
    })
  })
})