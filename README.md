<div align="center">

<!-- 项目 Logo 区域 -->
<img src=".github/pblot_logo.png" alt="PBLOT Logo" width="90" style={{marginBottom: "12px"}}/>

# 🧩 PBLOT 社区平台
### 基于 Docusaurus + Supabase 构建的现代化社区 | 个人中心 | 实时聊天系统

> 轻量化、易部署、全开源的一体化社区解决方案，集成文档、用户体系、即时通讯与后台数据管理

<br />

<!-- 状态徽章组（分两行排版，国内稳定镜像，全统一域名） -->
<!-- 第一行：构建 & 技术栈 徽章 -->
[![GitHub CI](https://img.shields.io/github/actions/workflow/status/ye2f4/pblot/deploy.yml?branch=main&label=Build&logo=github&color=yellow)](https://github.com/ye2f4/pblot/actions)
[![Docusaurus](https://img.shields.io/badge/Powered-Docusaurus-2E85E5?logo=docusaurus&logoColor=white)](https://docusaurus.io/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-2088FF?logo=github&logoColor=white)](https://ye2f4.github.io/pblot/)

<br />

<!-- 第二行：Shields 动态徽章（追加个人Token，替换为你自己的Token） -->
[![GitHub Stars](https://img.shields.io/github/stars/ye2f4/pblot?logo=github&color=blue&gh_token=你的GitHubToken)](https://github.com/ye2f4/pblot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/ye2f4/pblot?logo=github&color=lightblue&gh_token=你的GitHubToken)](https://github.com/ye2f4/pblot/fork)
[![GitHub Issues](https://img.shields.io/github/issues/ye2f4/pblot?logo=github&color=red&gh_token=你的GitHubToken)](https://github.com/ye2f4/pblot/issues)
[![License](https://img.shields.io/github/license/ye2f4/pblot?color=green&gh_token=你的GitHubToken)](LICENSE)
[![Node Version](https://img.shields.io/github/package-json/node-version/ye2f4/pblot?logo=node.js&color=339933&gh_token=你的GitHubToken)](https://nodejs.org/)

</div>

---

## 📖 项目简介
**PBLOT** 是一款融合「静态文档站点 + 动态社区 + 实时聊天」的全栈开源平台。
依托 **Docusaurus** 搭建前端界面与文档系统，搭配 **Supabase（PostgreSQL + 实时订阅）** 提供完整后端能力，无需独立搭建服务器、数据库与接口服务，开箱即用、部署简单。

### 设计理念
- ✅ **低门槛**：基于主流技术栈，新手也能快速上手二次开发
- ✅ **全功能**：文档展示 + 用户登录/个人中心 + 即时聊天三位一体
- ✅ **易部署**：支持 Vercel、GitHub Pages、自有服务器 多种部署方案
- ✅ **高扩展**：基于 Supabase 原生能力，支持数据存储、权限控制、实时推送

---

## ✨ 核心功能一览
<details open>
<summary>点击展开 / 收起 全部功能</summary>

### 🏠 基础站点能力
- 基于 Docusaurus 标准文档结构，支持 Markdown 文档渲染、分类、标签、搜索
- 响应式布局，完美适配 PC / 平板 / 手机 多端访问
- 自定义页面、导航栏、侧边栏、站点样式，高度可定制

### 👤 用户系统
- 对接 Supabase 原生账号体系，支持邮箱登录/注册
- 独立个人中心：资料编辑、头像设置、基础信息管理
- 数据库权限隔离，保障用户数据安全

### 💬 实时聊天系统
- 基于 Supabase Realtime 实现**全双工即时通讯**
- 消息持久化存储，历史记录可回溯
- 标准消息表结构，支持后续扩展表情包、文件传输等功能

### 🛡️ 数据底层
- 基于 PostgreSQL 关系型数据库，数据结构规范、稳定可靠
- 完整外键约束、数据校验机制，保证数据完整性
- 可视化后台（Supabase Dashboard），一键管理数据表、数据、权限

</details>

---

## 🧰 技术栈明细
| 分类 | 技术/框架 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | Docusaurus 3.x | 静态站点生成器，基于 React，专注文档 & 社区页面 |
| **后端服务** | Supabase | 开源 Firebase 替代方案，内置 PostgreSQL + 实时订阅 + 身份认证 |
| **数据库** | PostgreSQL | 关系型数据库，支持外键、事务、复杂查询 |
| **包管理器** | pnpm | 快速、节省磁盘空间的现代包管理工具 |
| **部署平台** | Vercel / GitHub Pages | 免费静态站点托管，自动 CI/CD 构建部署 |
| **实时通信** | Supabase Realtime | 数据库变更实时推送，实现聊天消息即时同步 |

---

## 🌐 在线预览
> 线上访问地址（持续更新）
- GitHub Pages：https://ye2f4.github.io/pblot/
- Vercel 部署地址：待补充

<br />

<!-- 预览截图占位，后续可替换为真实页面截图 -->
<div align="center">
<img src=".github/preview_demo.png" alt="PBLOT 站点预览" width="800"/>
<p><i>站点预览示意图（可替换为实际截图）</i></p>
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
   # 全局安装 pnpm
   npm install -g pnpm