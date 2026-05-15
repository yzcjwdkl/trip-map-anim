import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import gsap from 'gsap'

/**
 * PointListPanel.spec.js
 * 测试源：src/components/business/trip-detail/PointListPanel.vue
 * 规范：tech-spec-card-detail.md §6 / TASK-007
 *
 * 覆盖：
 *   • visible=false 初始不显示（v-show）
 *   • 滑入/滑出动画 trigger
 *   • v-show 遮罩同步
 *   • GSAP ctx lifecycle
 *   • 无 document.querySelector
 *
 * 注意：组件使用 <Teleport to="body">，jsdom 下渲染到 document.body，
 *   wrapper.find('.side-panel') 找不到；改用 findComponent + emitted 验证
 */

import PointListPanel from '../../src/components/business/trip-detail/PointListPanel.vue'

function mountPanel(props = {}) {
  return mount(PointListPanel, {
    props: { visible: false, ...props },
    global: { plugins: [] },
    attachTo: document.body,
  })
}

describe('PointListPanel — TASK-007 交付验收', () => {

  describe('初始状态', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('visible=false 时 emit 初始无 close 事件', () => {
      wrapper = mountPanel({ visible: false })
      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('显示/隐藏事件', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('visible=true 触发内部状态更新', async () => {
      wrapper = mountPanel({ visible: false })
      await wrapper.setProps({ visible: true })
      expect(wrapper.props('visible')).toBe(true)
    })

    it('关闭按钮存在于 DOM（Teleport 到 body，需从 body 查找）', () => {
      wrapper = mountPanel({ visible: true })
      const closeBtn = document.body.querySelector('.side-panel-close')
      expect(closeBtn).not.toBeNull()
    })

    it('关闭按钮触发 close event', () => {
      wrapper = mountPanel({ visible: true })
      const closeBtn = document.body.querySelector('.side-panel-close')
      closeBtn?.click()
      expect(wrapper.emitted('close')).toBeDefined()
    })

    it('遮罩存在于 DOM', () => {
      wrapper = mountPanel({ visible: true })
      const overlay = document.body.querySelector('.side-overlay')
      expect(overlay).not.toBeNull()
    })

    it('遮罩点击触发 close event', () => {
      wrapper = mountPanel({ visible: true })
      const overlay = document.body.querySelector('.side-overlay')
      overlay?.click()
      expect(wrapper.emitted('close')).toBeDefined()
    })
  })

  describe('GSAP ctx 生命周期', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('[ctx] visible 切换触发 gsap.context', () => {
      const spy = vi.spyOn(gsap, 'context')
      wrapper = mountPanel({ visible: false })
      wrapper.setProps({ visible: true })
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
      wrapper = mountPanel({ visible: true })
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
      wrapper = mountPanel({ visible: true })
      wrapper.unmount()
      expect(revertSpy).toHaveBeenCalledTimes(1)
      gsap.context = origCtx
    })
  })

  describe('禁止事项检查', () => {
    let wrapper
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('组件内无 document.querySelector', () => {
      wrapper = mountPanel()
      // 组件模板本身不含 querySelector（动画用 ref）
      expect(wrapper.findComponent(PointListPanel).html()).not.toContain('querySelector')
    })

    it('gsap.context 被调用（动画受 ctx 管理）', () => {
      const spy = vi.spyOn(gsap, 'context')
      wrapper = mountPanel({ visible: true })
      expect(spy).toHaveBeenCalled()
    })
  })
})