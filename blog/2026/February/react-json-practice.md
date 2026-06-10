# React 项目结合 JSON 静态数据调用实战
>发布时间：2025-06-08

## 一、前言
React 读取本地 JSON 渲染列表实战。

## 二、JSON 文件
```bash
public/data/article.json
```
## 三、核心代码
```js
import {useState, useEffect} from 'react';
function ArticleList () {
const [list, setList] = useState ([]);
useEffect (() => {
fetch ("/data/article.json")
.then (res=>res.json ())
.then (data=>setList (data));
}, []);
return (
<div> {list.map(item=>( <div key={item.id}>{item.title}</div> ))} </div> ); }
```

## 四、总结
React+JSON 适合无后端静态项目。