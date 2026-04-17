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

<script setup>
import { ref, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

const props = defineProps({ mapReady: Boolean })
const emit = defineEmits(['add'])

const showDialog = ref(false)
const keyword = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref([])
const selectedIndex = ref(-1)
const selectedPOI = ref(null)
const pointName = ref('')
const pointType = ref('attraction')
const pointDesc = ref('')

let AMap = null
let placeSearch = null
let previewMap = null
let initPromise = null  // 防止并发初始化

// 初始化高德和搜索服务
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
  // 确保插件已加载
  await new Promise(resolve => {
    if (AMap.PlaceSearch) {
      resolve()
    } else {
      AMap.plugin('AMap.PlaceSearch', resolve)
    }
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
  console.log('----')
  // 防止重复打开
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
  document.querySelector('.search-box input').focus()
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
  placeSearch.search(keyword.value, function(status, result) {
    searching.value = false
    searched.value = true
    if (status === 'complete' && result && result.poiList && result.poiList.pois) {
      searchResults.value = result.poiList.pois
      selectedIndex.value = -1
      selectedPOI.value = null
    } else {
      searchResults.value = []
    }
  })
}

function selectResult(item, index) {
  selectedIndex.value = index
  selectedPOI.value = item
  pointName.value = item.name

  nextTick(() => {
    if (previewMap) {
      previewMap.destroy()
    }
    previewMap = new AMap.Map('preview-amap', {
      zoom: 15,
      center: [item.location.lng, item.location.lat]
    })
    // 标记选中点
    new AMap.Marker({
      position: [item.location.lng, item.location.lat],
      content: '<div style="font-size:28px">📍</div>',
      offset: new AMap.Pixel(-14, -14)
    }).setMap(previewMap)
  })
}

function confirmAdd() {
  if (!selectedPOI.value) return
  emit('add', {
    name: pointName.value,
    position: [selectedPOI.value.location.lng, selectedPOI.value.location.lat],
    type: pointType.value,
    description: pointDesc.value
  })
  closeDialog()
}
</script>

<style scoped>
.add-point-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea22, #764ba222);
  border: 2px dashed #667eea;
  border-radius: 12px;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 10px;
}
.add-point-btn:hover {
  background: linear-gradient(135deg, #667eea33, #764ba233);
  border-style: solid;
}

.dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: white;
  border-radius: 16px;
  width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eee;
}
.dialog-header h3 { margin: 0; font-size: 18px; color: #333; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #999; padding: 4px; }
.close-btn:hover { color: #333; }

.dialog-body { padding: 20px 24px; flex: 1; overflow-y: auto; }

.search-box { display: flex; gap: 8px; margin-bottom: 12px; }
.search-box input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.search-box input:focus { border-color: #667eea; }
.search-btn {
  padding: 10px 18px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.results-list { max-height: 200px; overflow-y: auto; margin-bottom: 12px; }
.result-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
}
.result-item:hover, .result-item.selected { background: #f0f0f8; }
.result-name { font-size: 14px; font-weight: 500; color: #333; }
.result-address { font-size: 12px; color: #999; margin-top: 2px; }

.empty-hint { text-align: center; padding: 20px; color: #999; font-size: 13px; }

.preview-map { margin: 12px 0; border-radius: 12px; overflow: hidden; }
.preview-amap { width: 100%; height: 180px; }

.point-form { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; align-items: center; gap: 12px; }
.form-row label { width: 50px; font-size: 13px; color: #666; flex-shrink: 0; }
.form-row input, .form-row select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.form-row input:focus, .form-row select:focus { border-color: #667eea; }
.coords { font-size: 12px; color: #999; font-family: monospace; }

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid #eee;
}
.dialog-footer .btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; border: none; cursor: pointer; }
.dialog-footer .btn-secondary { background: #f0f0f0; color: #666; }
.dialog-footer .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.dialog-footer .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
