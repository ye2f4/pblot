# Docusaurus 静态站点搭建 从零到完整部署流程
>发布时间：2025-06-05

## 一、前言
Docusaurus 是 React 静态站点框架，适合搭建技术博客、文档站。

## 二、创建项目
```bash
npx create-docusaurus@latest my-blog classic
cd my-blog
npm run start
```

## 三、项目目录
docs/：文档；blog/：博客；static/：静态资源；docusaurus.config.js：配置文件。

## 四、打包部署
```bash
npm run build
```

## 五、总结
Docusaurus 简单易用，配合 GitHub Pages 免费托管。