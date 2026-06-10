# JavaScript 定时器常见坑点与防抖节流优化方案
> 发布时间：2025-06-09

## 一、前言
定时器内存泄漏、执行堆积解决方案，防抖节流实战。

## 二、防抖封装
```js
function debounce (fn,delay){
let timer = null;
return (...args)=>{
clearTimeout (timer);
timer = setTimeout (()=>fn (...args),delay);
}
}
```

## 三、节流封装
```js
function throttle (fn,delay){
let timer = null;
return (...args)=>{
if (!timer){
timer = setTimeout (()=>{
fn (...args);
timer=null;
},delay);
}
}
}
```

## 四、总结
定时器必清除，防抖节流优化高频触发。