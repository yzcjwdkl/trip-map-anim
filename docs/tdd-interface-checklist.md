# TDD-Guide 接口关注清单

> 版本：v1.1
> 基于：tech-spec-card-detail.md (v1.1) + PRD v3.0
> 受众：TDD-Guide / QA

---

## 1. 关键外部接口

### 1.1 REST API

| 接口 | 方法 | 路径 | 关键字段 | 测试重点 |
|------|------|------|---------|---------|
| 获取行程详情 | GET | `/api/trips/:id` | `id`, `name`, `startDate`, `endDate`, `nodes[]` | 404 处理、字段完整性 |
| 获取节点列表 | GET | `/api/trips/:id/nodes` | `nodes[].id`, `name`, `amapMarkerId`, `lngLat`, `visitedAt` | 节点状态、坐标合法性 |

**Mock 数据示例：**
```javascript
// /api/trips/:id response
{
  id: 'trip-001',
  name: '大理-丽江七日游',
  startDate: '2024-03-01',
  endDate: '2024-03-07',
  nodes: [
    { id: 'n1', name: '大理', amapMarkerId: 'm1', lngLat: [100.234, 25.678], visitedAt: '2024-03-01T09:00:00Z' },
    { id: 'n2', name: '双廊', amapMarkerId: 'm2', lngLat: [100.256, 25.689], visitedAt: '2024-03-02T14:00:00Z' },
    { id: 'n3', name: '丽江', amapMarkerId: 'm3', lngLat: [100.123, 26.876] }
  ]
}
```

### 1.2 AMap SDK 接口

| 接口 | 方法 | 场景 | 测试重点 |
|------|------|------|---------|
| `new AMap.Map()` | 构造 | 地图初始化 | 容错、容器尺寸 |
| `marker.getContentDom()` | 实例方法 | GSAP 动画目标 | 返回值非空、必须在 ctx 内使用 |
| `marker.setPosition()` | 实例方法 | 节点导航 | 经纬度有效性 |
| `map.setCenter()` | 实例方法 | 当前节点变化 | 过渡动画平滑 |

---

## 2. Composables 接口（单元测试重点）

### 2.1 `useTripDetail.ts`

```typescript
// 需要覆盖的分支
interface TestCases {
  // currentIndex 边界
  'currentIndex = 0': should show first node
  'currentIndex = total - 1': should show last node
  'currentIndex out of range': should clamp to valid range
  
  // progressPercent 计算
  'progressPercent = 0': should show 0%, no glow ring
  'progressPercent = 50': should show 50%, glow ring visible
  'progressPercent = 100': should show 100%, pulse animation trigger
  
  // 状态互斥
  'openPointList() → showSettings = false': panels should not overlap
  'openSettings() → showPointList = false': panels should not overlap
  'openPointList() then openSettings()': should close point list first
  
  // Actions
  'play()': should set isPlaying = true
  'pause()': should set isPlaying = false
  'next() at last node': should be no-op
  'prev() at first node': should be no-op
  'reset()': should return to index 0
  
  // dispose
  'dispose()': should clear all timers and listeners
  'dispose()': should not throw if called twice
}
```

### 2.2 `gsap-helpers.ts`

```typescript
// 需要测试的工具函数
interface GsapHelperTests {
  // gsap.context() 封装
  'createGsapContext(componentInstance)': should return { ctx, revert }
  'createGsapContext() without onMounted': should warn or throw
  
  // useMarkerRef
  'useMarkerRef(markerId)': should return Ref<HTMLElement | null>
  'useMarkerRef() before map load': should return null (not throw)
  'useMarkerRef() fallback': should use querySelector if getContentDom returns null
  
  // 内存清理
  'ctx.revert()': should kill all tweens
  'ctx.revert()': should be callable multiple times
}
```

---

## 3. 组件接口

### 3.1 GSAP context 生命周期（关键测试点）

| 测试场景 | 预期行为 | 测试断言 |
|---------|---------|---------|
| 组件 mount → unmount | ctx 创建 → ctx.revert() 调用 | 无 tween 残留 |
| 多次 mount/unmount | 每次都创建新 ctx | 无 tween 泄漏 |
| ctx.revert() 后组件仍渲染 | tween 已清理，DOM 正常 | 样式正常 |
| unmount 前有 tween 进行中 | revert 立即停止 | 元素在正确位置停止 |

### 3.2 ProgressNodesBar 节点交互

| 事件 | 参数 | 测试场景 |
|------|------|---------|
| `nodeClick` | 0-based index | 点击已访问节点 → navigateTo(index) |

### 3.3 MapContainer 地图事件

| 事件 | 参数 | 测试场景 |
|------|------|---------|
| 地图加载完成 | - | 节点标记渲染 |
| 节点点击 | `nodeId` | 触发 `navigateTo(index)` |

---

## 4. 动画时序接口（E2E 测试重点）

### 4.1 面板时序竞争场景

| 场景 | 预期行为 | 测试断言 |
|------|---------|---------|
| 快速点 ☰ → ⚙ | PointList 关闭 → Settings 打开，中间无重叠 | 两面板 `v-show` 不同时为 true |
| 快速点 ⚙ → ☰ | Settings 关闭 → PointList 打开 | 同上 |
| 面板进入中点返回 | 动画被打断，新动画正确启动 | 最终位置正确 |

### 4.2 环形进度阈值

| 进度值 | 动画状态 | 测试断言 |
|--------|---------|---------|
| `0 → 1` | 发光环 opacity 0 → 0.5 | `.ring-glow` opacity ≥ 0.4 |
| `99 → 100` | 颜色变紫罗兰 + pulse | stroke color `oklch(55% 0.15 290)` |
| `100 → 99` | 颜色回退 | stroke color `oklch(58% 0.14 25)` |

---

## 5. GSAP 规范符合性测试（新增重点）

### 5.1 禁止 document.querySelector

| 组件 | 验证方式 | 通过条件 |
|------|---------|---------|
| TripDetailHeader | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| ProgressNodesBar | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| StatusRow | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| BottomToolbar | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| PointListPanel | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| SettingsPanel | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |
| MapContainer | 代码审查 + 运行时监测 | 无 `document.querySelector` 调用 |

### 5.2 gsap.context() 使用检测

| 检测点 | 方法 | 通过条件 |
|--------|------|---------|
| `onMounted` 创建 ctx | 代码审查 | 所有 GSAP 调用在 `gsap.context(() => {...})` 内 |
| `onUnmounted` 调用 revert | 代码审查 | 每个组件都有 `ctx?.revert()` |
| 无全局 tween | 运行时（Chrome DevTools） | GSAP panel 无外部 tween |
| 无 querySelector | 代码审查 | 全部使用 `ref.value` |

---

## 6. 性能相关接口

| 接口 | 测量指标 | 阈值 |
|------|---------|------|
| 页面 LCP | Largest Contentful Paint | ≤ 2.5s |
| 动画帧率 | requestAnimationFrame drop | ≥ 55fps |
| GSAP 内存 | Tween 实例残留 | 0 (ctx.revert() 后) |

---

## 7. 测试覆盖优先级（修订）

| 优先级 | 接口 | 测试类型 |
|--------|------|---------|
| P0 | `GET /api/trips/:id` | Mock + Assert |
| P0 | `currentIndex` 边界 | Unit |
| P0 | 面板互斥状态 | Unit/E2E |
| P0 | `gsap.context()` / `ctx.revert()` 生命周期 | Unit |
| P0 | 禁止 `document.querySelector` | Code Review |
| P1 | 环形进度计算 | Unit |
| P1 | 工具栏 accordion 展开/收回 | E2E |
| P1 | `useMarkerRef()` 降级 | Unit |
| P2 | 动画时序打断 | E2E |
| P2 | 移动端响应式降级 | E2E |
| P3 | LCP 性能 | E2E |

---

## 8. Mock 服务端响应模板

```javascript
// mock/trips.js
export const mockTrip = {
  id: 'trip-001',
  name: '大理-丽江七日游',
  startDate: '2024-03-01',
  endDate: '2024-03-07',
  nodes: [
    { id: 'n1', name: '大理', amapMarkerId: 'm1', lngLat: [100.234, 25.678], visitedAt: '2024-03-01T09:00:00Z' },
    { id: 'n2', name: '双廊', amapMarkerId: 'm2', lngLat: [100.256, 25.689], visitedAt: '2024-03-02T14:00:00Z' },
    { id: 'n3', name: '丽江', amapMarkerId: 'm3', lngLat: [100.123, 26.876] }
  ]
};
```

---

## 9. 测试数据边界

| 场景 | 数据 | 预期 |
|------|------|------|
| 单节点行程 | `nodes.length = 1` | 环形 100%，节点居中 |
| 极长行程 | `nodes.length = 20` | 显示 20 个节点，无省略 |
| 超长行程 | `nodes.length = 25` | 超过 20 时分段省略（见 PRD） |
| 无下一站 | `currentIndex = last` | G 块隐藏 |
| 完整游览 | `currentIndex = last, visitedAt all` | 环形 100%，完成状态 |
| ctx.revert() 后再 watch | currentIndex 变化 | 新 tween 在新 ctx 内创建，无遗留 |