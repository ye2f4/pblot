import React, { useState, useEffect } from 'react';
import { useWarnings } from '../../theme/WarningsProvider';
import { WARNING_LEVELS, WARNING_TYPES, LEVEL_ORDER, levelColor, typeMeta } from '../../config/warningTypes';

const DISMISS_KEY = 'dismissed_warnings';
const GEO_KEY = 'user_geo';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}
function markDismissed(ids) {
  const set = new Set(getDismissed());
  ids.forEach((id) => set.add(id));
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}
function getStoredGeo() {
  try { return JSON.parse(localStorage.getItem(GEO_KEY) || 'null'); } catch { return null; }
}

// 两点直线距离（Haversine，单位 km）
function haversine(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtCountdown(ms) {
  if (ms <= 0) return '已来临 / 进行中';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

const FLASH_CSS = `
@keyframes warnFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.warn-flash { animation: warnFlash 0.85s infinite; }
`;

// 全站全屏预警弹窗：有生效预警且用户未关闭时，所有页面顶部覆盖展示。
export default function WarningModal() {
  const { warnings } = useWarnings();
  const [dismissed, setDismissed] = useState(getDismissed());
  const [now, setNow] = useState(() => Date.now());
  const [userGeo, setUserGeo] = useState(getStoredGeo());

  useEffect(() => { setDismissed(getDismissed()); }, [warnings]);

  // 每秒刷新，用于核打击倒计时
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 获取用户位置（推断爆心距离）。拒绝定位则仅显示爆心坐标。
  useEffect(() => {
    if (userGeo || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try { localStorage.setItem(GEO_KEY, JSON.stringify(g)); } catch { /* ignore */ }
        setUserGeo(g);
      },
      () => { /* 用户拒绝或不可用：不计算距离 */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [userGeo]);

  const active = (warnings || []).filter((w) => !dismissed.includes(w.id));
  if (active.length === 0) return null;

  const sorted = [...active].sort(
    (a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9),
  );

  // 判断是否国内：经纬度落在中国范围(18–54°N / 73–135°E)，或区域/标题含国内关键词
  const isDomestic = (w) => {
    const lat = Number(w.lat);
    const lng = Number(w.lng);
    const inChina = !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
    const text = `${w.region || ''} ${w.title || ''} ${w.message || ''}`;
    const cnKeyword = /中国|大陆|台湾|新疆|西藏|四川|云南|青海|甘肃|内蒙古|黑龙江|吉林|辽宁|河北|山西|陕西|河南|山东|湖北|湖南|江苏|安徽|浙江|福建|广东|广西|海南|北京|上海|天津|重庆|香港|澳门|境内|本省|本市/.test(text);
    return inChina || cnKeyword;
  };
  const isEq = (w) => (w.type || '') === 'earthquake';

  // 国内地震 + 非地震类预警 → 全屏；国外地震 → 右下角小卡片
  const fullscreen = sorted.filter((w) => !isEq(w) || isDomestic(w));
  const minor = sorted.filter((w) => isEq(w) && !isDomestic(w));

  function closeAll() {
    markDismissed(active.map((w) => w.id));
    setDismissed(getDismissed());
  }

  function closeOne(id) {
    markDismissed([id]);
    setDismissed(getDismissed());
  }

  const renderCard = (w, compact) => {
    const color = levelColor(w.level);
    const meta = typeMeta(w.type);
    const isCritical = !!meta.critical;
    const sub = meta.subtypes && w.subtype ? meta.subtypes[w.subtype] : null;
    const hasEpi = w.lat !== null && w.lat !== undefined && w.lng !== null && w.lng !== undefined;
    const dist = hasEpi ? haversine(userGeo?.lat, userGeo?.lng, Number(w.lat), Number(w.lng)) : null;
    const countdownMs = w.impact_at ? new Date(w.impact_at).getTime() - now : null;
    const shelterTips = w.shelter
      ? String(w.shelter).split('\n').map((s) => s.trim()).filter(Boolean)
      : (meta.shelterTips || []);
    return (
      <div key={w.id} style={{ borderTop: `6px solid ${color}`, padding: compact ? '14px 16px' : '20px 22px', ...(isCritical ? { background: '#fff4f4' } : {}) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: isCritical ? (compact ? 28 : 46) : (compact ? 18 : 26), lineHeight: 1 }}>{meta.icon}</span>
          <div>
            <div
              className={isCritical ? 'warn-flash' : undefined}
              style={{ fontWeight: 800, fontSize: isCritical ? (compact ? 15 : 20) : (compact ? 13 : 17), color: isCritical ? '#d32f2f' : color }}
            >
              {isCritical ? '⚠ 核打击警报 ⚠' : `${meta.label}${sub ? ' · ' + sub.label : ''}`}
            </div>
            {w.region && <div style={{ fontSize: 13, color: '#666' }}>影响区域：{w.region}</div>}
          </div>
        </div>

        {sub && (
          <div style={{ fontSize: 13, color: '#b26a00', background: '#fff7e6', border: '1px solid #ffe0a3', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
            {sub.icon} {sub.label}：{sub.desc}
          </div>
        )}

        {isCritical && hasEpi && (
          <div style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>
            🎯 预计空袭位置（爆心）：{Number(w.lat).toFixed(3)}, {Number(w.lng).toFixed(3)}
            {dist != null
              ? `　｜　距你约 ${dist < 1 ? Math.round(dist * 1000) + ' m' : dist.toFixed(0) + ' km'}`
              : '　｜　（未授权定位，无法计算距离）'}
          </div>
        )}

        {isCritical && countdownMs != null && (
          <div className="warn-flash" style={{ fontSize: 18, fontWeight: 800, color: '#d32f2f', margin: '6px 0' }}>
            ⏱ 预计空袭来临倒计时：{fmtCountdown(countdownMs)}
          </div>
        )}

        {w.title && <div style={{ fontSize: 16, fontWeight: 700, margin: '6px 0' }}>{w.title}</div>}
        {w.message && (
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.message}</div>
        )}

        {shelterTips.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#1a1a1a' }}>
            <div style={{ fontWeight: 700, color: '#c62828', marginBottom: 4 }}>🛡 避险建议：</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              {shelterTips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          来源：{w.source || '管理员'} ｜ 发布：{new Date(w.published_at).toLocaleString()}
          {w.is_auto ? ' ｜ 自动' : ''}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{FLASH_CSS}</style>

      {fullscreen.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}>
          <div style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {fullscreen.map((w) => renderCard(w, false))}
            <div style={{ padding: '14px 22px 20px', textAlign: 'right' }}>
              <button
                onClick={closeAll}
                style={{ padding: '10px 22px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}
              >
                我已知晓，关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {minor.map((w) => (
        <div key={'minor-' + w.id} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 99998, width: 340, maxWidth: '90vw', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          {renderCard(w, true)}
          <div style={{ padding: '8px 12px', textAlign: 'right', borderTop: '1px solid #eee' }}>
            <button onClick={() => closeOne(w.id)} style={{ padding: '6px 14px', background: '#888', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>知道了</button>
          </div>
        </div>
      ))}
    </>
  );
}
