# CSS 模糊效果实现：图片模糊、毛玻璃、文字模糊多场景写法
>发布时间：2025-06-03

## 一、前言
模糊效果是前端页面常用样式，依靠 CSS filter、backdrop-filter 属性实现，本文分享全场景可用代码。

## 二、基础属性：filter 模糊
**图片模糊**
```css
.img-blur {
filter: blur (8px);
transform: translateZ (0);
}
```
**文字模糊**
```css
.text-blur {
font-size: 24px;
filter: blur (2px);
}
```

## 三、高级效果：毛玻璃（磨砂玻璃）
```css
.container {
width: 500px;
height: 300px;
background: url ("bg.jpg") center/cover;
position: relative;
}
.glass-card {
width: 200px;
height: 100px;
position: absolute;
top: 50%;
left: 50%;
transform: translate (-50%,-50%);
backdrop-filter: blur (10px);
-webkit-backdrop-filter: blur (10px);
background: rgba (255,255,255,0.2);
border-radius: 8px;
}
```

## 四、兼容与避坑
移动端需加 -webkit- 前缀；
父级不要设置 overflow:hidden；
大面积模糊会影响性能。

## 五、总结
```css
filter:blur () 用于元素整体模糊
```
```css
backdrop-filter:blur () 用于毛玻璃效果
```