# Docusaurus 主题美化与 CSS 样式自定义配置
> 发布时间：2025-06-10

## 一、前言
Docusaurus 样式自定义，全局 CSS 配置。

## 二、自定义样式文件
src/css/custom.css

## 三、毛玻璃导航栏
```css
.navbar {
backdrop-filter: blur (8px);
background: rgba (255,255,255,0.8) !important;
}
```

## 四、总结
通过 custom.css 轻松美化博客主题。