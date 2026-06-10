<div align="center" markdown="1">

<!-- 替换为你自己的网站 Logo 地址（本地图片/CDN 均可） -->
<img src=".github/pblot_logo.png" alt="PBLOT Logo" width="80"/>

  <h1 align="center">PBLOT 社区平台</h1>
  <p style="font-size:15px;" align="center">
    基于 Docusaurus + Supabase 搭建的社区、个人中心与实时聊天系统
  </p>

<!-- 项目徽章：根据你的实际仓库/部署环境选用，已适配国内常用场景 -->
[![GitHub CI](https://img.shields.io/github/actions/workflow/status/ye2f4/pblot/deploy.yml?branch=main&label=Build&logo=github&color=yellow)](https://github.com/ye2f4/pblot/actions)
[![Docusaurus](https://img.shields.io/badge/Powered-Docusaurus-2E85E5?logo=docusaurus)](https://docusaurus.io/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/static/v1?label=Deploy&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com)

</div>

## 🛠️ 本地开发 & 项目构建

本项目基于 **Docusaurus** 开发，包含前端页面、用户系统、实时聊天、个人资料模块。
如需本地运行、调试或打包部署，请参考下方快速指南：

### 前置依赖
- Node.js 18+
- 包管理器：`pnpm`（项目默认使用）

### 本地启动（开发模式）
```bash
# 安装依赖
pnpm install

# 本地热启动（访问：http://localhost:3000/pblot）
pnpm start
