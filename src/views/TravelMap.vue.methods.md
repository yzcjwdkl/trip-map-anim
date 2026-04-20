/**
 * TravelMap.vue 方法注释
 *
 * 整体架构：
 * - 地图层：高德地图 AMAP，承载 Polyline（轨迹线）、CircleMarker（点位dot）、Marker（移动标记）
 * - 覆盖层：SVG 光环（ring-overlay），absolute 叠在地图上，triggerArrivalRing 时显示
 * - 数据层：tripData（行程点集合）、traveledPath（累积已走路径）、allDotMarkers/allLabelMarkers（地图标记数组）
 *
 * 播放流程：
 *   togglePlay → startPlay → planAndAnimate → animateSegment → animLoop（RAF驱动）
 *   animLoop 到达终点 → triggerArrivalRing（SVG光环）→ syncDots → planAndAnimate（下一段）
 */

// ============ 地图初始化 ============

/**
 * 初始化高德地图
 * 创建 mainPolyline（主轨迹线）、trailLine（跟随线）、
 * 遍历所有点位创建 dot 标记和 label 标记
 * 地图加载完成后设置 mapReady = true，解锁播放按钮
 */
function initMap() { ...见 onMounted... }

// ============ 拖拽排序 ============

/**
 * HTML5 拖拽排序
 * onDragStart   — 记录被拖拽点位索引
 * onDragOver    — 标记悬停位置
 * onDrop        — 交换数组顺序，同步更新 map 上的所有 dot/label 位置，重建轨迹线
 * onDragEnd     — 重置拖拽状态
 */

// ============ 编辑弹窗 ============

/**
 * openEditDialog  — 打开编辑弹窗，填充当前点位数据到 editForm
 * closeEditDialog — 关闭弹窗
 * saveEdit        — 保存修改：更新点位数据 + 同步更新地图上对应的 dot/label + 重建主轨迹
 */

// ============ dot 显示同步 ============

/**
 * syncDots — 控制所有 dot 的显示/隐藏
 * - 播放中：出发 dot（departureIdx）+ 已到达 dot（<= currentIndex）显示，其他隐藏
 * - 非播放：全部显示
 * 目的：动画进行中 dot 不会消失，到达后才显示新 dot
 */

// ============ 播放控制 ============

/**
 * togglePlay — 播放/暂停切换
 * startPlay  — 开始播放：
 *   1. cancelAnim 清理上一段动画
 *   2. 恢复 traveledPath（起点→currentIndex 的已完成路径）
 *   3. 若当前点位不在视野内则平移，等待后再开始规划
 *   4. 调用 planAndAnimate 开始第一段
 * pausePlay  — 暂停：cancelAnim + isPlaying=false + 清理 pending timer
 * resetTrip  — 重置到起点：清空所有状态，重建初始画面
 * nextStep   — 手动下一步（非自动播放）：单段推进，累积 traveledPath
 * jumpTo     — 跳转任意点位：重置 traveledPath 到该点，触发 label 淡入
 */

// ============ 核心：规划 + 动画 ============

/**
 * planAndAnimate — 规划下一段动画
 *   1. 若启用地图旋转：等待 rotation 完成后再 zoom
 *   2. 若不启用：直接 zoom
 *   3. zoom 到位后根据 travelType 选择路径：
 *      - fly（飞机）：用贝塞尔弧线 makeArcPath
 *      - drive（驾车）：调用高德驾车 API，拿到路线节点后 animateSegment
 *
 * animateSegment — 开始一段动画
 *   1. 切换 movingMarker 图标（✈️ 或 🚗）
 *   2. cancelAnim 清理，初始化 anim 状态（departureIdx、toIdx、duration）
 *   3. 启动 RAF 循环 animLoop
 *
 * animLoop — RAF 驱动的时间轴动画循环（逐帧）
 *   1. 计算 elapsed → rawT → eased（easeOut 缓动）
 *   2. interpolatePathCoord 根据 eased 插值当前位置
 *   3. 更新 trailLine（跟随线，从起点到当前位置）
 *   4. 更新 movingMarker 位置
 *   5. maybePan：若跑出视野边界，平移地图
 *   6. rawT >= 1（到达终点）：
 *      - cancelAnim（清理 RAF/interval）
 *      - triggerArrivalRing 触发 SVG 光环动画
 *      - 显示到达 dot 和 label
 *      - 隐藏 movingMarker
 *      - 累积 traveledPath，延迟 800ms 后开始下一段 planAndAnimate
 *
 * maybePan — 视野自适应：检测 movingMarker 是否在安全区内，超出则平移地图
 */

// ============ arrival ring（SVG 光环）==========

/**
 * triggerArrivalRing(pos) — 触发光环动画
 *   1. 将地图坐标转为屏幕像素坐标
 *   2. 显示 SVG overlay
 *   3. 初始化 ringState：outerR=6、innerR=0、opacity=0.65
 *   4. 启动 RAF 循环 animRing
 *
 * animRing — SVG 光环动画（900ms）
 *   - outerR：6 → 32（easeOut 扩张）
 *   - innerR：0 → outerR（内圈边界扩大，实现"填满消失"）
 *   - opacity：0.65 → 0（透明度渐变）
 *   mask 原理：黑色外圆遮罩 + 白色内圆可见 = 环形视觉效果
 *
 * cancelAnim — 清理光环：active=false，隐藏 SVG，停止 RAF
 */

// ============ label 显示 ============

/**
 * triggerLabelAppear(label) — 标签淡入
 *   1. label.show() 立即显示
 *   2. 双 requestAnimationFrame 触发 CSS transition
 *   3. opacity 0 → 1，45ms ease-out 淡入动画
 * 依赖 AMap Marker 的 getContentDom() API
 */

// ============ 点位操作 ============

/**
 * onAddPoint       — 从弹窗新增点位：创建 dot + label，加入数组，重建轨迹
 * deletePoint      — 删除点位：解绑事件，移除地图标记，从数组删除，重建轨迹
 * toggleSegmentTravelType — 切换段间出行方式（fly/drive）
 * getTypeName       — 类型值 → 显示文字（food→🍜 美食 等）
 */

// ============ 生命周期 ============

/**
 * onMounted  — 初始化地图、创建所有标记、设置初始状态
 * onUnmounted — 暂停播放、清理所有动画、解绑事件、销毁地图实例
 */
