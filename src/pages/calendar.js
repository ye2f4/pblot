import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';
// 1. 导入JSON配置
import config from '../data/calendar.json';
// 2. 从公共库导入全套历法函数（核心修改）
import { buildHuangLiData } from '../lib/calendar';

// ====================== 页面组件（日期选择器+完整UI） ======================
export default function Calendar() {
  // 路由历史对象
  const history = useHistory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  // 调用公共函数生成黄历数据
  const data = buildHuangLiData(currentDate, config);

  // 安全返回函数
  const handleGoBack = () => {
    history.push('/');
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