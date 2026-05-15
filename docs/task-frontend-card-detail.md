# Frontend-Dev 任务单：卡片详情页 Z 型布局 + GSAP 动画

> 负责人：Frontend-Dev  
> 依赖：docs/tech-spec-card-detail.md (v1.1)  
> 状态：待认领

---

## [TASK-001] 项目结构初始化

### 实现要求

1. 创建 `src/components/business/trip-detail/` 目录（禁止在 `src/components/` 下新建 trip-detail）
2. 创建 `src/composables/useTripDetail.ts` 基础结构，导出 `TripDetailComposable` 接口
3. 创建 `src/utils/gsap-helpers.ts`，封装 `createGsapContext()` 工具函数
4. 在 `useTripDetail.ts` 中实现基础 `ref()` 状态：`tripData`, `currentIndex`, `isPlaying`, `showPointList`, `showSettings`
5. 在 `gsap-helpers.ts` 中实现 `useMarkerRef()` 封装 AMap marker DOM 获取

### 禁止事项

- 禁止在 `src/components/` 下创建任何目录
- 禁止使用 `document.querySelector` 获取 DOM 元素
- 禁止创建全局 tween 变量

### 交付标准

- [ ] `src/components/business/trip-detail/` 目录存在且为空
- [ ] `useTripDetail.ts` 导出 `TripDetailComposable` 接口
- [ ] `gsap-helpers.ts` 导出 `createGsapContext()` 和 `useMarkerRef()` 函数

---

## [TASK-002] TripDetail.vue 容器重构

### 实现要求

1. 将现有 `TripDetail.vue` 重构为容器组件
2. 从 route params 获取 `tripId`，调用 `useTripDetail(tripId)` 初始化
3. 通过 `provide/inject` 或直接 props 向下传递状态（禁止 Pinia）
4. 监听 `currentIndex` 变化，触发子组件更新
5. 在组件 `onUnmounted` 调用 `composable.dispose()` 清理

### 禁止事项

- 禁止在容器组件中直接操作 DOM 元素
- 禁止创建任何 GSAP tween（动画逻辑下沉到子组件）
- 禁止使用 `document.querySelector`

### 交付标准

- [ ] 从 route 获取 `tripId`
- [ ] `useTripDetail(tripId)` 调用成功
- [ ] 状态通过 props 传递给子组件
- [ ] `onUnmounted` 调用 `dispose()`

---

## [TASK-003] TripDetailHeader 组件

### 实现要求

1. 创建 `src/components/business/trip-detail/TripDetailHeader.vue`
2. 实现 Z 第一横五块布局（A1 返回块 / A2 行程名块 / A3 日期块 / B1 徽章 / B2 播放控制组）
3. 五块必须各自独立 `div` 包裹，多栏 flex 排列，PC 横屏填满
4. 背景 `oklch(100% 0 0 / 0.95)` + `backdrop-filter: blur(16px)`，padding `14px 32px`
5. **GSAP 动画**（必须在 `onMounted` 创建 `gsap.context()`）：
   - 入场：从 y: -20, opacity: 0 → y: 0, opacity: 1，duration 0.5s，ease: power3.out
   - 内部块 stagger：opacity 0 → 1，stagger 60ms，ease: power2.out
6. 返回按钮 hover：scale 1 → 1.05，duration 0.18s，ease: power2.out
7. 移动端 < 768px：`flex-wrap` 换行，A/B 各块自动换行

### 禁止事项

- 禁止使用 `document.querySelector` 获取 `.back-btn` 等元素（必须用 Vue ref）
- 禁止在 `onMounted` 外部调用 `gsap.to()` / `gsap.from()`
- 禁止直接操作未挂载的 DOM

### 交付标准

- [ ] 五块独立 div（A1/A2/A3/B1/B2）
- [ ] PC 多栏排列填满
- [ ] `gsap.context()` 在 `onMounted` 创建，`ctx.revert()` 在 `onUnmounted` 调用
- [ ] 返回按钮 hover 动画正常
- [ ] 移动端 < 768px flex-wrap 换行

---

## [TASK-004] ProgressNodesBar 进度节点脊柱

### 实现要求

1. 创建 `src/components/business/trip-detail/ProgressNodesBar.vue`
2. 进度节点嵌入式放置（非独立占行），通过 CSS 嵌入父组件
3. 节点状态样式：
   - 未访问：`oklch(88% 0.006 55)` 描边，空心，10px 圆点
   - 已访问：`oklch(55% 0.1 290)` 实心
   - 当前：`oklch(58% 0.14 25)` 实心 + box-shadow 发光 + scale(1.2)
4. **GSAP 动画**（使用 `gsap.context()`）：
   - 当前节点高亮：`scale 1 → 1.2`，boxShadow 发光，duration 0.3s，ease: back.out(2)
   - 新节点弹出：`scale 0 → 1.2 → 1`，duration 0.25s，ease: back.out(1.8)
5. 节点中心距 14px，最多 20 个节点显示
6. `emit('nodeClick', index)` 事件，供父组件处理导航
7. 移动端：节点缩小至 8px，间距 8px

### 禁止事项

- 禁止使用 `document.querySelector('.node-${index}')` 获取节点
- 禁止跨组件共享 tween 状态
- 禁止在 `watch` 回调中直接调用 `gsap.to()`（必须通过 ctx）

### 交付标准

- [ ] 嵌入式，非独立占行
- [ ] 三种节点状态样式正确
- [ ] 当前节点高亮弹出动画
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] `emit('nodeClick', index)` 正确触发
- [ ] 移动端缩小

---

## [TASK-005] StatusRow 状态行组件

### 实现要求

1. 创建 `src/components/business/trip-detail/StatusRow.vue`
2. 实现 Z 第二横四块布局（D 进度状态 / E 点位流向 / F 环形进度 / G 下站预览）
3. D 块：显示 "当前/总数 已游览"，flex 布局，数字 1.125rem Noto Serif SC Bold
4. E 块：三栏横向 `地点A → 地点B → 地点C`，当前地点背景 `oklch(55% 0.15 25 / 0.12)` inset shadow
5. F 块：SVG 环形进度，48×48px，r=20，底色 `oklch(88% 0.006 55)`，进度色 `oklch(58% 0.14 25)`
6. **GSAP 动画**（使用 `gsap.context()`）：
   - 进度更新：`stroke-dashoffset` 从旧值 → 新值，duration 0.6s，ease: power2.out
   - 发光环：progress > 0 时 `opacity 0 → 0.5`，duration 0.3s
   - 100% 时：`scale 1 → 1.05 → 1` + 颜色变 `oklch(55% 0.15 290)`，duration 0.4s
7. G 块：若无下一节点，整块 `v-if` 隐藏

### 禁止事项

- 禁止使用 `document.querySelector` 获取 SVG 元素
- 禁止硬编码动画数值（必须从 props 计算）
- 禁止在 ctx 外创建 tween

### 交付标准

- [ ] 四块独立 div（D/E/F/G）
- [ ] SVG 环形进度 `stroke-dashoffset` 动画 0.6s
- [ ] 100% 时变色 + pulse 动画
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] 移动端 G 隐藏，F 缩小至 40×40

---

## [TASK-006] BottomToolbar 底部工具栏 + Accordion 动效

### 实现要求

1. 创建 `src/components/business/trip-detail/BottomToolbar.vue`
2. 定位 `position: fixed`，底部居中，`z-index: 40`
3. 三个工具按钮：[📍] [☰] [⚙]，横向排列
4. **GSAP Accordion 动画**（使用 `gsap.context()`）：
   - 展开：`scaleX 0 → 1`，origin center，duration 0.4s，ease: back.out(1.5)
   - 收回：`scaleX 1 → 0`，origin center，duration 0.3s，ease: power3.in
   - 按钮物理动效：相邻按钮 `scale 1 → 1.5`，`x ±8px`，基于 pointer 位置计算
5. 移动端：始终展开，无 accordion 动效

### 禁止事项

- 禁止使用 `document.querySelector` 获取 `.toolbar-list`
- 禁止在 mouseenter 回调中直接创建 tween（必须通过 ctx）
- 禁止缺少 `ctx.revert()` 清理

### 交付标准

- [ ] position fixed, bottom center, z-index 40
- [ ] hover 展开/收回动画流畅
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] 移动端始终展开

---

## [TASK-007] PointListPanel 点位列表面板

### 实现要求

1. 创建 `src/components/business/trip-detail/PointListPanel.vue`
2. 面板宽度 360px（桌面）/ 100vw（移动端），右侧固定
3. **GSAP 动画**（使用 `gsap.context()`）：
   - 进入：`x 100% → 0%`，duration 0.55s，ease: back.out(1.2)
   - 退出：`x 0% → 100%`，duration 0.35s，ease: power3.in
   - 内容淡入：`opacity 0 → 1` + `x 20 → 0`，stagger 30ms
4. 遮罩层 `v-show="visible"` 同步显示
5. 状态 `visible` 初始为 `false`（初次进入详情页不显示）
6. 与 SettingsPanel 互斥：打开时自动关闭 SettingsPanel

### 禁止事项

- 禁止使用 `document.querySelector` 获取 `.side-panel`
- 禁止 `v-if` 而非 `v-show` 控制遮罩（遮罩需要过渡）
- 禁止两面板同时显示

### 交付标准

- [ ] 初次进入详情页不显示
- [ ] ☰ 按钮触发滑入，遮罩同步
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] 移动端 100vw 全屏

---

## [TASK-008] SettingsPanel 设置面板

### 实现要求

1. 创建 `src/components/business/trip-detail/SettingsPanel.vue`
2. 与 PointListPanel 互斥：打开时自动关闭 PointListPanel
3. **GSAP 动画**（使用 `gsap.context()`）：与 TASK-007 相同
   - 进入：`x 100% → 0%`，duration 0.55s，ease: back.out(1.2)
   - 退出：`x 0% → 100%`，duration 0.35s，ease: power3.in
4. Timeline 管理时序：`to('.panel', {...}).then(() => v-show = true)`

### 禁止事项

- 禁止与 PointListPanel 同时显示
- 禁止缺少 GSAP timeline 时序管理

### 交付标准

- [ ] ⚙ 按钮独立触发
- [ ] 两面板不同时显示
- [ ] `ctx.revert()` 在 `onUnmounted` 调用

---

## [TASK-009] MapContainer 高德地图集成

### 实现要求

1. 创建 `src/components/business/trip-detail/MapContainer.vue`
2. 地图容器 flex: 1，最小高度 0，圆角 18px（桌面）/ 14px（移动端）
3. z-index 层叠：
   - sky-mask: z-index 2
   - fullscreen-btn: z-index 20
   - ring-overlay: z-index 10
   - moving-dot: z-index 50
4. **GSAP 动画**（使用 `gsap.context()`）：
   - 到达涟漪：`outerR` + `innerR` + `opacity`，duration 0.9s，ease: easeOut
   - 当前节点 marker：`scale 1 → 1.2`，duration 0.3s
5. 使用 `useMarkerRef()` 获取 marker DOM，禁止 `document.querySelector`
6. 移动端：pitch 降为 0（2D 视角）

### 禁止事项

- 禁止使用 `document.querySelector('.amap-marker')`
- 禁止在 ctx 外操作 marker 动画
- 禁止缺少 `ctx.revert()` 清理

### 交付标准

- [ ] 地图加载后节点标记正确
- [ ] AMap DOM 通过 `useMarkerRef()` 获取
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] 移动端 pitch: 0

---

## [TASK-010] GSAP 进入/退出动画集成

### 实现要求

1. 在 `TripDetail.vue` 容器 `onMounted` 创建根级 `gsap.context()`
2. 入场 Timeline：
   - `.top-info-bar` 从 y: -20, opacity: 0 → y: 0, opacity: 1 (0.5s, power3.out)
   - A1/A2/A3/B stagger opacity (stagger 60ms, power2.out, -0.3s offset)
   - `.progress-nodes-bar` 从 opacity: 0 → 1 (0.3s)
   - `.status-row` stagger opacity (stagger 40ms)
3. 退出动画（路由切换时）：y: 0 → -20, opacity 1 → 0, 0.3s, power2.in
4. 所有子组件的 ctx 作为子 timeline 挂接在根 ctx 上

### 禁止事项

- 禁止在根组件外创建独立 tween
- 禁止缺少 SPA 路由切换时的退出动画
- 禁止子组件动画与容器动画时序冲突

### 交付标准

- [ ] 总入场时长 ~0.6s
- [ ] 子组件动画正确挂接
- [ ] `ctx.revert()` 在 `onUnmounted` 调用
- [ ] SPA 路由切换无 tween 泄漏

---

## [TASK-011] 响应式降级 + 性能优化

### 实现要求

1. 实现 768px 断点降级：
   - 顶部栏：flex-wrap 换行
   - 进度节点：8px 节点，8px 间距
   - E 块：保持横向
   - G 块：隐藏
   - 工具栏：始终展开
   - 地图：pitch 0，2D 视角
2. 性能优化：
   - `gsap.quickTo()` 优化频繁交互
   - `will-change: transform` 仅对动画元素
   - 限制同时 Tween 数量 ≤ 10
3. 性能指标：LCP ≤ 2.5s，≥55fps，无内存泄漏

### 禁止事项

- 禁止移动端使用复杂 stagger
- 禁止在非动画元素上使用 `will-change`
- 禁止缺少性能指标检测

### 交付标准

- [ ] < 768px 布局正确降级
- [ ] LCP ≤ 2.5s
- [ ] ≥55fps
- [ ] `onUnmounted` 无 tween 泄漏

---

## 任务依赖图

```
[TASK-001] → [TASK-002] → [TASK-003] ─┐
                ↓                      │
           [TASK-004] → [TASK-009]     │
                ↓                      │
           [TASK-005] → [TASK-006]     │
                ↓                      │
           [TASK-007] ─┐               │
                ↓      ↓               │
           [TASK-008]  │               │
                └──────┴──→ [TASK-010] → [TASK-011]
```

---

## 总预计工时

| 任务 | 工时 |
|------|------|
| TASK-001 ~ TASK-011 | 9.5d |

---

## 接口依赖（TDD-Guide 关注）

| 接口 | 类型 | 说明 |
|------|------|------|
| `GET /api/trips/:id` | REST | 行程详情 |
| `GET /api/trips/:id/nodes` | REST | 节点列表 |
| `AMap.Marker.getContentDom()` | SDK | marker DOM 获取（必须在 gsap.context 内使用） |
| `gsap.context()` | Lib | 组件生命周期绑定 |
| `ctx.revert()` | Lib | 组件卸载清理 |