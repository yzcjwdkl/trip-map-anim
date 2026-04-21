<template>
  <!-- 添加点位按钮 -->
  <button class="add-point-btn" @click="openDialog" :disabled="!props.mapReady">
    ➕ 添加点位
  </button>

  <!-- 弹窗 -->
  <div class="dialog-overlay" v-if="showDialog" @click.self="closeDialog">
    <div class="dialog">
      <div class="dialog-header">
        <h3>添加旅行点位</h3>
        <button class="close-btn" @click="closeDialog">✕</button>
      </div>

      <div class="dialog-body">
        <!-- 地点搜索 -->
        <div class="search-box">
          <input
            ref="searchInput"
            v-model="keyword"
            type="text"
            placeholder="输入地名搜索（如：芒市广场）"
            @input="onSearchInput"
            @keydown.enter="onSearchInput"
          />
          <button class="search-btn" @click="onSearchInput">搜索</button>
        </div>

        <!-- 搜索结果列表 -->
        <div class="results-list" v-if="searchResults.length > 0">
          <div
            v-for="(item, index) in searchResults"
            :key="index"
            :class="['result-item', { selected: selectedIndex === index }]"
            @click="selectResult(item, index)"
          >
            <div class="result-name">{{ item.name }}</div>
            <div class="result-address">{{ item.address || item.district || '' }}</div>
          </div>
        </div>

        <div class="empty-hint" v-else-if="keyword && !searching && !searched">
          输入关键词搜索地点
        </div>
        <div class="empty-hint" v-else-if="searching">
          搜索中...
        </div>
        <div class="empty-hint" v-else-if="searched && searchResults.length === 0">
          未找到相关地点
        </div>

        <!-- 预览地图 -->
        <div class="preview-map" v-if="selectedPOI">
          <div id="preview-amap" class="preview-amap"></div>
        </div>

        <!-- 点位信息表单 -->
        <div class="point-form" v-if="selectedPOI">
          <div class="form-row">
            <label>名称</label>
            <input v-model="pointName" type="text" />
          </div>
          <div class="form-row">
            <label>类型</label>
            <select v-model="pointType">
              <option value="food">🍜 美食</option>
              <option value="attraction">🏛️ 景点</option>
              <option value="activity">🎉 活动</option>
              <option value="hotel">🏨 住宿</option>
              <option value="transport">🚗 交通</option>
            </select>
          </div>
          <div class="form-row">
            <label>描述</label>
            <input v-model="pointDesc" type="text" placeholder="简短描述（可选）" />
          </div>
          <div class="form-row coords-row">
            <label>坐标</label>
            <span class="coords">{{ selectedPOI.location.lng.toFixed(6) }}, {{ selectedPOI.location.lat.toFixed(6) }}</span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="closeDialog">取消</button>
        <button class="btn btn-primary" :disabled="!selectedPOI" @click="confirmAdd">
          ✓ 确认添加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useTripStore } from '@/stores/trip'
import type { TripPoint } from '@/types/trip'

const props = defineProps({ mapReady: Boolean })
const tripStore = useTripStore()

const showDialog = ref(false)
const keyword = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref<any[]>([])
const selectedIndex = ref(-1)
const selectedPOI = ref<any>(null)
const pointName = ref('')
const pointType = ref<TripPoint['type']>('attraction')
const pointDesc = ref('')

let AMap: any = null
let placeSearch: any = null
let previewMap: any = null
let initPromise: Promise<void> | null = null  // 防止并发初始化

async function initAMap() {
  if (AMap) return
  if (initPromise) return initPromise
  initPromise = (async () => {
    window._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE
    }
    AMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY,
      version: '2.0',
      plugin: ['AMap.PlaceSearch']
    })
    await new Promise<void>(resolve => {
      if (AMap.PlaceSearch) { resolve() }
      else { AMap.plugin('AMap.PlaceSearch', resolve) }
    })
    placeSearch = new AMap.PlaceSearch({
      city: '全国',
      citylimit: false,
      pageSize: 8,
      pageIndex: 1
    })
  })()
  return initPromise
}

async function openDialog() {
  if (showDialog.value) return
  showDialog.value = true
  keyword.value = ''
  searchResults.value = []
  selectedIndex.value = -1
  selectedPOI.value = null
  pointName.value = ''
  pointType.value = 'attraction'
  pointDesc.value = ''
  searched.value = false
  await nextTick()
  await initAMap()
  document.querySelector('.search-box input')?.focus()
}

function closeDialog() {
  showDialog.value = false
}

function onSearchInput() {
  if (!keyword.value.trim()) {
    searchResults.value = []
    searched.value = false
    selectedPOI.value = null
    return
  }
  searching.value = true
  searched.value = false
  placeSearch.search(keyword.value, function(status: string, result: any) {
    searching.value = false
    searched.value = true
    if (status === 'complete' && result?.poiList?.pois) {
      searchResults.value = result.poiList.pois
      selectedIndex.value = -1
      selectedPOI.value = null
    } else {
      searchResults.value = []
    }
  })
}

function selectResult(item: any, index: number) {
  selectedIndex.value = index
  selectedPOI.value = item
  pointName.value = item.name

  nextTick(() => {
    if (previewMap) previewMap.destroy()
    previewMap = new AMap.Map('preview-amap', {
      zoom: 15,
      center: [item.location.lng, item.location.lat]
    })
    new AMap.Marker({
      position: [item.location.lng, item.location.lat],
      content: '<div style="font-size:28px">📍</div>',
      offset: new AMap.Pixel(-14, -14)
    }).setMap(previewMap)
  })
}

function confirmAdd() {
  if (!selectedPOI.value) return
  const newId = Math.max(0, ...tripStore.points.map(p => p.id)) + 1
  tripStore.addPoint({
    id: newId,
    name: pointName.value,
    position: [selectedPOI.value.location.lng, selectedPOI.value.location.lat],
    type: pointType.value,
    description: pointDesc.value,
    travelTypeToHere: 'fly'
  })
  closeDialog()
}
</script>

<style scoped>
.add-point-btn {
  width: 100%;
  padding: 10px;
  background: var(--color-accent-bg);
  border: 2px dashed var(--color-brand-light);
  border-radius: var(--radius-md);
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--space-3);
}
.add-point-btn:hover {
  background: var(--color-surface-2);
  border-style: solid;
}

.dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(61,46,36,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}
.dialog-header h3 { margin: 0; font-size: 18px; color: var(--color-text); font-family: var(--font-display); }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--color-text-3); padding: 4px; }
.close-btn:hover { color: var(--color-text); }

.dialog-body { padding: var(--space-5) var(--space-6); flex: 1; overflow-y: auto; }

.search-box { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
.search-box input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
  background: var(--color-card);
  color: var(--color-text);
}
.search-box input:focus { border-color: var(--color-brand); }
.search-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: background var(--transition-fast);
}
.search-btn:hover { background: var(--color-brand-dark); }

.results-list { max-height: 200px; overflow-y: auto; margin-bottom: var(--space-3); }
.result-item {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-bottom: 4px;
  transition: background var(--transition-fast);
}
.result-item:hover, .result-item.selected { background: var(--color-surface); }
.result-name { font-size: 14px; font-weight: 500; color: var(--color-text); }
.result-address { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.empty-hint { text-align: center; padding: var(--space-5); color: var(--color-text-3); font-size: 13px; }

.preview-map { margin: var(--space-3) 0; border-radius: var(--radius-md); overflow: hidden; }
.preview-amap { width: 100%; height: 180px; }

.point-form { display: flex; flex-direction: column; gap: var(--space-3); }
.form-row { display: flex; align-items: center; gap: var(--space-3); }
.form-row label { width: 50px; font-size: 13px; color: var(--color-text-2); flex-shrink: 0; }
.form-row input, .form-row select {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  background: var(--color-card);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}
.form-row input:focus, .form-row select:focus { border-color: var(--color-brand); }
.coords { font-size: 12px; color: var(--color-text-3); font-family: monospace; }

.dialog-footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.dialog-footer .btn { flex: 1; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: 14px; border: none; cursor: pointer; transition: all var(--transition-fast); }
.dialog-footer .btn-secondary { background: var(--color-surface); color: var(--color-text-2); }
.dialog-footer .btn-secondary:hover { background: var(--color-surface-2); }
.dialog-footer .btn-primary { background: var(--color-brand); color: white; }
.dialog-footer .btn-primary:hover { background: var(--color-brand-dark); }
.dialog-footer .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
