import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { supabase } from '../supabase/supabaseClient';
import siteData from '../data/siteData.json';

const FETCH_TIMEOUT = 8000;

// 瓦片源配置（优先使用 siteData，兜底硬编码）
const TILE_PROVIDERS = (siteData.tileProviders && siteData.tileProviders.length > 0) ? siteData.tileProviders : [
  { name: '高德地图', url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', subdomains: ['1', '2', '3', '4'], attribution: '&copy; 高德地图', maxZoom: 18 },
  { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 },
  { name: 'CartoDB', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://carto.com/">CartoDB</a>', maxZoom: 19 },
];

// 获取访客位置（优先浏览器GPS，兜底 IP 服务）
const fetchLocation = async () => {
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 300000 });
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'gps' };
    } catch (e) { /* GPS 失败，降级 */ }
  }
  try {
    const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error('IP lookup failed');
    const data = await resp.json();
    return { latitude: data.latitude, longitude: data.longitude, city: data.city, country: data.country_name, country_code: data.country_code, region: data.region, timezone: data.timezone, ip_address: data.ip, isp: data.org, source: 'ip' };
  } catch (e) { return null; }
};

function MapCore() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLoadCount = useRef(0);
  const tileErrorCount = useRef(0);
  const LRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    uniqueCountries: 0,
    uniqueCities: 0,
    mobilePercent: 0,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProvider, setActiveProvider] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const fetchWithTimeout = useCallback(async (queryFn) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请检查网络连接')), FETCH_TIMEOUT)
    );
    return Promise.race([queryFn(), timeout]);
  }, []);

  const loadData = useCallback(async () => {
    try {
      // 确保有 visitor_session，没有则自动生成
      let sessionId = localStorage.getItem('visitor_session');
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('visitor_session', sessionId);
      }
      // 使用 localStorage 控制上报频率，每 5 分钟允许上报一次
      const lastReport = localStorage.getItem('map_last_report_time');
      const canReport = !lastReport || (Date.now() - parseInt(lastReport, 10)) > 300000;
      if (canReport) {
        localStorage.setItem('map_last_report_time', Date.now().toString());
        try {
          const loc = await fetchLocation();
          if (loc) {
            const ua = navigator.userAgent;
            const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
            let browser = 'Unknown';
            if (ua.includes('Edg/')) browser = 'Edge';
            else if (ua.includes('Chrome/')) browser = 'Chrome';
            else if (ua.includes('Firefox/')) browser = 'Firefox';
            else if (ua.includes('Safari/')) browser = 'Safari';
            let os = 'Unknown';
            if (ua.includes('Windows')) os = 'Windows';
            else if (ua.includes('Mac OS')) os = 'macOS';
            else if (ua.includes('Linux')) os = 'Linux';
            else if (ua.includes('Android')) os = 'Android';
            else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

            const payload = {
              session_id: sessionId, latitude: loc.latitude, longitude: loc.longitude,
              city: loc.city || null, country: loc.country || null,
              country_code: loc.country_code || null, region: loc.region || null,
              timezone: loc.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              ip_address: loc.ip_address || null, isp: loc.isp || null,
              is_mobile: isMobile, browser, os,
              last_active: new Date().toISOString()
            };
            const { data: existing } = await supabase
              .from('visitor_locations').select('id, visit_count').eq('session_id', sessionId).maybeSingle();
            if (existing) {
              await supabase.from('visitor_locations')
                .update({ ...payload, visit_count: (existing.visit_count || 0) + 1 }).eq('id', existing.id);
            } else {
              await supabase.from('visitor_locations').insert([{ ...payload, visit_count: 1 }]);
            }
          }
        } catch (e) { /* 静默忽略上报失败 */ }
      }

      const { data, error: dbErr } = await fetchWithTimeout(() =>
        supabase
          .from('visitor_locations')
          .select('*')
          .order('last_active', { ascending: false })
          .limit(500)
      );

      if (dbErr) throw dbErr;

      const validLocations = (data || []).filter(l => l.latitude && l.longitude);
      setLocations(validLocations);

      const countries = new Set(validLocations.map(l => l.country).filter(Boolean));
      const cities = new Set(validLocations.map(l => l.city).filter(Boolean));
      const mobileCount = validLocations.filter(l => l.is_mobile).length;

      setStats({
        totalVisitors: validLocations.length,
        uniqueCountries: countries.size,
        uniqueCities: cities.size,
        mobilePercent: validLocations.length > 0 ? Math.round((mobileCount / validLocations.length) * 100) : 0,
        lastUpdate: new Date().toLocaleTimeString('zh-CN')
      });

      setError(null);
    } catch (e) {
      console.error('加载访客位置失败', e);
      if (e.message?.includes('relation') && e.message?.includes('does not exist')) {
        setError('数据库表未创建，请在 Supabase 控制台运行迁移 SQL');
      } else if (e.message?.includes('PGRST')) {
        setError('数据库访问受限，请检查 Supabase RLS 策略');
      } else {
        setError('数据加载失败: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout]);

  // 数据加载
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  // 切换瓦片源
  const switchProvider = useCallback((index) => {
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[index];
    tileLoadCount.current = 0;
    tileErrorCount.current = 0;

    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      noWrap: false,
      ...(provider.subdomains ? { subdomains: provider.subdomains } : {}),
    });

    // 统计瓦片加载成功/失败
    tileLayer.on('tileload', () => {
      tileLoadCount.current++;
    });
    tileLayer.on('tileerror', () => {
      tileErrorCount.current++;
      // 如果错误数超过加载数的 3 倍且已加载不足 5 块，提示切换
      if (tileErrorCount.current > 8 && tileLoadCount.current < 3 && tileErrorCount.current > tileLoadCount.current * 3) {
        setError('当前地图源加载困难，请尝试切换到其他地图源');
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
    setActiveProvider(index);
    setError(null);
  }, []);

  // Leaflet 加载就绪状态（避免 ref 作为依赖）
  const [leafletReady, setLeafletReady] = useState(false);

  // 加载 Leaflet（仅在浏览器端）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (cancelled) return;

        // 修复 Leaflet 默认图标路径
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
          iconUrl: require('leaflet/dist/images/marker-icon.png'),
          shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
        });

        LRef.current = L;
        setLeafletReady(true);
      } catch (e) {
        console.error('加载 Leaflet 失败:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 初始化地图（依赖 leafletReady 状态触发）
  useEffect(() => {
    const L = LRef.current;
    if (!leafletReady || !mapRef.current || mapInstanceRef.current || !L) return;

    const map = L.map(mapRef.current, {
      center: [30, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // 延迟加载瓦片，确保容器已渲染
    setTimeout(() => {
      switchProvider(0);
      map.invalidateSize();
    }, 300);

    const resizeHandler = () => map.invalidateSize();
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady]);

  // 更新标记
  useEffect(() => {
    const L = LRef.current;
    if (!mapInstanceRef.current || !markersLayerRef.current || !L) return;

    markersLayerRef.current.clearLayers();

    if (locations.length === 0) return;

    const bounds = L.latLngBounds([]);

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const latLng = [loc.latitude, loc.longitude];
      bounds.extend(latLng);

      const isActive = new Date(loc.last_active).getTime() > Date.now() - 1800000;
      const markerColor = isActive ? '#4285f4' : '#9ca3af';

      const icon = L.divIcon({
        className: `custom-marker ${isActive ? 'map-marker-pulse' : ''}`,
        html: `<div style="
          width:14px;height:14px;
          background:${markerColor};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.3);
          ${isActive ? 'animation: markerPulse 2s infinite;' : ''}
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10]
      });

      const marker = L.marker(latLng, { icon }).addTo(markersLayerRef.current);

      const timeAgo = getTimeAgo(new Date(loc.last_active));
      const deviceIcon = loc.is_mobile ? '📱' : '💻';
      const countryFlag = loc.country_code
        ? String.fromCodePoint(...loc.country_code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
        : '🌍';

      const popupContent = `
        <div style="font-family:system-ui;min-width:180px;font-size:13px;">
          <div style="font-size:15px;margin-bottom:4px;">
            ${countryFlag} ${loc.city || ''} ${loc.country || '未知'}
          </div>
          <div style="color:#666;font-size:11px;">
            ${loc.region ? loc.region + ' · ' : ''}${deviceIcon} ${loc.browser || ''} / ${loc.os || ''}
          </div>
          <div style="color:#999;font-size:10px;margin-top:2px;">
            最近活跃: ${timeAgo} · 访问${loc.visit_count || 1}次
          </div>
          ${loc.isp ? `<div style="color:#aaa;font-size:10px;">ISP: ${loc.isp}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });
    });

    if (locations.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    } else if (locations.length === 1) {
      mapInstanceRef.current.setView([locations[0].latitude, locations[0].longitude], 6);
    }
  }, [locations]);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return '刚刚';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const statCardStyle = {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    minWidth: '100px',
    flex: 1,
  };

  return (
    <div style={{
      maxWidth: 1400, margin: '0 auto', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 60px)'
    }}>
      <style>{`
        @keyframes markerPulse {
          0% { box-shadow: 0 0 0 0 rgba(66,133,244,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(66,133,244,0); }
          100% { box-shadow: 0 0 0 0 rgba(66,133,244,0); }
        }
        .custom-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; padding: 4px !important; }
        .leaflet-popup-content { margin: 8px 12px !important; }
      `}</style>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
          🌍 全球访问地图
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#4285f4' }}>{stats.totalVisitors}</div>
            <div style={{ fontSize: 11, color: '#999' }}>访客位置</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34a853' }}>{stats.uniqueCountries}</div>
            <div style={{ fontSize: 11, color: '#999' }}>国家/地区</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbc05' }}>{stats.uniqueCities}</div>
            <div style={{ fontSize: 11, color: '#999' }}>城市</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ea4335' }}>{stats.mobilePercent}%</div>
            <div style={{ fontSize: 11, color: '#999' }}>移动端</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={loadData} style={{
            padding: '6px 14px', border: '1px solid #ddd', borderRadius: '8px',
            background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555',
          }}>
            🔄 刷新
          </button>
          {stats.lastUpdate && (
            <span style={{ fontSize: 11, color: '#999' }}>更新于 {stats.lastUpdate}</span>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px', background: '#fff3cd', borderRadius: '10px',
          color: '#856404', border: '1px solid #ffc107', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span><strong>⚠️ {error}</strong></span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TILE_PROVIDERS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => switchProvider(i)}
                style={{
                  padding: '4px 12px', border: '1px solid #856404', borderRadius: '6px',
                  background: activeProvider === i ? '#856404' : 'transparent',
                  color: activeProvider === i ? '#fff' : '#856404',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && !error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '50px', color: '#999', fontSize: 14, gap: '8px'
        }}>
          <span>⏳</span> 正在加载访客数据...
        </div>
      )}

      <div style={{
        flex: 1, minHeight: 400, borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb',
        background: '#f0f4f8',
        position: 'relative'
      }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 地图瓦片源切换按钮 */}
        {mapReady && (
          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1000,
            display: 'flex', gap: 4,
          }}>
            {TILE_PROVIDERS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => switchProvider(i)}
                title={`切换到${p.name}`}
                style={{
                  padding: '4px 10px', border: '1px solid #ccc', borderRadius: '6px',
                  background: activeProvider === i ? '#4285f4' : 'rgba(255,255,255,0.9)',
                  color: activeProvider === i ? '#fff' : '#555',
                  cursor: 'pointer', fontSize: 11, fontWeight: activeProvider === i ? 600 : 400,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {locations.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
            background: 'rgba(255,255,255,0.95)', borderRadius: '10px',
            padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 11, color: '#555', display: 'flex', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4285f4', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
              <span>活跃(30分钟内)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
              <span>历史访客</span>
            </div>
          </div>
        )}

        {!loading && locations.length === 0 && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'rgba(255,255,255,0.95)', borderRadius: '12px',
            padding: '12px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            fontSize: 14, color: '#666',
          }}>
            📍 暂无访客位置数据，等待第一位访客到来...
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisitMap() {
  return (
    <Layout title="全球访问地图" description="Monoの小窝 - 全球访客分布地图">
      <BrowserOnly fallback={
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          地图加载中...
        </div>
      }>
        {() => <MapCore />}
      </BrowserOnly>
    </Layout>
  );
}
