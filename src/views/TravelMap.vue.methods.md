# TravelMap.vue 方法文档

## 整体架构

```
地图层：高德地图 AMAP
  ├── mainPolyline    — 主轨迹线（累积已走路径，traveledPath）
  ├── trailLine        — 跟随线（从起点到当前移动图标位置）
  ├── allDotMarkers[]  — 圆点标记（每个点位一个，syncDots 控制显示/隐藏）
  └── movingMarker     — 移动图标（✈️ 或 🚗，沿路径逐帧移动）

覆盖层：SVG ring-overlay（absolute 叠在地图上）
  └── 单光环：外圈扩张 + 内圈填满 + 透明度渐变，triggerArrivalRing 时显示
```

## 点位A → 点位B 完整事件链

### 【第一阶段：出发准备】planAndAnimate()

| 步骤 | 调用 | 做了什么 |
|------|------|---------|
| ① | `allLabelMarkers[prevIdx].hide()` | 隐藏出发点 label |
| ② | `map.setRotation(targetRotation)` | 地图旋转对准目标方向（仅开启旋转时）|
| ③ | `waitRotationDone()` — interval 轮询 | 等待旋转到位，再执行后续 |
| ④ | `map.setZoom(targetZoom)` | 根据两点跨度调整视野 zoom（跨度大则放大）|
| ⑤ | `waitZoomDone()` — interval 轮询 | 等待 zoom 到位 |
| ⑥ | `map.setCenter(from)` | 地图中心对准出发点 |
| ⑦ | `setTimeout(..., 400)` | 短暂停顿（地图动画留出缓冲时间）|
| ⑧ | **fly:** `animateSegment(makeArcPath(), 'fly')`<br>**drive:** `driving.search()` → API返回路线 → `animateSegment(路线节点, 'drive')` | 进入第二阶段 |

### 【第二阶段：动画进行中】animateSegment() + animLoop()

| 步骤 | 调用 | 做了什么 |
|------|------|---------|
| ⑨ | `movingMarker.setContent('✈️'/'🚗')` | 切换移动图标 |
| ⑩ | `cancelAnim()` | 清理上一段 RAF、interval、driving |
| ⑪ | `anim.active=true, anim.departureIdx=当前索引` | 初始化动画状态 |
| ⑫ | `requestAnimationFrame(animLoop)` | 启动逐帧循环 |

**animLoop 每帧执行（约60fps）：**

| 步骤 | 调用 | 做了什么 |
|------|------|---------|
| ⑬ | 计算 `elapsed → rawT → eased` | easeOut 缓动曲线 |
| ⑭ | `interpolatePathCoord(pathCoords, eased)` | 根据进度插值当前经纬度 |
| ⑮ | `trailLine.setPath(buildTrailPath())` | 跟随线：从起点画到当前位置 |
| ⑯ | `movingMarker.setPosition(pos)` | 移动图标位置更新 |
| ⑰ | `maybePan(pos)` | 跑出视野边界则平移地图 |

### 【第三阶段：到达终点】animLoop 检测 rawT >= 1

| 步骤 | 调用 | 做了什么 |
|------|------|---------|
| ⑱ | `cancelAnim()` | 停止 RAF、zoom/rotation interval |
| ⑲ | `trailLine.setPath(完整路径)` | 跟随线画到终点 |
| ⑳ | `triggerArrivalRing(目标坐标)` | **触发 SVG 光环动画** |
| ㉑ | `allDotMarkers[到达点].show()` | 显示到达点点位 dot |
| ㉒ | `triggerLabelAppear(到达label)` | 到达点 label 淡入（CSS opacity 动画）|
| ㉓ | `movingMarker.setContent(INVISIBLE_MARKER_ICON)` | 隐藏移动图标（设为透明）|

**animTimer 800ms 后（队列下一段）：**

| 步骤 | 调用 | 做了什么 |
|------|------|---------|
| ㉔ | `traveledPath = [...traveledPath, ...pathCoords]` | 累积路径 |
| ㉕ | `mainPolyline.setPath(traveledPath)` | 主轨迹线延伸至新到达点 |
| ㉖ | `currentIndex.value = 到达索引` | 更新当前点位索引 |
| ㉗ | `syncDots()` | dot 显示状态同步 |
| ㉘ | `setTimeout(planAndAnimate, 800)` | 规划下一段 |

## 各方法职责

### cancelAnim
取消当前动画段，停止 RAF 循环、zoom/rotation interval，关闭 driving 搜索，隐藏 SVG 光环。
- 暂停场景：traveledPath 清空
- 到达终点场景（播放中调用）：traveledPath 保留，延迟 800ms 后继续

### startPlay / pausePlay / resetTrip / nextStep / jumpTo
- **startPlay**：重置 traveledPath → 同步 dot → panTo 当前点 → planAndAnimate
- **pausePlay**：cancelAnim + isPlaying=false
- **resetTrip**：全部重置到初始状态（索引0、路径空、所有 dot 显示）
- **nextStep**：手动单段推进，不自动播放下一段
- **jumpTo**：traveledPath 重置为完整路径，直接定位

### syncDots
- 播放中：出发 dot（departureIdx）+ 已到达 dot（≤currentIndex）显示，其他隐藏
- 非播放：全部显示
- 目的：动画进行中 departure dot 不消失，到达后才出现新 dot

### triggerArrivalRing / animRing
SVG 光环动画（900ms）：outerR 6→32 扩张，innerR 0→outerR 填满，opacity 0.65→0 渐变消失。
- mask 原理：黑色外圆遮罩 + 白色内圆可见 = 环形

### triggerLabelAppear
label.show() 后，通过双 rAF 触发 CSS transition，实现 opacity 0→1 的淡入效果（45ms ease-out）。

### onDrop（拖拽排序）
1. 交换 points 数组顺序
2. 同步 allDotMarkers / allLabelMarkers 数组顺序
3. 更新所有 marker 的坐标
4. 重建 mainPolyline 和 trailLine
5. 修正 currentIndex（拖拽点被移动后的新索引）

### onUnmounted
暂停播放 → 取消动画 → 解绑 label 事件 → 销毁地图实例（释放高德 API 资源）
