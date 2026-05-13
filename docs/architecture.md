# 架构规范文档

> 本文档是 trip-map-anim 项目的"技术宪法"，由 Tech-Architect 制定和维护。
> Frontend-Dev 无权修改，所有变更必须通过 Architect 的 [RFC] 流程。

---

## 1. 技术栈决策（锁定）

以下技术选型已锁定，**严禁** Frontend-Dev 擅自更改：

| 分类 | 技术选型 | 版本要求 | 说明 |
|------|----------|----------|------|
| 框架 | Vue 3 | 3.4+ | Composition API + `<script setup>` |
| 构建 | Vite | 5+ | 必须使用 |
| CSS | TailwindCSS | 3.4+ | 为主；SCSS 仅用于复杂动画 |
| 动画 | GSAP | 3.12+ | ScrollTrigger + SplitText |
| 地图 | 高德地图 JS API | 2.0 | 必须通过 `@amap/amap-jsapi-loader` |
| 路由 | Vue Router | 4 | 必须使用 |
| 图表 | ECharts | latest | 按需引入 |
| 图标 | Lucide Vue Next | latest | 必须使用 |
| 部署 | Vercel | - | 静态部署 |
| 测试 | Vitest + Playwright | latest | 单元 + E2E |

### 依赖引入规则
- 所有新依赖必须经过 Architect 评估成本后才能引入
- 引入前需更新本文件对应章节

---

## 2. 目录结构

```
src/
├── components/
│   ├── ui/           # 原子组件（纯展示，无业务逻辑）
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   └── MapContainer.vue    # 地图封装组件（强制规范）
│   └── business/     # 业务组件（可复用）
│       ├── TravelMap.vue
│       └── HeroSection.vue
├── views/            # 页面（与路由 1:1）
│   ├── HomeView.vue
│   └── MapView.vue
├── composables/      # 组合式函数（必须 useXxx.js）
│   ├── useMap.js
│   ├── useGsap.js
│   └── useMediaQuery.js
├── router/
│   └── index.js
├── styles/
│   ├── tailwind.css
│   └── design-token.css   # 设计变量（Architect 锁定）
├── utils/
│   ├── format.js
│   └── validation.js
├── App.vue
└── main.js
public/
├── images/
└── models/
docs/                 # 架构/PRD 文档
tests/
├── unit/             # Vitest 单元测试
└── e2e/              # Playwright E2E 测试
```

---

## 3. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase.vue | `TravelMap.vue` |
| Composable | useXxx.js | `useMap.js` |
| 工具函数 | camelCase.js | `format.js` |
| CSS 类 | Tailwind 优先；自定义用 kebab-case | `text-primary` |
| 常量 | UPPER_SNAKE_CASE | `MAX_ZOOM_LEVEL` |
| 路由路径 | kebab-case | `/travel-map` |

---

## 4. GSAP 强制规范

### 4.1 基础规范
- `main.js` 中必须注册：`gsap.registerPlugin(ScrollTrigger)`
- **禁止**在组件外创建全局 Tween
- **禁止**在 `.vue` 中直接引入 `gsap`（必须通过 `composables/useXxx.js`）
- 默认 `ease: "power2.out"`, `duration: 0.6`

### 4.2 生命周期清理
```js
// ✅ 正确：在 composable 中管理生命周期
export function useHeroAnimation(elRef) {
  const ctx = gsap.context(() => {
    gsap.from(elRef.value.querySelectorAll('.anim-item'), {
      y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out'
    })
  }, elRef.value)
  onUnmounted(() => ctx.revert()) // 必须清理
  return { ctx }
}

// ❌ 错误：在组件中直接写全局 tween
onMounted(() => {
  gsap.to('.box', { x: 100 }) // 全局选择器，不清理
})
```

### 4.3 移动端降级
- 分辨率 `< 768px` 时禁用复杂 ScrollTrigger
- 改用简单 fade 动画（opacity 0→1，duration: 0.3s）

### 4.4 动画属性限制
- **必须**使用 `transform` / `opacity`
- **禁止**使用 `width` / `height` / `top` / `left` 等触发重排的属性

---

## 5. 高德地图强制规范

### 5.1 API Key 管理
- Key 必须通过 `.env`：`VITE_AMAP_KEY=xxx`
- 禁止硬编码 Key

### 5.2 封装组件
- 必须封装为 `MapContainer.vue`
- Props：`center`, `zoom`, `markers`
- 组件卸载必须 `map.destroy()`
- 加载失败降级：静态图片 + "点击加载"按钮

---

## 6. 性能基线

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 首屏 LCP | ≤ 2.5s | Lighthouse |
| CLS | ≤ 0.1 | Lighthouse |
| JS Bundle (gzip) | ≤ 200KB | Vite build analysis |
| 单个 Chunk | ≤ 500KB | Vite build analysis |
| GSAP 动画帧率 | ≥ 55fps (iPhone 14) | Chrome DevTools |

### 图片规范
- > 200KB 必须压缩
- 必须写 `alt` 属性
- 首屏图：`loading="eager"`
- 非首屏：`loading="lazy"`

### 路由懒加载
```js
// ✅ 正确
component: () => import('@/views/About.vue')
// ❌ 错误
import About from '@/views/About.vue'
```

---

## 7. Git 规范

### 分支命名
```
feat/xxx      # 新功能
fix/xxx       # 修复
refactor/xxx  # 重构
docs/xxx      # 文档
test/xxx      # 测试
chore/xxx     # 杂项
```

### 提交格式
```
type(scope): subject
```
- type：`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- scope：影响的模块（例：`hero`, `map`, `router`）
- subject：简短描述

**示例：**
```
feat(hero): add gsap entrance animation
fix(map): correct marker positioning on mobile
docs(readme): update deployment guide
```

---

## 8. 测试规范

### 单元测试（Vitest）
- 工具函数：line coverage ≥ 80%
- Composables：必须可 Node 环境测试，必要时 `vi.mock`
- 地图组件：Mock 高德 API，测试 Props 变化时调用正确方法

### E2E 测试（Playwright）
- 关键用户路径必须覆盖
- 包含视觉回归截图对比

### GSAP 动画测试
- 不测试"是否好看"，测试"是否完成"
- 通过 `data-anim` attribute 或 `onComplete` callback 断言

---

## 9. 安全红线

- **XSS**：`v-html` 禁止渲染未转义的用户输入
- **禁止** `eval()` / `new Function()`
- **禁止**在 console.log 中输出敏感数据
- Key 必须走 `.env`，禁止提交到 Git

---

## 10. 协作流程

```
Planner → PRD（输出到 docs/）
    ↓
Architect → Tech Spec + [TASK] 任务单（输出到 docs/）
    ↓
TDD-Guide → [CONTRACT] 接口契约 + 测试用例（输出到 tests/）
    ↓
Frontend-Dev → 实现 + 自测
    ↓
Code-Reviewer → [REVIEW-PASS / REVIEW-FAIL]
    ↓
合并主分支
```

---

## 11. 文档输出规范

| 文档 | 位置 | 负责角色 |
|------|------|----------|
| PRD | `docs/prd-xxx.md` | Product-Planner |
| Tech Spec | `docs/tech-spec-xxx.md` | Tech-Architect |
| Design Token | `docs/design-token.md` | Product-Planner |
| Architecture（本文） | `docs/architecture.md` | Tech-Architect |
| 接口契约 | `docs/contract-xxx.md` | TDD-Guide |

---

_最后更新：2026-05-13 by pp_