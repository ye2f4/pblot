import React, { useState, useEffect } from 'react';
import { useHistory } from '@docusaurus/router';

export const locationList = [
  { name: '北京', lat: 39.9042, lon: 116.4074, code: 'beijing' },
  { name: '上海', lat: 31.2304, lon: 121.4737, code: 'shanghai' },
  { name: '广州', lat: 23.1291, lon: 113.2644, code: 'guangzhou' },
  { name: '深圳', lat: 22.5431, lon: 114.0579, code: 'shenzhen' },
  { name: '成都', lat: 30.5728, lon: 104.0668, code: 'chengdu' },
  { name: '杭州', lat: 30.2741, lon: 120.1551, code: 'hangzhou' },
  { name: '武汉', lat: 30.5928, lon: 114.3055, code: 'wuhan' },
  { name: '西安', lat: 34.2644, lon: 108.9497, code: 'xian' },
  { name: '东京', lat: 35.6762, lon: 139.6503, code: 'tokyo' },
  { name: '纽约', lat: 40.7128, lon: -74.0060, code: 'newyork' },
  { name: '伦敦', lat: 51.5074, lon: -0.1278, code: 'london' },
  { name: '悉尼', lat: -33.8688, lon: 151.2093, code: 'sydney' },
  { name: '巴黎', lat: 48.8566, lon: 2.3522, code: 'paris' },
  { name: '首尔', lat: 37.5665, lon: 126.9780, code: 'seoul' },
];

const LOCATION_STORAGE_KEY = 'weather_selected_location';
const getCacheKey = (locCode) => `blog_weather_cache_${locCode}`;

const globalAnim = `
@keyframes modalPop {
  from { opacity:0; transform: scale(0.92); }
  to { opacity:1; transform: scale(1); }
}
`;

export default function LocationPage() {
  const history = useHistory();
  const [activeLoc, setActiveLoc] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [fullLocList, setFullLocList] = useState([...locationList]);

  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveLoc(parsed);
      } catch (e) {}
    }
    const customSaved = localStorage.getItem('weather_custom_locations');
    if (customSaved) {
      try {
        const customArr = JSON.parse(customSaved);
        setFullLocList(prev => [...prev, ...customArr]);
      } catch (e) {}
    }
  }, []);

  // 直接切换，无确认弹窗
  const switchLocation = (loc) => {
    setActiveLoc(loc);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    localStorage.removeItem(getCacheKey(loc.code));
    history.push('/');
  };

  const addCustomLocation = () => {
    if (!customName || !customLat || !customLon) return;
    const newCustom = {
      name: customName,
      lat: Number(customLat),
      lon: Number(customLon),
      code: `custom_${Date.now()}`
    };
    const savedCustom = localStorage.getItem('weather_custom_locations');
    let arr = [];
    if (savedCustom) arr = JSON.parse(savedCustom);
    arr.push(newCustom);
    localStorage.setItem('weather_custom_locations', JSON.stringify(arr));
    setFullLocList(prev => [...prev, newCustom]);
    setCustomName('');
    setCustomLat('');
    setCustomLon('');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalAnim }} />
      <div style={{ maxWidth: '680px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', margin: 0 }}>选择气象观测地点</h1>
          <button onClick={() => history.push('/')} style={{
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid var(--ifm-color-emphasis-200)',
            background: 'transparent',
            cursor: 'pointer'
          }}>← 返回首页</button>
        </div>
        {activeLoc && (
          <div style={{ padding: '12px 16px', background: 'rgba(66,133,244,0.08)', borderRadius: '14px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>✅ 当前生效地点：<strong>{activeLoc.name}</strong>（{activeLoc.lat}, {activeLoc.lon}）</p>
          </div>
        )}
        <div style={{ padding: '16px', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: '14px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 14px 0' }}>自定义新增观测点</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <input placeholder="地点名称" value={customName} onChange={e=>setCustomName(e.target.value)} style={{padding:'9px 12px',borderRadius:'10px',border:'1px solid var(--ifm-color-emphasis-200)',background:'var(--ifm-input-background)'}}/>
            <input placeholder="纬度 lat" value={customLat} onChange={e=>setCustomLat(e.target.value)} style={{padding:'9px 12px',borderRadius:'10px',border:'1px solid var(--ifm-color-emphasis-200)',background:'var(--ifm-input-background)'}}/>
            <input placeholder="经度 lon" value={customLon} onChange={e=>setCustomLon(e.target.value)} style={{padding:'9px 12px',borderRadius:'10px',border:'1px solid var(--ifm-color-emphasis-200)',background:'var(--ifm-input-background)'}}/>
          </div>
          <button onClick={addCustomLocation} style={{padding:'9px 16px',borderRadius:'10px',border:'none',background:'#0060fc',color:'#fff',cursor:'pointer'}}>添加此点位到列表</button>
        </div>
        <h3 style={{ fontSize: '16px', margin: '0 0 14px 0' }}>可选观测城市列表</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:'10px',maxHeight:'420px',overflowY:'auto',paddingRight:'6px'}}>
          {fullLocList.map(loc=>(
            <button key={loc.code} onClick={()=>switchLocation(loc)} style={{
              padding:'12px',borderRadius:'12px',textAlign:'left',cursor:'pointer',transition:'all 0.2s ease',
              border:activeLoc?.code===loc.code?'1px solid #0060fc':'1px solid var(--ifm-color-emphasis-200)',
              background:activeLoc?.code===loc.code?'rgba(66,133,244,0.08)':'transparent'
            }}
            onMouseEnter={(e)=>{if(activeLoc?.code!==loc.code){e.target.style.background='rgba(66,133,244,0.05)';e.target.style.borderColor='rgba(66,133,244,0.3)'}}}
            onMouseLeave={(e)=>{if(activeLoc?.code!==loc.code){e.target.style.background='transparent';e.target.style.borderColor='var(--ifm-color-emphasis-200)'}}}>
              <div style={{fontWeight:500,fontSize:'14px'}}>{loc.name}</div>
              <div style={{fontSize:'11px',opacity:0.7,marginTop:'3px'}}>{loc.lat}, {loc.lon}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}