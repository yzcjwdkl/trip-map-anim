# [CONTRACT] useTripDetail.ts

> 文档化接口契约 · 对应 `tech-spec-card-detail.md` §4.1
> 实际实现：`src/components/business/trip-detail/useTripDetail.js`
> 本文件保留 TypeScript 类型作为静态分析参考；实现本身为 JS

---

## 文件位置

```
src/components/business/trip-detail/useTripDetail.ts   ← 契约（TSdoc）
src/components/business/trip-detail/useTripDetail.js   ← 实际实现
```

---

## 类型定义

```typescript
// ── 数据模型 ─────────────────────────────────────────────

/** 单个行程节点 */
interface TripNode {
  id: string
  name: string
  amapMarkerId?: string
  lngLat?: [number, number]         // [lng, lat]
  visitedAt?: string                 // ISO datetime，已访问时存在
  position?: { lng: number; lat: number }
  type?: string
  description?: string
  travelTypeToHere?: 'fly' | 'drive'
}

/** 行程数据 */
interface TripData {
  id: string | number
  name: string
  points: TripNode[]                // ⚠️ 实现用 points，spec §4.1 写 nodes
}

/** 相邻三点流 */
interface PointFlow {
  prev: TripNode | null
  current: TripNode | null
  next: TripNode | null
}

// ── Composables 接口 ───────────────────────────────────────

interface UseTripDetail {
  // 数据（只读 ref）
  trip: import('vue').ComputedRef<TripData | null>
  currentIndex: import('vue').Ref<number>
  totalNodes: import('vue').ComputedRef<number>    // points.length
  progressPercent: import('vue').ComputedRef<number>  // 0-100

  // UI 状态
  isPlaying: import('vue').Ref<boolean>
  mapReady: import('vue').Ref<boolean>
  currentSpeed: import('vue').Ref<number>
  speeds: readonly [0.5, 1, 2, 4]

  // 导航
  pointFlow: import('vue').ComputedRef<PointFlow>

  // GSAP 生命周期（每个组件 onMounted/onUnmounted 必须调用）
  /**
   * 在 el 上创建 gsap.context(cb)，回调中注册所有动画 tween/timeline。
   * 禁止在 ctx 外直接调用 gsap.to()/gsap.from() 操作 DOM。
   * @param el Element  组件根元素 ref.value
   * @param cb ()=>void  动画注册回调，this 绑定到 ctx
   * @returns gsap.Context
   */
  setupCtx(el: Element, cb: () => void): gsap.Context

  /**
   * 调用 ctxHolder.ctx?.revert()，清理所有 tween/timeline。
   * 只在组件 onUnmounted 中调用一次。
   */
  revertCtx(): void

  // Actions
  setCurrentIndex(idx: number): void
  setMapReady(val: boolean): void
  setPlaying(val: boolean): void
  setSpeed(val: number): void
}

// ── 组件 Props/Events ─────────────────────────────────────

interface TripDetailHeaderProps {
  tripName: string
  pointCount: number
  isPlaying: boolean
  mapReady: boolean
}

interface TripDetailHeaderEmits {
  (e: 'back'): void
  (e: 'toggle-play'): void
  (e: 'next-step'): void
  (e: 'reset'): void
}

interface ProgressNodesBarProps {
  points: TripNode[]
  currentIndex: number
  progressPercent: number
}

interface ProgressNodesBarEmits {
  (e: 'node-click', index: number): void
}
```

---

## 关键实现约束（来自 spec §3）

| 约束 | 正确做法 |
|------|---------|
| DOM 获取 | `headerRef.value`，禁止 `document.querySelector` |
| GSAP 初始化 | `ctx = gsap.context(() => { ... }, el)` |
| GSAP 清理 | `onUnmounted(() => ctx?.revert())` |
| 全局 tween | ❌ 禁止；所有挂在 ctx 上 |
| 跨组件共享 tween | ❌ 禁止；使用 `useTripDetail()` 状态共享 |
| Vue reactivity | `shallowRef` 用于动画相关状态 |
| SSR | `process.client` 守卫所有 GSAP 调用 |

---

## 验收检查点（spec §7）

```
[ ] 组件路径在 src/components/business/trip-detail/ 下
[ ] 每个组件 onMounted 创建 ctx，onUnmounted 调用 ctx.revert()
[ ] DOM 获取全部使用 Vue ref，禁止 document.querySelector
[ ] GSAP 入场 Timeline stagger，总时长 ~0.6s
[ ] 工具栏 accordion scaleX 0→1, 0.4s
[ ] 侧边栏 x 100%→0%, 0.55s
[ ] 移动端 < 768px 单列，地图 2D
[ ] LCP ≤ 2.5s, ≥55fps
```