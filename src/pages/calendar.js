import React, { useState } from 'react';
import Layout from '@theme/Layout';
// 新增：导入 Docusaurus 路由钩子
import { useHistory } from '@docusaurus/router';
// 修正：相对路径导入JSON配置
import config from '../data/calendar.json';

// ====================== 底层历法算法（已修复所有只读变量错误） ======================
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095a0, 0x049b0, 0x0a974, 0x0a4b0, 0x0aa50, 0x1b252, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
  0x049f8, 0x04970, 0x064b0, 0x074a4, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x04ae0, 0x0a7a7, 0x0a4d0, 0x0d160, 0x0f256
];
const sTermInfo = [0, 21208, 42467, 63830, 85300, 106863, 128530, 150242, 171980, 193792, 215662, 237567,
  259483, 281329, 303151, 324984, 346798, 368634, 390447, 412280, 434093, 455936, 477758, 499610];

// 公历转农历（核心：修复const→let，解决只读报错）
function solarToLunar(solarDate) {
  const sy = solarDate.getFullYear();
  const sm = solarDate.getMonth() + 1;
  const sd = solarDate.getDate();
  const baseDate = new Date(1900, 0, 31);
  // 🔥 修复：const 改为 let，允许变量被修改
  let offset = Math.floor((solarDate - baseDate) / 86400000);

  let ly = 1900, lm = 1, ld = 1;
  let lunarYearDays, leap = 0, leapDays = 0;
  while (ly < 2100 && offset > 0) {
    lunarYearDays = getLunarYearDays(ly);
    if (offset < lunarYearDays) break;
    offset -= lunarYearDays;
    ly++;
  }

  leap = getLeapMonth(ly);
  let isLeap = false;
  for (lm = 1; lm < 13 && offset > 0; lm++) {
    if (leap > 0 && lm === leap + 1 && !isLeap) {
      lm--;
      isLeap = true;
      leapDays = getLeapDays(ly);
      if (offset < leapDays) break;
      offset -= leapDays;
    } else {
      lunarYearDays = getLunarMonthDays(ly, lm);
      if (offset < lunarYearDays) break;
      offset -= lunarYearDays;
    }
  }
  ld = offset + 1;

  const yearGanZhi = getGanZhi(ly);
  const isBigMonth = getLunarMonthDays(ly, lm) === 30;
  return {
    lunarYear: ly,
    lunarMonth: lm,
    lunarDay: ld,
    isLeapMonth: isLeap,
    isBigMonth: isBigMonth,
    gan: yearGanZhi.gan,
    zhi: yearGanZhi.zhi,
    animal: yearGanZhi.animal
  };
}
function getLunarYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
  return sum + getLeapDays(y);
}
function getLeapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
function getLeapDays(y) { return getLeapMonth(y) ? (lunarInfo[y - 1900] & 0x10000 ? 30 : 29) : 0; }
function getLunarMonthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function getGanZhi(y) {
  const g = (y - 4) % 10;
  const z = (y - 4) % 12;
  return { gan: config.baseDict.gan[g], zhi: config.baseDict.zhi[z], animal: config.baseDict.animal[z] };
}

// 节气、星座、日干支
function getCurrentJieQi(date) {
  const year = date.getFullYear();
  const base = new Date(year, 0, 1);
  const offSet = Math.floor((date - base) / 86400000);
  for (let i = 0; i < 24; i++) {
    const temp = sTermInfo[i] + (year - 1900) * 365.2422;
    if (Math.floor(temp) === offSet) return config.baseDict.jieQiName[i];
  }
  return "";
}
function getXingZuo(month, day) {
  const arr = [
    { m: 1, d: 20, x: '水瓶座' }, { m: 2, d: 19, x: '双鱼座' }, { m: 3, d: 21, x: '白羊座' },
    { m: 4, d: 20, x: '金牛座' }, { m: 5, d: 21, x: '双子座' }, { m: 6, d: 22, x: '巨蟹座' },
    { m: 7, d: 23, x: '狮子座' }, { m: 8, d: 23, x: '处女座' }, { m: 9, d: 23, x: '天秤座' },
    { m: 10, d: 24, x: '天蝎座' }, { m: 11, d: 23, x: '射手座' }, { m: 12, d: 22, x: '摩羯座' }
  ];
  let xing = "摩羯座";
  for (let i = 0; i < arr.length; i++) {
    if (month === arr[i].m && day >= arr[i].d) xing = arr[i].x;
    if (month === arr[i].m + 1 && day < arr[i].d) xing = arr[i].x;
  }
  return xing;
}
function getDayGanZhi(date) {
  const baseDay = new Date(2000, 0, 1);
  const dayDiff = Math.floor((date - baseDay) / 86400000);
  const gIdx = (54 + dayDiff) % 10;
  const zIdx = (11 + dayDiff) % 12;
  return { gIdx, zIdx, gan: config.baseDict.gan[gIdx], zhi: config.baseDict.zhi[zIdx] };
}

// ====================== 动态匹配函数（JSON配置读取） ======================
function getYueLingWuHou(lunarMonth) {
  const idx = (lunarMonth - 1) % 12;
  return config.yueLingWuHou[idx];
}
function getLiuYao(date) {
  const totalDays = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const idx = totalDays % 7;
  return config.liuYaoList[idx];
}
function getRiLu(ganIdx) {
  return config.riLuList[ganIdx];
}
function getTaiShen(zhiIdx) {
  return config.taiShenList[zhiIdx];
}
function getGuiShen(ganIdx) {
  return config.guiShenList[ganIdx % config.guiShenList.length];
}
function getGua(date) {
  const days = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const idx = days % config.guaList.length;
  return config.guaList[idx];
}
function getYiJi(date) {
  const days = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const yiIdx = days % config.yiJiBase.fullYi.length;
  const jiIdx = days % config.yiJiBase.fullJi.length;
  return {
    yi: [config.yiJiBase.fullYi[yiIdx], config.yiJiBase.fullYi[(yiIdx + 2) % config.yiJiBase.fullYi.length]],
    ji: ["余事勿取"]
  };
}
function buildShiChenList(dayGanIdx, dayZhiIdx, year) {
  const list = [];
  const yIdx = Math.floor((year - 4) / 60) % 6;
  for (let i = 0; i < 12; i++) {
    const sc = config.shiChenBase[i];
    const gIdx = config.baseDict.gan.indexOf(sc.gan);
    const zIdx = i;
    const chongIdx = (zIdx + 6) % 12;
    list.push({
      name: sc.name,
      time: `${sc.start}:00-${sc.end === 1 ? "00" : sc.end}:00`,
      ganZhi: `${config.baseDict.gan[gIdx]}${config.baseDict.zhi[zIdx]}`,
      chong: `冲${config.baseDict.animal[chongIdx]}煞${config.baseDict.direction[chongIdx % 4]}`,
      naYin: config.naYinTable[yIdx][gIdx % 5],
      wealthPos: config.posMap.wealth[gIdx % 5],
      happyPos: config.posMap.happy[gIdx % 5],
      blessPos: config.posMap.blessing[gIdx % 5],
      ji: [0, 2, 4, 6, 9].includes(i),
      yi: config.yiJiBase.fullYi[i % config.yiJiBase.fullYi.length],
      jiTaboo: config.yiJiBase.fullJi[i % config.yiJiBase.fullJi.length]
    });
  }
  return list;
}

// 整合黄历数据
function buildHuangLiData(inputDate) {
  const y = inputDate.getFullYear();
  const m = inputDate.getMonth() + 1;
  const d = inputDate.getDate();
  const weekIdx = inputDate.getDay();
  const weekCn = config.baseDict.weekCn[weekIdx];

  const lunar = solarToLunar(inputDate);
  const jieQi = getCurrentJieQi(inputDate) || "无";
  const dayGZ = getDayGanZhi(inputDate);
  const xingZuo = getXingZuo(m, d);
  const pengZu = config.pengZuList[dayGZ.zIdx];
  const ylwh = getYueLingWuHou(lunar.lunarMonth);
  const liuYao = getLiuYao(inputDate);
  const riLu = getRiLu(dayGZ.gIdx);
  const taiShen = getTaiShen(dayGZ.zIdx);
  const guiShen = getGuiShen(dayGZ.gIdx);
  const gua = getGua(inputDate);
  const yiJi = getYiJi(inputDate);
  const shiChenList = buildShiChenList(dayGZ.gIdx, dayGZ.zIdx, y);

  return {
    year: y, month: m, day: d, week: weekCn,
    lunarStr: `${lunar.lunarYear}年${lunar.isLeapMonth ? '闰' : ''}${config.baseDict.monthCn[lunar.lunarMonth - 1]}${config.baseDict.dayCn[lunar.lunarDay]} ${lunar.isBigMonth ? '大月' : '小月'}`,
    yearGanZhi: `${lunar.gan}${lunar.zhi}`,
    dayGanZhi: `${dayGZ.gan}${dayGZ.zhi}`,
    animal: lunar.animal,
    jieQi, xingZuo,
    wealthPos: config.posMap.wealth[dayGZ.gIdx % 5],
    happyPos: config.posMap.happy[dayGZ.gIdx % 5],
    blessPos: config.posMap.blessing[dayGZ.gIdx % 5],
    noblePos: guiShen,
    taiShen,
    chongSha: `${lunar.animal}日冲(${dayGZ.gan}${dayGZ.zhi})${config.baseDict.animal[(dayGZ.zIdx + 6) % 12]}`,
    yi: yiJi.yi,
    ji: yiJi.ji,
    pengZu,
    gua,
    yueLing: ylwh.yueLing,
    wuHou: ylwh.wuHou,
    liuYao,
    riLu,
    taiSui: `${lunar.gan}${lunar.zhi}${lunar.animal}`,
    shiChenList
  };
}

// ====================== 页面组件（日期选择器+完整UI） ======================
export default function Calendar() {
  // 路由历史对象
  const history = useHistory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const data = buildHuangLiData(currentDate);

  // 【修复】安全返回函数：兼容空历史记录场景
  const handleGoBack = () => {
    // 判断路由历史长度，有上一页则返回，无则跳转到首页
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/');
    }
  };

  // 日期切换
  const changeDay = (num) => {
    const nd = new Date(currentDate);
    nd.setDate(nd.getDate() + num);
    setCurrentDate(nd);
  };
  const resetToday = () => setCurrentDate(new Date());
  const selectDate = (day) => {
    const newDate = new Date(pickerYear, pickerMonth, day);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  // 样式
  const baseBtn = { padding: '6px 14px', background: '#D32F2F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' };
  const blockCard = { background: '#fff', border: '2px solid #D32F2F', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };
  const subBlock = { background: '#fef8e6', borderRadius: '10px', padding: '14px', margin: '10px 0' };
  const pickerPanel = { position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '2px solid #D32F2F', borderRadius: '12px', padding: '12px', zIndex: 9999, minWidth: '280px' };
  const dayItem = { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer', border: '1px solid #eee' };

  // 渲染日期选择器
  const renderPickerDays = () => {
    const days = [];
    const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
    const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} style={{ ...dayItem, border: 'none' }}></div>);
    for (let d = 1; d <= totalDays; d++) {
      const isCurrent = d === currentDate.getDate() && pickerYear === currentDate.getFullYear() && pickerMonth === currentDate.getMonth();
      days.push(<div key={d} style={{ ...dayItem, background: isCurrent ? '#D32F2F' : '#fff', color: isCurrent ? '#fff' : '#333' }} onClick={() => selectDate(d)}>{d}</div>);
    }
    return days;
  };

  return (
    <Layout title="正统完整版老黄历" description="干支、时辰、卦象、宜忌、方位、太岁全套传统黄历">
      <div style={{ minHeight: '100vh', background: '#FFF8E1', padding: '20px', fontFamily: '"SimSun","Microsoft YaHei",serif' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 替换为修复后的点击事件 */}
          <button onClick={handleGoBack} style={baseBtn}>← 返回</button>
          <h2 style={{ color: '#B71C1C', margin: 0, fontSize: '24px' }}>📜 正统完整版老黄历</h2>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={blockCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => changeDay(-1)} style={baseBtn}>◀ 前一日</button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button onClick={() => { setShowDatePicker(!showDatePicker); setPickerYear(currentDate.getFullYear()); setPickerMonth(currentDate.getMonth()); }} style={{ ...baseBtn, background: '#b71c1c' }}>📅 选择日期</button>
                {showDatePicker && (
                  <div style={pickerPanel} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <button onClick={() => setPickerYear(pickerYear - 1)}>◀</button>
                      <span>{pickerYear}年{pickerMonth + 1}月</span>
                      <button onClick={() => setPickerYear(pickerYear + 1)}>▶</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                      <button onClick={() => setPickerMonth(pickerMonth - 1)}>←</button>
                      <button onClick={() => setPickerMonth(pickerMonth + 1)}>→</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,32px)', gap: '2px', marginBottom: '8px' }}>{['日', '一', '二', '三', '四', '五', '六'].map(w => <div key={w} style={{ textAlign: 'center', fontSize: '12px' }}>{w}</div>)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,32px)', gap: '2px', marginTop: '4px' }}>{renderPickerDays()}</div>
                  </div>
                )}
              </div>
              <button onClick={resetToday} style={baseBtn}>回到今日</button>
              <button onClick={() => changeDay(1)} style={baseBtn}>后一日 ▶</button>
            </div>

            {/* 核心信息 */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: '16px' }}>
              <h1 style={{ color: '#D32F2F', fontSize: '42px', margin: '0 0 6px 0' }}>{data.year}年{data.month}月{data.day}日 星期{data.week}</h1>
              <h3 style={{ margin: 0, color: '#333' }}>农历：{data.lunarStr} | 节气：{data.jieQi} | 生肖：{data.animal} | 星座：{data.xingZuo}</h3>
              <p>干支：{data.yearGanZhi}年 {data.dayGanZhi}日</p>
            </div>

            {/* 六神方位 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', margin: '16px 0' }}>
              {[{ label: '财神', val: data.wealthPos, color: '#d97706' }, { label: '喜神', val: data.happyPos, color: '#0284c7' }, { label: '福神', val: data.blessPos, color: '#16a34a' }, { label: '贵神', val: data.noblePos, color: '#7c3aed' }, { label: '胎神', val: data.taiShen, color: '#c026d3' }, { label: '冲煞', val: data.chongSha, color: '#dc2626' }].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: `${item.color}15` }}>
                  <div style={{ fontWeight: 'bold', color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: '14px' }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* 宜忌 */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, background: '#e8f5e8', padding: '14px', borderRadius: '10px' }}>
                <h4 style={{ color: '#2e7d32' }}>✅ 今日宜</h4>
                <p>{data.yi.join('  ')}</p>
              </div>
              <div style={{ flex: 1, background: '#ffebee', padding: '14px', borderRadius: '10px' }}>
                <h4 style={{ color: '#c62828' }}>❌ 今日忌</h4>
                <p>{data.ji.join('  ')}</p>
              </div>
            </div>

            {/* 卦象 */}
            <div style={subBlock}>
              <p><strong>彭祖百忌：</strong>{data.pengZu}</p>
              <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                <h4>📖 今日卦象：{data.gua.name}</h4>
                <p><strong>卦辞：</strong>{data.gua.xiang}</p>
                <p><strong>事业参考：</strong>{data.gua.shi}</p>
              </div>
            </div>
          </div>

          {/* 月令五行 */}
          <div style={blockCard}>
            <h3 style={{ color: '#B71C1C' }}>📋 月令五行参考</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              <div><strong>月令：</strong>{data.yueLing}</div>
              <div><strong>物候：</strong>{data.wuHou}</div>
              <div><strong>六耀：</strong>{data.liuYao}</div>
              <div><strong>日禄：</strong>{data.riLu}</div>
              <div><strong>本命太岁：</strong>{data.taiSui}</div>
              <div><strong>本命生肖：</strong>{data.animal}</div>
            </div>
          </div>

          {/* 十二时辰 */}
          <div style={blockCard}>
            <h3 style={{ color: '#B71C1C' }}>⏰ 十二时辰吉凶对照表</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#D32F2F', color: '#fff' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>时辰</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>时间</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>干支</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>冲煞</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>纳音</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>财神</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>吉凶</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>时宜</th><th style={{ border: '1px solid #ddd', padding: '8px' }}>时忌</th>
                </tr></thead>
                <tbody>{data.shiChenList.map((sc, i) => (
                  <tr key={i} style={{ background: sc.ji ? '#f0fff4' : '#fff5f5' }}>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.time}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.ganZhi}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.chong}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.naYin}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.wealthPos}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: sc.ji ? '#2e7d32' : '#c62828' }}>{sc.ji ? '吉' : '凶'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.yi}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{sc.jiTaboo}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#888' }}>传统民俗黄历 · 仅供娱乐参考</div>
        </div>
      </div>
    </Layout>
  );
}
