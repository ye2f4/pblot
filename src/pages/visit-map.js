import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@theme/Layout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabase/supabaseClient';

// 瓦片源配置（多源兜底，优先国内可访问源）
const TILE_PROVIDERS = [
  {
    name: '高德地图',
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '&copy; 高德地图',
    maxZoom: 18,
  },
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    name: 'CartoDB',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    maxZoom: 19,
  },
];

// 修复 Leaflet 默认图标路径（webpack 打包后需要）
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const FETCH_TIMEOUT = 8000;

export default function VisitMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
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
  const tileProviderIndex = useRef(0);

  const fetchWithTimeout = useCallback(async (queryFn) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请检查网络连接')), FETCH_TIMEOUT)
    );
    return Promise.race([queryFn(), timeout]);
  }, []);

  const loadData = useCallback(async () => {
    try {
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

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  // 初始化地图（Leaflet 已通过 npm 打包，无需等待 CDN 加载）
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [30, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true
    });

    // 尝试加载瓦片源，失败则切换下一个
    const tryLoadTiles = (index) => {
      if (index >= TILE_PROVIDERS.length) {
        setError('所有地图瓦片源加载失败，请检查网络连接');
        return;
      }
      const provider = TILE_PROVIDERS[index];
      const tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        noWrap: false,
      });

      tileLayer.on('tileerror', () => {
        if (index === tileProviderIndex.current) {
          map.removeLayer(tileLayer);
          tileProviderIndex.current = index + 1;
          tryLoadTiles(index + 1);
        }
      });

      tileLayer.addTo(map);
      tileProviderIndex.current = index;
    };

    tryLoadTiles(0);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const resizeHandler = () => map.invalidateSize();
    window.addEventListener('resize', resizeHandler);

    // 初始加载后延迟 invalidateSize 确保容器尺寸正确
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 更新标记
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

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
    <Layout title="全球访问地图" description="Monoの小窝 - 全球访客分布地图">
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
        maxWidth: 1400, margin: '0 auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 60px)'
      }}>
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
            padding: '16px 20px', background: '#fff3cd', borderRadius: '10px',
            color: '#856404', border: '1px solid #ffc107', fontSize: 13,
          }}>
            <strong>⚠️ {error}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 11 }}>
              请在 Supabase SQL Editor 中运行项目根目录下的
              <code style={{ background: '#ffeeba', padding: '1px 4px', borderRadius: 3 }}>supabase/migrations/20260713_visitor_system.sql</code>
            </p>
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
    </Layout>
  );
}
