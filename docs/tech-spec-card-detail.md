# 技术规格 - 卡片详情页 Z 型布局 + GSAP 动画

> 版本：v1.1
> 状态：Draft
> 创建日期：2026-05-15
> 基于：PRD v3.0 (docs/prd-card-detail-layout.md)
> 评估者：Architect

---

## 1. 技术可行性评估

### 1.1 整体评估：✅ 可行

| 维度 | 评估 | 风险等级 |
|------|------|---------|
| 布局复杂度 | 多栏 flex/grid 布局，Z 型嵌套结构可实现 | 低 |
| GSAP 动画 | gsap.context() + Vue lifecycle，成熟方案 | 低 |
| AMap 集成 | getContentDom() 获取原生 DOM，GSAP 可操控 | 中 |
| 响应式 | 768px 断点，CSS 媒体查询 + Vue reactive | 低 |
| 性能目标 | LCP ≤ 2.5s，≥55fps，需刻意优化 | 中 |

### 1.2 关键技术决策

#### 动画引擎选型
- **方案**：GSAP 3.x
- **Vue 集成规范**：
  - 每个组件实例创建独立 `gsap.context()`
  - 所有 selector 使用 Vue `ref` 绑定，禁止 `document.querySelector`
  - `onUnmounted` 调用 `ctx.revert()` 清理所有动画
- **禁止项**：
  - 禁止使用全局 `gsap.to()` / `gsap.from()` 直接操作 DOM
  - 禁止在组件外留存 tween 引用
  - 禁止 `document.querySelector` 获取 DOM 元素

#### 状态管理
- **方案**：Vue 3 Composition API + `ref()` / `computed()` / `shallowRef`
- **理由**：组件级状态，无需 Pinia；`shallowRef` 避免深度 proxy 干扰 GSAP

#### AMap DOM 操控
- **方案**：marker.getContentDom() 获取原生元素，封装 `useMarkerRef(marker)` 返回 `Ref<HTMLElement | null>`
- **风险缓解**：AMap 5.x+ 返回原生 div，GSAP 可直接操作；降级用 `querySelector`
- **Vue 集成**：在 `onMounted` 中通过 `gsap.context()` 绑定，避免泄漏

---

## 2. 系统架构

### 2.1 组件结构（必须在 `src/components/business/` 下）

```
src/components/
├── TripDetail.vue                     # 页面容器组件（位置不变）
└── business/
    └── trip-detail/
        ├── TripDetailHeader.vue        # 顶部信息栏 (A1/A2/A3/B)
        ├── ProgressNodesBar.vue        # 进度节点脊柱 (嵌入 header)
        ├── StatusRow.vue               # 状态行 (D/E/F/G)
        ├── BottomToolbar.vue           # 底部工具栏
        ├── PointListPanel.vue          # 点位列表面板
        ├── SettingsPanel.vue           # 设置面板
        └── MapContainer.vue            # 高德地图容器

src/composables/
└── useTripDetail.ts                   # 状态管理 composable

src/utils/
└── gsap-helpers.ts                    # GSAP 工具函数（内部封装 ctx 管理）
```

> ⚠️ 禁止在 `src/components/` 下新建 `trip-detail/` 目录，所有业务组件必须放在 `business/` 下

### 2.2 状态流

```
tripId (route param)
    ↓
useTripDetail(tripId) composable
    ├── tripData: Ref<TripData | null>
    ├── currentIndex: Ref<number>
    ├── progressPercent: ComputedRef<number>
    ├── isPlaying: Ref<boolean>
    ├── showPointList: Ref<boolean>
    └── showSettings: Ref<boolean>
    ↓
TripDetail.vue (容器)
    ↓ props
各业务子组件（business/trip-detail/）
```

---

## 3. GSAP 动画规范（强制）

### 3.1 gsap.context() 使用规范

每个组件必须按以下模式使用：

```typescript
// ✅ 正确模式
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

export default defineComponent({
  setup() {
    // 1. 创建 Vue ref 绑定 DOM
    const headerRef = ref<HTMLElement | null>(null)
    const nodesRef = ref<HTMLElement | null>(null)
    
    // 2. 在 onMounted 中创建 context
    let ctx: gsap.Context | null = null
    
    onMounted(() => {
      ctx = gsap.context(() => {
        // 所有动画在这里注册，使用 Vue ref 而非 querySelector
        const tl = gsap.timeline()
        tl.from(headerRef.value, { y: -20, opacity: 0 })
          .from(nodesRef.value, { opacity: 0 }, '-=0.2')
      })
    })
    
    // 3. 在 onUnmounted 中 revert
    onUnmounted(() => {
      ctx?.revert()  // 清理所有 tweens 和 timelines
    })
    
    return { headerRef, nodesRef }
  }
})
```

### 3.2 禁止事项

| 禁止 | 正确做法 |
|------|---------|
| `document.querySelector('.back-btn')` | `const backBtn = backBtnRef.value` |
| `gsap.to('.node', {...})` | `gsap.to(nodeRef.value, {...})` |
| 全局 tween | 所有 tween 挂在 `ctx` 上 |
| `onMounted` 直接调用 `gsap.to()` | `ctx = gsap.context(() => {...})` |
| 跨组件共享 tween | 使用 `useTripDetail()` 管理状态，动画在各自组件内响应 |
| `ctx = null` 而不 revert | `ctx?.revert()` 确保清理 |

### 3.3 动画注册点

| 生命周期 | 操作 |
|---------|------|
| `onMounted` | 创建 `gsap.context()`，注册入场动画 |
| `watch(currentIndex)` | 通过 `ctx` 更新节点激活动画 |
| `watch(progressPercent)` | 通过 `ctx` 更新环形进度 tween |
| `onUnmounted` | `ctx.revert()` 清理所有动画 |

---

## 4. 接口设计

### 4.1 Composables

```typescript
// src/composables/useTripDetail.ts
export interface TripDetailComposable {
  // 数据（只读 ref）
  tripData: Ref<TripData | null>
  currentIndex: Ref<number>
  totalNodes: ComputedRef<number>
  progressPercent: ComputedRef<number>
  
  // UI 状态
  isPlaying: Ref<boolean>
  showPointList: Ref<boolean>
  showSettings: Ref<boolean>
  
  // Actions
  play(): void
  pause(): void
  next(): Promise<void>
  prev(): Promise<void>
  reset(): void
  navigateTo(index: number): Promise<void>
  openPointList(): void
  closePointList(): void
  openSettings(): void
  closeSettings(): void
  
  // 清理（由 onUnmounted 调用）
  dispose(): void
}

export interface TripData {
  id: string
  name: string
  startDate: string  // ISO date
  endDate: string
  nodes: TripNode[]
}

export interface TripNode {
  id: string
  name: string
  amapMarkerId: string
  lngLat: [number, number]  // [lng, lat]
  visitedAt?: string  // ISO datetime
}
```

### 4.2 组件 Props/Events

```typescript
// TripDetailHeader.vue
export interface HeaderProps {
  tripName: string
  dateRange: string
  nodeCount: number
  isPlaying: boolean
}

// ProgressNodesBar.vue
export interface NodesBarProps {
  nodes: TripNode[]
  currentIndex: number
}
export interface NodesBarEmits {
  (e: 'nodeClick', index: number): void
}

// StatusRow.vue
export interface StatusRowProps {
  currentIndex: number
  totalNodes: number
  progressPercent: number
  pointFlow: [string, string, string]  // [prev, current, next]
  nextPreview?: { name: string; eta: string }
}

// MapContainer.vue
export interface MapContainerProps {
  nodes: TripNode[]
  currentIndex: number
}
```

### 4.3 关键外部接口

| 接口 | 协议 | 说明 |
|------|------|------|
| `GET /api/trips/:id` | REST | 获取行程详情 |
| `GET /api/trips/:id/nodes` | REST | 获取节点列表 |
| `AMap.Marker.getContentDom()` | SDK | 获取 marker DOM（必须在 ctx 内使用） |

---

## 5. 技术债务与风险

### 5.1 高优先级

| 风险 | 缓解 |
|------|------|
| GSAP 内存泄漏 | 每个组件 `ctx.revert()`，禁止全局 tween |
| AMap DOM 操控不稳定 | `useMarkerRef()` 封装，降级到 `querySelector` |
| Vue reactivity 干扰动画 | `shallowRef` 管理动画相关状态 |

### 5.2 中优先级

| 债务 | 说明 |
|------|------|
| SSR 兼容性 | `process.client` 守卫所有 GSAP 调用 |
| AMap 版本锁定 | 指定 `^2.0` 避免 breaking changes |
| 移动端 GSAP 性能 | `quickTo` 限制实例数量，禁用复杂 stagger |

---

## 6. 文件清单（修订后）

### 新增（必须在指定路径）

```
src/
├── components/
│   └── business/
│       └── trip-detail/
│           ├── TripDetailHeader.vue
│           ├── ProgressNodesBar.vue
│           ├── StatusRow.vue
│           ├── BottomToolbar.vue
│           ├── PointListPanel.vue
│           ├── SettingsPanel.vue
│           └── MapContainer.vue
├── composables/
│   └── useTripDetail.ts
└── utils/
    └── gsap-helpers.ts
```

### 修改

```
src/components/TripDetail.vue  # 重构为容器，引 useTripDetail
src/router/index.ts            # 路由配置（如有）
src/style.css                  # 全局样式变量
```

---

## 7. 验收检查点

| 检查点 | 判定条件 |
|--------|---------|
| 组件路径 | 所有子组件在 `src/components/business/trip-detail/` 下 |
| gsap.context() | 每个组件 `onMounted` 创建 ctx，`onUnmounted` 调用 `ctx.revert()` |
| DOM 获取 | 全部使用 Vue `ref`，禁止 `document.querySelector` |
| Z 型布局 | A/B 行 5+ 个独立 div，多栏排列 |
| 进度节点 | 嵌入式，非独立占行 |
| GSAP 入场 | Timeline stagger，总时长 ~0.6s |
| 环形进度 | stroke-dashoffset 动画 0.6s |
| 工具栏 accordion | scaleX 0→1, 0.4s |
| 侧边栏 | x 100%→0%, 0.55s |
| 移动端 | < 768px 单列，地图 2D |
| 性能 | LCP ≤ 2.5s, ≥55fps |