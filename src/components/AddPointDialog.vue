<template>
  <div class="add-point-wrap" v-bind="$attrs">
<!--    &lt;!&ndash; 添加点位按钮 &ndash;&gt;-->
<!--    <el-button class="add-point-btn" type="primary" plain @click="openDialog" :disabled="!mapReady">-->
<!--      添加点位-->
<!--    </el-button>-->

  <!-- 弹窗 -->
  <el-dialog
    v-model="showDialog"
    title="添加旅行点位"
    width="480px"
    :close-on-click-modal="true"
    destroy-on-close
  >
    <div class="dialog-body">
      <!-- 地点搜索 -->
      <el-input
        ref="searchInputRef"
        v-model="keyword"
        placeholder="输入地名搜索（如：芒市广场）"
        clearable
        @input="onSearchInput"
        @keyup.enter="onSearchInput"
     />
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

      <el-empty
        v-else-if="keyword && !searching && !searched"
        description="输入关键词搜索地点"
        :image-size="60"
      />
      <div v-else-if="searching" class="searching-tip">搜索中...</div>
      <el-empty
        v-else-if="searched && searchResults.length === 0"
        description="未找到相关地点"
        :image-size="60"
      />

      <!-- 预览地图 -->
      <div class="preview-map" v-if="selectedPOI">
        <div id="preview-amap" class="preview-amap"></div>
      </div>

      <!-- 点位信息表单 -->
      <div class="point-form" v-if="selectedPOI">
        <div class="form-row">
          <label>名称</label>
          <el-input v-model="pointName" />
        </div>
        <div class="form-row">
          <label>类型</label>
          <el-select v-model="pointType" style="width: 100%">
            <el-option value="food" label="🍜 美食" />
            <el-option value="attraction" label="🏛️ 景点" />
            <el-option value="activity" label="🎉 活动" />
            <el-option value="hotel" label="🏨 住宿" />
            <el-option value="transport" label="🚗 交通" />
          </el-select>
        </div>
        <div class="form-row">
          <label>描述</label>
          <el-input v-model="pointDesc" placeholder="简短描述（可选）" />
        </div>
        <div class="form-row coords-row">
          <label>坐标</label>
          <span class="coords">{{ selectedPOI.location.lng.toFixed(6) }}, {{ selectedPOI.location.lat.toFixed(6) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :disabled="!selectedPOI" @click="confirmAdd">
        确认添加
      </el-button>
    </template>
  </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

defineOptions({ inheritAttrs: false })

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
const searchInputRef = ref(null)

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
  searchInputRef.value?.focus?.()
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

defineExpose({ openDialog })
</script>

<style scoped>
.add-point-btn {
  padding: 9px 14px;
  background: oklch(55% 0.18 290 / 0.06);
  border: 1.5px solid oklch(55% 0.18 290 / 0.2);
  border-radius: 10px;
  color: oklch(55% 0.18 290);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.add-point-btn:hover {
  background: oklch(55% 0.18 290 / 0.1);
  border-color: oklch(55% 0.18 290 / 0.35);
}
.add-point-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-list {
  max-height: 200px;
  overflow-y: auto;
}
.result-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
}
.result-item:hover, .result-item.selected {
  background: oklch(55% 0.18 290 / 0.06);
}
.result-name { font-size: 13px; font-weight: 500; color: #1e293b; }
.result-address { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.searching-tip {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 13px;
}

.preview-map {
  border-radius: 10px;
  overflow: hidden;
}
.preview-amap {
  width: 100%;
  height: 160px;
}

.point-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}
.coords {
  font-size: 12px;
  color: #94a3b8;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
}
</style>
