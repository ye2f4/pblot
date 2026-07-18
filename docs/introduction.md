<div align="center">

<img src="/img/logo.svg" alt="Monoの小窝 Logo" width="90" style={{marginBottom: "12px"}}/>

# 🛰️ Monoの小窝
### 专注 ESP32P4 智能手表 · LVGL · Meshtastic · 开源硬件 与全栈技术分享

> 一半黑发藏温柔，一半白发载星网。

<br />

[![Docusaurus](https://img.shields.io/badge/Powered-Docusaurus-2E85E5?logo=docusaurus&logoColor=white)](https://docusaurus.io/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/Offline-PWA-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Site](https://img.shields.io/badge/Online-monoblog.cc.cd-2088FF?logo=githubpages&logoColor=white)](https://monoblog.cc.cd)

<br />

[![GitHub](https://img.shields.io/badge/GitHub-ye2f4-181717?logo=github&logoColor=white)](https://github.com/ye2f4)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

---

## 📖 项目简介
**Monoの小窝** 是一个由 Mono 打造的个人技术分享站点，基于 **Docusaurus + Supabase** 全栈架构，融合「静态文档 / 博客 + 动态社区 + 实时数据」于一体。

站点聚焦 **ESP32P4 智能手表、LVGL 图形开发、Meshtastic Mesh 网络、开源硬件** 等硬核主题，同时涵盖 React 全栈教程、游戏模组、个人随笔与开源项目。依托 Supabase 提供身份认证、PostgreSQL 数据存储与 Realtime 实时订阅，无需自建后端即可实现评论、聊天、硬件监控等动态能力。

### 设计理念
- ✅ **内容优先**：以技术文章、教程文档与开源项目为核心，沉淀长期价值
- ✅ **全栈一体**：Docusaurus 负责界面与文档，Supabase 提供后端与实时能力，开箱即用
- ✅ **社区互动**：评论、聊天室、论坛、排行榜、签到，让阅读与交流自然融合
- ✅ **工具赋能**：硬件监控、代码片段、PCB、全球天气时区等实用工具随取随用
- ✅ **轻量可部署**：支持 Vercel 部署，推送 GitHub 后自动构建

---

## ✨ 核心功能一览
<details open>
<summary>点击展开 / 收起 全部功能</summary>

### 🏠 首页与内容体系
- 统计卡片（MiddleStatsCard）、轮播、最新用户、标签云等丰富的首页模块
- 博客系统（Docusaurus 内置，支持 RSS 订阅）与文档系统（技术文章、教程）
- 「全部文章」聚合页：按标签自动分类博客与文档

### 👤 用户与社区
- 用户系统：GitHub / 第三方登录、注册、个人中心与资料管理
- 实时聊天室（Supabase Realtime 全双工通讯）、论坛、评论区
- 全站排行榜（活跃用户 / 热门主题）、每日签到、时光胶囊

### 🧰 工具箱
- 硬件监控：基于 ESP32 的设备电量 / 信号 / 温度实时曲线，多城市时间天气联动
- 代码片段库：前端 / React / 嵌入式常用片段与速查
- PCB 设计、开发工具合集
- 全球位置与实时天气：经纬度、时间查询，支持 IANA 时区与夏令时自动换算
- 全球访问地图：访客分布可视化

### 📚 资源与其他
- 资源中心：资料下载（教程 / 工具 / 源码 / 素材 / 硬件手册）、开源项目
- 老黄历：干支、时辰、卦象、宜忌、方位、太岁全套传统黄历
- 随机抽贴、关于本站、更新日志（Changelog）等

</details>

---

## 🧰 技术栈明细
| 分类 | 技术/框架 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | Docusaurus 3.x | 静态站点生成器，基于 React，专注文档 & 社区页面 |
| **UI 框架** | React 19 | 组件化前端，配合 Rspack 极速构建 |
| **样式** | Tailwind CSS | 原子化样式，定制主题（主色 `#2E7D9E`） |
| **语言** | TypeScript | 类型安全，提升可维护性 |
| **后端服务** | Supabase | 开源 Firebase 替代：PostgreSQL + 实时订阅 + 身份认证 |
| **数据库** | PostgreSQL | 关系型数据库，支持外键、事务、复杂查询 |
| **边缘函数** | Edge Functions (Deno) | 服务端逻辑与定时任务（如防休眠心跳） |
| **部署平台** | Vercel | 推送 GitHub 后自动构建部署 |
| **离线能力** | PWA | 渐进式 Web 应用，支持离线访问 |
| **图表** | Mermaid | 文档内图表渲染 |
| **搜索** | Algolia | 全文站点搜索 |

---

## 🌐 在线预览
> 线上访问地址

- 官方站点：https://monoblog.cc.cd
- GitHub：https://github.com/ye2f4

<br />
<div align="center">
<img src="/img/logo.svg" alt="Monoの小窝" width="200"/>
<p><i>站点 Logo（可替换为实际预览截图）</i></p>
</div>

---

## ⚙️ 前置环境依赖
> 本地开发、构建项目前，请确保你的设备已安装以下环境：

### 必装软件
1. **Node.js 18.x 及以上版本**
   推荐使用 `LTS` 长期支持版：[Node.js 官方下载](https://nodejs.org/)
2. **pnpm 包管理器**
   全局安装 pnpm（终端执行）：
   ```bash
   npm install -g pnpm
   ```
3. **（可选）Supabase 账号**
   用于后端能力（登录、评论、聊天、数据存储），注册地址：[Supabase 官网](https://supabase.com/)

### 本地启动
```bash
# 安装依赖
pnpm install

# 本地开发预览
pnpm start

# 生产构建
pnpm build
```

---

> 本文档结合 **Monoの小窝** 实际站点内容整理。更多模块可直接在站点顶部导航栏体验。
