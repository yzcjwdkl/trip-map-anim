// TripDetail Business Components
// 目录结构：
// trip-detail/
// ├── index.js              — barrel export
// ├── TripDetailHeader.vue  — Z型第一横（顶部行程标识+播放控制）
// ├── ProgressNodesBar.vue  — Z型对角线（进度节点高亮栏）
// ├── StatusRow.vue         — Z型第二横（环形进度+点位流向+百分比）
// ├── BottomToolbar.vue     — 底部工具栏（position fixed，GSAP accordion）
// ├── PointListPanel.vue    — 点位列表面板（v-model:visible，GSAP slide-in）
// ├── SettingsPanel.vue     — 设置面板（v-model:visible，GSAP slide-in）
// └── MapContainer.vue      — 高德地图容器（flex:1，z-index 层叠，GSAP ring 动画）
//
// 状态管理：统一使用 src/composables/useTripDetail.js

export { default as TripDetailHeader } from './TripDetailHeader.vue'
export { default as ProgressNodesBar }  from './ProgressNodesBar.vue'
export { default as StatusRow }        from './StatusRow.vue'
export { default as BottomToolbar }    from './BottomToolbar.vue'
export { default as PointListPanel }   from './PointListPanel.vue'
export { default as SettingsPanel }   from './SettingsPanel.vue'
export { default as MapContainer }    from './MapContainer.vue'