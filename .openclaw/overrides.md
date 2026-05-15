cat > .openclaw/overrides.md << 'EOF'
# Project Overrides: trip-map-anim

## 项目目标
基于现有 Vue3+Vite+GSAP+高德地图项目做功能迭代和代码重构。

## 现有问题（需要修复）
- 代码组织混乱，需按 Architect 规范重构目录
- GSAP 动画未做移动端降级
- 高德地图组件未封装，Key 硬编码
- 缺少统一 design-token

## 技术栈锁定
- 框架：Vue 3.4+（Composition API, `<script setup>`）
- 构建：Vite 5+
- 样式：TailwindCSS 3.4+
- 动画：GSAP 3.12+（ScrollTrigger, SplitText）
- 地图：高德地图 JS API 2.0（@amap/amap-jsapi-loader）
- 图标：Lucide Vue
- 路由：Vue Router 4（history 模式）
- 测试：Vitest + Vue Test Utils + Playwright
- 部署：Vercel（已有项目）

## 特殊规范
- API Key 存储在 `.env.local` 的 `VITE_AMAP_KEY`，禁止重新申请
- 3D 模型文件（.glb）放在 `public/models/`
- 图片资源放在 `public/images/`，> 200KB 必须压缩为 WebP

## 页面清单
1. 首页（Hero + 作品展示 + GSAP 动画）
2. 关于我
3. 博客列表
4. 博客详情
5. 联系页（含高德地图）

## 性能基线
- 首屏 LCP < 2.5s
- CLS < 0.1
- 动画帧率 ≥ 55fps（iPhone 14）
- 单个 JS chunk < 500KB
  EOF