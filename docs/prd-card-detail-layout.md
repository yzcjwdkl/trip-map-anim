# PRD - 卡片详情页 Z 型布局设计规范

> 版本：v3.0（修订）
> 状态：进行中
> 创建日期：2026-05-15
> 作者：Product-Planner
> 修订说明：
> - 删除 A4（预估时长）、A5（天气预览）、G1（剩余时间）
> - A/B/D/E/F 各栏拆分为多块 div 包裹，支持多栏布局

---

## 1. 概述与目标

### 1.1 背景

TripDetail 详情页承载核心用户旅程：用户从卡片列表进入具体行程详情，通过动画化的地图体验"重游"轨迹。详情页需要在信息密度与视觉呼吸感之间取得平衡，同时引导用户自然地沿着字母 **"Z"** 的形状扫视页面。

### 1.2 Z 型扫描路径

字母 Z 的形状隐喻人眼扫描页面的自然路径：

```
┌────────────────────────────────────────────────────────────────────────┐
│ ← Z 第一横：多块信息并排 / 多栏布局，充分利用 PC 横向空间               │
│                                                                        │
│       ↘ Z 对角线：节点进度脊柱，嵌入式连接第一横与第二横              │
│                                                                        │
│ ← Z 第二横：多块状态信息并排 / 多栏布局                                │
│                                                                        │
│                              【 高德地图 · 主内容区 】                  │
│                                                                        │
│                                      ← 工具栏固定底部                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 布局结构图

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ┌──────────┐ ┌──────────────────────────────┐                      ┌──────────────┐  │
│  │ [← 返回]  │ │ 行程标签  大理-丽江七日游     │                      │ [12个地点]   │  │
│  │  行程标识 │ │ 日期区间：2024.03.01 - 03.07 │                      │ 播放控制组   │  │
│  └──────────┘ └──────────────────────────────┘                      └──────────────┘  │
│                                                                                         │
│  ○────○────●────○────○────○────○────○────○────○────○  (12个节点进度脊柱)          │
│                                                                                         │
│  ┌────────────┐  ┌──────────────────────┐  ┌────────┐  ┌──────────────────────────┐  │
│  │ 3/12 已游览│  │ [大理] → [双廊] → [丽江] │  │  25%   │  │ 下一站：丽江古城          │  │
│  │ 进度状态卡  │  │    点位流向卡           │  │环形%卡 │  │   下站预览卡              │  │
│  └────────────┘  └──────────────────────┘  └────────┘  └──────────────────────────┘  │
│                                                                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                         【 高德地图 · 主内容区 】                                         │
│                                                                                         │
│                                                                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                              [ 📍 ]  [ ☰ ]  [ ⚙ ]                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 信息块详细规范

### 3.1 Z 第一横：多块多栏布局

**容器：** `.top-info-bar`，背景 `oklch(100% 0 0 / 0.95)` + `backdrop-filter: blur(16px)`，padding `14px 32px`

---

#### A1 - 返回块（`.block-back`）

**内容：**
- 返回按钮：36×36px，8px 圆角，背景透明，hover 背景 `oklch(94% 0.005 55)` + scale(1.05)
- 紧邻的"行程"小标签：0.625rem uppercase，字母间距 0.12em，紫罗兰色，padding 3px 8px，背景 `oklch(92% 0.008 290)`

**布局属性：** `flex-shrink: 0`，垂直居中

---

#### A2 - 行程名称块（`.block-trip-name`）

**内容：**
- 行程名称：Noto Serif SC，1.25rem Bold，max-width: 280px，ellipsis，颜色 oklch(25% 0.02 290)
- 若名称过长自动截断并显示省略号

**布局属性：** `flex-shrink: 0`，垂直居中，margin-left 24px

---

#### A3 - 日期区间块（`.block-date-range`）

**内容：**
- 内联 SVG 日历 icon，14px，oklch(55% 0.02 290)
- 日期文字：Noto Sans SC，0.8125rem，颜色 oklch(45% 0.02 290)
- 格式：`YYYY.MM.DD - YYYY.MM.DD`

**布局属性：** `flex-shrink: 0`，垂直居中，margin-left 28px

---

#### B - 操作控制块组（`.block-controls`）

**子块拆分（三栏 grid 或 flex）：**

**B1 - 地点徽章卡（`.ctrl-badge`）：**
- 外观：背景 `oklch(95% 0.02 25)`，圆角 20px，padding 5px 14px
- 内容：地点数量文字，0.8125rem Bold，颜色 oklch(55% 0.02 25)
- 右侧 margin 16px 与播放组分隔

**B2 - 播放控制组（`.player-controls-mini`）：**
- 三个按钮横向排列，gap 6px
- 单按钮规格：38×38px，圆角 10px，背景 `oklch(55% 0.15 290 / 0.12)`，hover 背景加深
- 播放按钮：46×46px，背景 `oklch(55% 0.15 290)`，白色图标，居中突出
- 图标：重置 / 播放暂停 / 下一步

**布局属性：** `margin-left: auto`，flex-shrink: 0

---

### 3.2 进度节点行：Z 型对角脊柱（嵌入式）

**容器：** `.progress-nodes-bar`

**设计：** 点状进度脊柱，一排节点从左到右延伸

**节点状态：**
- 未访问：`oklch(88% 0.006 55)` 描边，空心，10px 圆点
- 已访问：`oklch(55% 0.1 290)` 实心填充
- 当前：`oklch(58% 0.14 25)` 实心 + box-shadow 发光 + scale(1.2)

**节点数量：** = 地点总数（最多显示 20 个；超过时采用分段省略显示）

**间距：** 节点中心距 14px

**动画：** 当前节点高亮时 scale 弹出（1 → 1.2 → 1，duration: 300ms，ease: back.out(2)）；新增节点弹出 scale(0 → 1.2 → 1，duration: 250ms

---

### 3.3 Z 第二横：多块多栏布局

**容器：** `.status-row`，padding `12px 32px`

---

#### D - 进度状态块（`.block-progress-status`）

**内容（二栏布局）：**
- 主数字：当前索引 Noto Serif SC Bold 1.125rem，颜色 oklch(25% 0.02 290)
- 分隔符：细体 `/`，颜色 oklch(55% 0.02 290)
- 总数：Bold 同主数字
- 副标签：`已游览` 0.625rem uppercase，字母间距 0.1em，颜色 oklch(55% 0.02 290)，垂直基线对齐

**布局：** flex，gap 4px，内部小字 baseline 对齐

---

#### E - 点位流向块（`.block-point-flow`）

**内容（三栏横向展示）：**
- 格式：`[地点A] → [当前地点] → [地点B]`
- 当前地点卡：`background oklch(55% 0.15 25 / 0.12)`，inset box-shadow，font-weight 600，padding 4px 12px，圆角 8px
- 相邻地点卡：`background oklch(94% 0.005 55)`，font-weight 400，padding 4px 10px
- 起点/终点：`已游览` / `终点` 0.6875rem uppercase，无背景

**箭头：** `→` 符号，0.75rem Bold，oklch(55% 0.14 25)，水平居中对齐

---

#### F - 环形进度块（`.block-progress-ring`）

**整体布局：**
- 自身是独立 div 块，flex 横向排列，不与 D/E/G 合并
- 内部采用 SVG 实现环形进度，SVG 外层包裹计算尺寸的容器
- 视觉焦点是环形轨道 + 中心数字百分比

**SVG 环形规格：**

```
    外圈发光环（渐变）
         ↕
    ╭───────────────╮
    │              │
    │     25%      │  ← 中心百分比数字
    │              │
    ╰───────────────╯
      环形轨道（底色）
      环形进度（填充）
```

- **画布尺寸**：48×48px（SVG viewBox 0 0 48 48）
- **轨道半径**：r = 20，外半径 22（含描边）
- **轨道底色**：stroke `oklch(88% 0.006 55)`，stroke-width 4px，stroke-linecap round
- **轨道进度**：stroke `oklch(58% 0.14 25)`（暖橙色），stroke-width 4px，stroke-linecap round，stroke-dasharray 驱动
  - dasharray = 2 × π × 20 ≈ 125.66
  - stroke-dashoffset = 125.66 × (1 - progressPercent/100)
- **外圈发光**：ring 外层有 `drop-shadow` 滤镜（暖橙半透明 0.4），当进度 > 0 时才显示

**中心内容层（绝对定位覆盖在 SVG 上）：**
- 主数字：完成百分比，如 `25%`
  - 字体：Noto Serif SC，Bold，0.9375rem
  - 颜色：`oklch(25% 0.02 290)`
  - 居中于 SVG 中心

**状态变化动画：**
- 进度更新时：`stroke-dashoffset` 从旧值过渡到新值，duration: 600ms，ease: power2.out
- 当进度从 0→>0 时：外圈发光环从 opacity 0 → 0.5（duration: 300ms）
- 当进度达到 100% 时：环形填充变更为 `oklch(55% 0.15 290)`（紫罗兰色），中心数字变更为 `✓` 或 `完成`（绿色主题），整体做一个 pulse 动画（scale 1 → 1.05 → 1，duration: 400ms）

- **布局属性：**
  - `flex-shrink: 0`，垂直居中
  - 右侧 margin: 24px（与下站预览卡分隔）

**移动端降级（< 768px）：**
- 画布缩小至 40×40px
- 轨道半径 r = 16
- 主数字 0.8125rem

---

#### G - 下站预览块（`.block-next-preview`）

**内容：**
- 小卡：背景 `oklch(95% 0.008 290)`，圆角 10px，padding 8px 14px
- 信息：下一地点名称 + 预计到达时间
- 若无下一地点：整块隐藏

---

## 4. 地图容器

**规格：**
- flex: 1，最小高度 0，圆角 18px（桌面）/ 14px（移动端）
- 多层 box-shadow 营造悬浮卡片感

**z-index 层叠：**
| 子元素 | z-index | 说明 |
|--------|---------|------|
| sky-mask | 2 | 渐变遮罩 |
| fullscreen-btn | 20 | 全屏按钮 |
| ring-overlay | 10 | 到达涟漪 SVG |
| moving-dot | 50 | 移动指示点 |

> 不在地图区域叠加永久信息块，保护视觉纯净度。

---

## 5. 底部工具栏

**定位：** `position: fixed`，底部居中，z-index: 40

**GSAP Accordion 动效：**
- 鼠标移入：从中心向两侧展开（scaleX 0 → 1，duration: 0.4s，ease: back.out(1.5)）
- 鼠标移出：收回至中心（scaleX 1 → 0，duration: 0.3s，ease: power3.in）

**按钮物理动效：** 相邻按钮凸起（scale 1 → 1.5，x ±8px），基于 pointer 位置计算

**移动端：** 简化为始终展开

---

## 6. 侧边栏

**滑入面板（点位列 / 设置）：**
- 进入：x 100% → 0%，duration 0.55s，ease: back.out(1.2)
- 退出：x 0% → 100%，duration 0.35s，ease: power3.in
- 宽度：360px（桌面）/ 100vw（移动端）
- 状态初始化：`showPointList = ref(false)`，`showSettings = ref(false)`
- 遮罩：`v-show="showPointList || showSettings"`

---

## 7. GSAP 动画汇总

### 7.1 进入/退出

| 场景 | 元素 | 属性 | Duration | Ease |
|------|------|------|---------|------|
| 进入 | 顶部信息栏 | y + opacity | 0.5s | power3.out |
| 进入 | 各信息块 stagger | opacity | stagger 60ms | power2.out |
| 退出 | 顶部信息栏 | y + opacity | 0.3s | power2.in |
| 面板滑入 | .side-panel | x | 0.55s | back.out(1.2) |
| 面板滑出 | .side-panel | x | 0.35s | power3.in |

### 7.2 交互反馈

| 场景 | 元素 | 属性 | Duration | Ease |
|------|------|------|---------|------|
| 返回按钮 hover | .back-btn | scale + background | 0.18s | power2.out |
| 播放按钮点击 | .play | scale 1→1.05→1 | 0.18s | power2.out |
| 节点激活 | .progress-node | scale | 0.3s | back.out(2) |
| 节点新增弹出 | .progress-node.new | scale | 0.25s | back.out(1.8) |
| 点位切换 | nav-point.current | x + opacity + scale | 0.25-0.3s | power2.out |
| 环形百分比更新 | stroke-dashoffset | 0.6s | power2.out |
| 环形进度从无到有时 | ring-glow opacity | 0 → 0.5, 0.3s | easeOut |
| 环形达到 100% 时 | ring scale + color | 1→1.05→1 + color shift, 0.4s | power2.out |
| 到达涟漪 | ring-overlay | outerR + innerR + opacity | 0.9s | easeOut |
| 工具栏展开 | .toolbar-list | scaleX | 0.4s | back.out(1.5) |
| 工具栏收回 | .toolbar-list | scaleX | 0.3s | power3.in |
| 地图加载消失 | .map-loading | opacity | 0.45s | power2.out |

---

## 8. 移动端降级

| 断点 | 布局策略 |
|------|---------|
| Desktop ≥ 768px | 完整多块多栏布局 |
| Mobile < 768px | 垂直单列，A/B 各块换行，D/E/F/G 简化显示，侧边面板全屏 |

**降级规则：**
- A 栏：全部保留，flex-wrap 换行
- B 栏：保留徽章 + 播放控制，margin-left auto
- 进度节点：缩小至 8px，间距 8px
- E 点位流向：保持横向（信息密度高），G 下站预览卡隐藏
- 工具栏：始终展开，无 accordion
- 地图：pitch 降为 0（2D 视角）

---

## 9. 验收标准

### 布局
- [ ] Z 第一横各块（A1/A2/A3/B1/B2）独立 div 包裹，多栏布局，PC 横屏填满
- [ ] 进度节点行嵌入式，非独立占行，形成 Z 型对角视觉
- [ ] Z 第二横各块（D/E/F/G）独立 div 包裹，多栏布局
- [ ] 无多余信息块（A4/A5/G1 已删除）

### 动画
- [ ] 进入：顶部信息栏整体滑入 + 各块 stagger，总约 0.6s
- [ ] 退出：向上消失，约 0.3s
- [ ] 面板滑入/滑出：timeline 管理
- [ ] 进度节点：当前节点高亮弹出，新节点 scale 弹出
- [ ] 工具栏 accordion：hover 展开/收回流畅

### 侧边栏
- [ ] 初次进入详情页：两面板均隐藏
- [ ] ☰ 按钮：点位列表面板滑入，遮罩同步
- [ ] ⚙ 按钮：设置面板独立滑入/滑出
- [ ] 两面板不会同时展开

### 移动端
- [ ] < 768px：A/B 换行，E 保持横向，G 隐藏
- [ ] 侧边面板全屏覆盖
- [ ] 地图 2D 俯视角

### 性能
- [ ] LCP ≤ 2.5s，动画帧率 ≥ 55fps，无内存泄漏

---

## 10. 关键文件

- 布局实现：`src/components/TripDetail.vue`
- 样式：`src/components/TripDetail.vue`（`<style scoped>`）
- 全局样式：`src/style.css`

### 风险项

| 风险 | 缓解策略 |
|------|---------|
| 高德 DOM 标签动画 | 通过 `label.getContentDom()` 获取原生 DOM 后用 GSAP |
| 面板时序竞争 | GSAP timeline + `onComplete` 切换 `v-show` |
| 移动端 GSAP 性能 | `quickTo`，限制同时 Tween 数量 |