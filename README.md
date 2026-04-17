# 🗺️ 旅行轨迹动画

用 Vue 3 + 高德地图实现的旅行轨迹动画效果，仿携程地图旅行动画。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置高德地图 Key

> ⚠️ 这是最关键的步骤，不配置 Key 地图无法显示！

1. 去[高德开放平台](https://lbs.amap.com/)注册账号
2. 创建应用，获取 **Web JS API** 的 Key 和 **安全密钥**
3. 复制 `.env.example` 为 `.env`（如果没有则创建），填入你的 Key：

```bash
VITE_AMAP_KEY=你的高德WebJSAPIKey
VITE_AMAP_SECURITY_CODE=你的安全密钥
```

> ⚠️ `.env` 文件不要提交到 Git！已在 `.gitignore` 中忽略。

### 3. 运行

```bash
npm run dev
```

打开 http://localhost:5173 查看效果。

---

## 📁 项目结构

```
src/
├── main.js              # 入口，配置高德地图 Key
├── App.vue              # 主布局
├── views/
│   └── TravelMap.vue    # 🗺️ 地图轨迹动画主页面
├── components/          # 组件目录（可扩展）
└── data/
    └── sampleTrip.js    # 示例行程数据
```

---

## 🎮 功能

- [x] 地图上显示行程轨迹线
- [x] 标记每个目的地
- [x] 点击播放/暂停动画
- [x] 控制播放速度（0.5x / 1x / 2x / 4x）
- [x] 下一步/重置控制
- [x] 点击地点列表跳转
- [x] 自动平移跟随当前位置

---

## 📝 自定义行程

修改 `src/data/sampleTrip.js` 中的 `sampleTrip` 对象：

```javascript
export const sampleTrip = {
  title: '你的旅行标题',
  date: '旅行日期',
  points: [
    {
      id: 1,
      name: '地点名称',
      position: [经度, 纬度],  // ← 高德坐标
      description: '描述',
      type: 'food'  // food | attraction | activity | hotel | transport
    },
    // 更多地点...
  ]
}
```

---

## 🛠️ 技术栈

- **Vue 3** - 框架
- **Vite** - 构建工具
- **vue-amap** - 高德地图 Vue 组件封装
- **Element Plus** - UI 组件库
- **高德地图 JS API 2.0** - 地图服务

---

## ⚠️ 注意事项

1. **Key 配置**：必须申请高德 Web JS API Key，Web 服务 Key 不行
2. **坐标**：高德地图使用 GCJ-02 坐标系，别用 GPS 原始坐标
3. **域名白名单**：高德 Key 需要配置域名白名单，本地开发用 `localhost` 即可
