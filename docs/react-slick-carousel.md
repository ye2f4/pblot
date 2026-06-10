# React-Slick 轮播组件使用指南 附完整示例代码
> 发布时间：2025-06-04

## 一、前言
React-Slick 是 React 生态热门轮播组件，本文讲解安装、使用、配置。

## 二、环境安装
```bash
npm install react-slick slick-carousel --save
```

## 三、基础轮播实现
```js
import React from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
export default function Carousel() {
const settings = {
dots: true,
infinite: true,
speed: 500,
autoplay: true,
autoplaySpeed: 3000
};
return (
<Slider {...settings}>
<div><h3>轮播图1</h3></div> <div><h3>轮播图2</h3></div> </Slider> ); } 
```

## 四、常用配置
dots：分页圆点；autoplay：自动播放；arrows：左右箭头。

## 五、总结
React-Slick 开箱即用，是 React 轮播首选组件。