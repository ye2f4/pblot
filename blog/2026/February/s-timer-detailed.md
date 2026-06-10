# JavaScript 定时器详解：setTimeout 与 setInterval 全解析
> 发布时间：2025-06-02

## 一、前言
定时器是 JavaScript 核心常用功能，广泛用于轮播、倒计时、延时弹窗、轮询请求等场景。本文全面讲解 setTimeout、setInterval 用法、执行机制、清除方法及底层原理。

### 二、setTimeout 延时定时器
作用：延迟指定时间后，执行一次代码。
基础语法
```js
const timer1 = setTimeout (() => {
console.log ("3 秒后执行");
}, 3000);
clearTimeout (timer1);
```

## 三、setInterval 循环定时器
作用：每隔指定时间，重复执行代码。
基础语法
```js
const timer2 = setInterval (() => {
console.log ("每秒执行一次");
}, 1000);
clearInterval (timer2);
```

## 四、经典案例：页面倒计时
```js
<div id="countdown">10</div>
<script> let num = 10; 
const dom = document.getElementById("countdown"); 
const countTimer = setInterval(() => { num--; dom.innerText = num; if (num <= 0) { clearInterval(countTimer); dom.innerText = "倒计时结束"; } }, 1000); 
</script>
```

## 五、核心知识点：宏任务与执行队列
JS 定时器不会精准计时，属于宏任务，等待主线程执行完毕后运行。

## 六、总结
setTimeout：单次延时执行；
setInterval：循环重复执行；
定时器使用完毕务必手动清除，避免内存泄漏。