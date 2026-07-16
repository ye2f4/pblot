import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { supabase } from '../supabase/supabaseClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase/supabaseClient';
import { parseMiniSEED } from '../utils/miniseed';
import siteData from '../data/siteData.json';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FETCH_TIMEOUT = 10000;
const FN_BASE = `${SUPABASE_URL}/functions/v1/fdsn-proxy`;

const TILE_PROVIDERS = (siteData.tileProviders && siteData.tileProviders.length > 0)
  ? siteData.tileProviders
  : [
      { name: '高德地图', url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', subdomains: ['1', '2', '3', '4'], attribution: '&copy; 高德地图', maxZoom: 18, minZoom: 3 },
      { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap', maxZoom: 19, minZoom: 0 },
    ];

// 不同瓦片源支持的最小缩放不同（高德最低 ~z3，OSM 可到 z0）。
// 地图 minZoom 必须随当前瓦片源动态调整，否则在全局视图(低缩放)下对应源无瓦片可加载 → 地图空白。
const providerMinZoom = (p) => {
  if (typeof p.minZoom === 'number') return p.minZoom;
  if (p.name && p.name.includes('高德')) return 3;
  return 0;
};
const providerMaxZoom = (p) => p.maxZoom || 18;

const SOURCE_META = {
  raspberryshake: { label: 'Raspberry Shake 社区', color: '#e91e63', short: 'RS' },
  earthscope: { label: 'EarthScope / IRIS 机构台网', color: '#00897b', short: 'ES' },
};

const WINDOW_OPTIONS = [
  { min: 1, label: '近 1 分钟' },
  { min: 5, label: '近 5 分钟' },
  { min: 15, label: '近 15 分钟' },
  { min: 30, label: '近 30 分钟' },
  { min: 60, label: '近 1 小时' },
];

// 防止台站名称/代码中的特殊字符破坏弹窗 HTML
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

async function fdsnProxy(search) {
  const res = await fetch(`${FN_BASE}?${search}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  return res;
}

// 解析 FDSN station 文本（level=channel）：提取通道代码与采样率
function parseChannels(text) {
  const out = [];
  const seen = new Set();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const p = line.split('|').map((s) => s.trim());
    if (p.length < 15) continue;
    const channel = p[3];
    if (!channel || seen.has(channel)) continue;
    seen.add(channel);
    const sr = parseFloat(p[14]);
    out.push({ channel, sampleRate: Number.isFinite(sr) ? sr : null, location: p[2] || '*' });
  }
  return out;
}

function downsample(samples, max = 4000) {
  if (samples.length <= max) return samples;
  const stride = Math.ceil(samples.length / max);
  const out = [];
  for (let i = 0; i < samples.length; i += stride) out.push(samples[i]);
  return out;
}

// 基于真实采样点生成「智能报告」：峰值/RMS/均值/主频/数据质量等量化指标 + 中文叙述。
// 纯前端规则计算，无需外部 LLM，可后续升级为调用大模型生成自然语言摘要。
function analyzeWaveform(samples, sr, total) {
  if (!samples || samples.length === 0) return null;
  const n = samples.length;
  let sum = 0, sumSq = 0, peak = 0;
  for (const x of samples) {
    sum += x;
    const a = Math.abs(x);
    if (a > peak) peak = a;
    sumSq += x * x;
  }
  const mean = sum / n;
  const rms = Math.sqrt(sumSq / n);
  let zc = 0;
  for (let i = 1; i < n; i++) {
    if ((samples[i - 1] - mean) * (samples[i] - mean) < 0) zc++;
  }
  const duration = n / (sr || 1);
  const mainFreq = duration > 0 ? zc / (2 * duration) : 0;
  const completeness = total ? Math.min(100, Math.round((n / total) * 100)) : 100;
  let quality = '优';
  if (rms < 1e-6) quality = '无有效信号';
  else if (peak / (rms + 1e-9) > 12) quality = '中（疑似含突跳/尖脉冲）';
  else if (rms < peak * 0.12) quality = '良';
  else quality = '优';
  return {
    n, peak: Math.round(peak), rms: +rms.toFixed(2), mean: +mean.toFixed(2),
    mainFreq: +mainFreq.toFixed(2), duration: +duration.toFixed(1),
    completeness, quality,
  };
}

function MapCore() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const LRef = useRef(null);
  const boundsInitializedRef = useRef(false);
  const lastMarkersSigRef = useRef('');
  const [mapReady, setMapReady] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [activeProvider, setActiveProvider] = useState(0);

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, raspberryshake: 0, earthscope: 0 });
  const [selectedId, setSelectedId] = useState(null);

  // 波形相关
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [windowMin, setWindowMin] = useState(15);
  const [waveData, setWaveData] = useState([]);
  const [waveInfo, setWaveInfo] = useState(null);
  const [waveSamples, setWaveSamples] = useState([]);
  const [report, setReport] = useState(null);
  const [waveLoading, setWaveLoading] = useState(false);
  const [waveError, setWaveError] = useState('');

  // ---------- 加载台站列表 ----------
  const loadStations = useCallback(async () => {
    try {
      const { data, error: dbErr } = await supabase
        .from('community_stations')
        .select('*')
        .order('source', { ascending: true })
        .order('station', { ascending: true });
      if (dbErr) throw dbErr;
      const valid = (data || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
      setStations(valid);
      setStats({
        total: valid.length,
        raspberryshake: valid.filter((s) => s.source === 'raspberryshake').length,
        earthscope: valid.filter((s) => s.source === 'earthscope').length,
      });
      setError(null);
    } catch (e) {
      console.error('加载台站失败', e);
      if (e.message?.includes('relation') && e.message?.includes('does not exist')) {
        setError('数据库表 community_stations 尚未创建，请先执行迁移 SQL');
      } else {
        setError('数据加载失败: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
    const t = setInterval(loadStations, 60000);
    return () => clearInterval(t);
  }, [loadStations]);

  // 手动触发台站同步（fetch-shakenet 部署为 --no-verify-jwt 时可从前端调用）
  const syncStations = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/fetch-shakenet`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      await loadStations();
    } catch (e) {
      setError('同步失败: ' + e.message);
      setLoading(false);
    }
  }, [loadStations]);

  // ---------- 加载某台站通道 ----------
  const fetchChannels = useCallback(async (station) => {
    setChannels([]);
    setSelectedChannel('');
    setWaveData([]);
    setWaveInfo(null);
    setWaveSamples([]);
    setReport(null);
    setWaveError('');
    try {
      const res = await fdsnProxy(
        new URLSearchParams({
          source: station.source,
          service: 'station',
          level: 'channel',
          network: station.network,
          station: station.station,
        }).toString()
      );
      if (!res.ok) {
        setWaveError(`通道查询失败 (HTTP ${res.status})`);
        return;
      }
      const text = await res.text();
      const chs = parseChannels(text);
      setChannels(chs);
      const z = chs.find((c) => /Z/i.test(c.channel)) || chs[0];
      if (z) setSelectedChannel(z.channel);
    } catch (e) {
      setWaveError('通道查询异常: ' + e.message);
    }
  }, []);

  // ---------- 加载波形 ----------
  const fetchWaveform = useCallback(async (station, channel) => {
    if (!channel) return;
    setWaveLoading(true);
    setWaveError('');
    setWaveData([]);
    setWaveInfo(null);
    setWaveSamples([]);
    setReport(null);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - windowMin * 60 * 1000);
      const fmt = (d) => d.toISOString().replace('.000', '');
      const res = await fdsnProxy(
        new URLSearchParams({
          source: station.source,
          service: 'dataselect',
          network: station.network,
          station: station.station,
          channel,
          starttime: fmt(start),
          endtime: fmt(end),
        }).toString()
      );
      const buf = await res.arrayBuffer();
      if (!res.ok || buf.byteLength === 0) {
        setWaveError(`该时段(${windowMin}分钟)无波形数据，可尝试更长时段或稍后再试`);
        return;
      }
      const parsed = parseMiniSEED(buf);
      const samples = parsed.samples || [];
      const finite = samples.filter((s) => Number.isFinite(s));
      if (finite.length === 0) {
        setWaveError('波形解码后无有效采样点');
        return;
      }
      const sr = parsed.sampleRate || 1;
      const ds = downsample(finite);
      const data = ds.map((v, i) => ({
        t: (i * (samples.length / ds.length) / sr).toFixed(2),
        v: Number.isFinite(v) ? v : null,
      }));
      setWaveData(data);
      setWaveInfo({
        channel: parsed.channel || channel,
        station: parsed.station || station.station,
        network: parsed.network || station.network,
        sampleRate: sr,
        sampleCount: samples.length,
        startTime: parsed.startTime ? parsed.startTime.toISOString() : null,
        source: station.source,
      });
      setWaveSamples(finite);
      setReport(analyzeWaveform(finite, sr, samples.length));
    } catch (e) {
      setWaveError('波形解码失败: ' + e.message);
    } finally {
      setWaveLoading(false);
    }
  }, [windowMin]);

  // ---------- 选择台站 ----------
  const selectStation = useCallback((station) => {
    setSelectedId(station.id);
    if (mapInstanceRef.current && station.lat && station.lng) {
      mapInstanceRef.current.setView([station.lat, station.lng], 5);
    }
    fetchChannels(station);
  }, [fetchChannels]);

  // 通道选定 / 时段变化后自动拉波形
  useEffect(() => {
    if (!selectedId || !selectedChannel) return;
    const st = stations.find((s) => s.id === selectedId);
    if (st) fetchWaveform(st, selectedChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, windowMin]);

  // ---------- Leaflet 加载 ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (cancelled) return;
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

  // ---------- 初始化地图 ----------
  useEffect(() => {
    const L = LRef.current;
    if (!leafletReady || !mapRef.current || mapInstanceRef.current || !L) return;
    const map = L.map(mapRef.current, {
      center: [20, 0], zoom: 2,
      minZoom: providerMinZoom(TILE_PROVIDERS[0]),
      maxZoom: providerMaxZoom(TILE_PROVIDERS[0]),
      worldCopyJump: true, zoomControl: true, attributionControl: true,
    });
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);
    // 多次 invalidateSize 兜底：容器在首屏布局稳定前高度为 0 会导致瓦片加载不出来，
    // 在 300ms / rAF / window.load 三个时机各刷新一次，并在瓦片加载完成后再次修正。
    const fixSize = () => { try { map.invalidateSize(); } catch (e) {} };
    setTimeout(() => { switchProvider(0); fixSize(); }, 300);
    requestAnimationFrame(fixSize);
    window.addEventListener('load', fixSize);
    map.on('load', fixSize);
    const resizeHandler = () => map.invalidateSize();
    window.addEventListener('resize', resizeHandler);
    return () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('load', fixSize);
      map.off('load', fixSize);
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

  const switchProvider = useCallback((index) => {
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const provider = TILE_PROVIDERS[index];
    const minZ = providerMinZoom(provider);
    const maxZ = providerMaxZoom(provider);
    // 切换源时同步约束地图缩放范围，避免落到当前源不支持的层级（低层级无瓦片 → 空白）
    map.setMinZoom(minZ);
    map.setMaxZoom(maxZ);
    if (map.getZoom() < minZ) map.setZoom(minZ);
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution, minZoom: minZ, maxZoom: maxZ, noWrap: false,
      ...(provider.subdomains ? { subdomains: provider.subdomains } : {}),
    });
    // 瓦片大面积加载失败时，提示用户切换地图源（不阻塞其它功能）
    let errCount = 0, okCount = 0;
    tileLayer.on('tileerror', () => {
      errCount++;
      if (errCount > 6 && okCount < 2) setError('当前地图源在该缩放级别加载困难，请尝试右上角切换其它地图源');
    });
    tileLayer.on('tileload', () => { okCount++; if (okCount >= 2) setError(null); });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
    setActiveProvider(index);
    // 源切换后容器尺寸可能变化，强制重算一次
    setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 50);
  }, []);

  // ---------- 绘制标记 ----------
  useEffect(() => {
    const L = LRef.current;
    if (!mapInstanceRef.current || !markersLayerRef.current || !L) return;
    const sig = stations.map((s) => `${s.id}:${s.lat},${s.lng}`).join('|');
    if (sig === lastMarkersSigRef.current) return;
    lastMarkersSigRef.current = sig;
    markersLayerRef.current.clearLayers();
    if (stations.length === 0) return;
    const bounds = L.latLngBounds([]);
    stations.forEach((st) => {
      if (!st.lat || !st.lng) return;
      const latLng = [st.lat, st.lng];
      bounds.extend(latLng);
      const meta = SOURCE_META[st.source] || { color: '#888', short: '?' };
      const isSel = st.id === selectedId;
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:${isSel ? 18 : 13}px;height:${isSel ? 18 : 13}px;background:${meta.color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);${isSel ? 'animation: markerPulse 2s infinite;' : ''}"></div>`,
        iconSize: [isSel ? 18 : 13, isSel ? 18 : 13],
        iconAnchor: [isSel ? 9 : 6.5, isSel ? 9 : 6.5],
        popupAnchor: [0, -8],
      });
      const marker = L.marker(latLng, { icon }).addTo(markersLayerRef.current);
      const elevTxt = (st.elevation != null && Number.isFinite(st.elevation)) ? `${Math.round(st.elevation)} m` : '未知';
      const statusTxt = st.is_active === false ? '已停用' : '运行中';
      const coordTxt = `${Number(st.lat).toFixed(3)}, ${Number(st.lng).toFixed(3)}`;
      const popupHtml =
        `<div style="font-family:system-ui;min-width:200px;max-width:260px;font-size:13px;line-height:1.5;">` +
          `<div style="font-weight:700;font-size:14px;color:#1a1a1a;">${esc(st.station)} ` +
            `<span style="color:#999;font-weight:400;font-size:12px;">· ${esc(st.network)}</span></div>` +
          `<div style="color:#555;font-size:11px;margin:3px 0;">${esc(st.name) || '（未命名台站）'}</div>` +
          `<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0;font-size:11px;color:#444;">` +
            `<span>📡 来源：<b style="color:${meta.color}">${esc(meta.label)}</b></span>` +
            `<span>⛰️ 海拔：${elevTxt}</span>` +
            `<span>🟢 状态：${statusTxt}</span>` +
          `</div>` +
          `<div style="font-size:10px;color:#999;background:#f5f5f5;border-radius:6px;padding:4px 6px;word-break:break-all;">📍 ${coordTxt}</div>` +
          `<div style="color:#2196f3;font-size:12px;cursor:pointer;margin-top:8px;font-weight:600;" ` +
            `onclick="window.__selectStation && window.__selectStation('${esc(st.id)}')">📈 查看实时波形 →</div>` +
        `</div>`;
      marker.bindPopup(popupHtml, { maxWidth: 280 });
      marker.on('click', () => selectStation(st));
    });
    if (!boundsInitializedRef.current && stations.length > 0) {
      if (stations.length > 1) mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
      boundsInitializedRef.current = true;
    }
  }, [stations, selectedId, selectStation, leafletReady]);

  // 让地图 popup 内的“查看波形”按钮可调用
  useEffect(() => {
    window.__selectStation = (id) => {
      const st = stations.find((s) => s.id === id);
      if (st) selectStation(st);
    };
    return () => { delete window.__selectStation; };
  }, [stations, selectStation]);

  const resetView = useCallback(() => {
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!map || stations.length === 0) return;
    if (stations.length > 1) {
      const b = L.latLngBounds(stations.map((s) => [s.lat, s.lng]));
      map.fitBounds(b, { padding: [40, 40], maxZoom: 5 });
    } else {
      map.setView([stations[0].lat, stations[0].lng], 6);
    }
    boundsInitializedRef.current = true;
  }, [stations]);

  // ---------- 过滤后的列表 ----------
  const filtered = stations.filter((s) => {
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${s.station} ${s.network} ${s.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selectedStation = stations.find((s) => s.id === selectedId) || null;

  const statCard = (value, label, color) => (
    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', flex: 1, minWidth: '90px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999' }}>{label}</div>
    </div>
  );

  // ===== 渲染 =====
  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes markerPulse {
          0% { box-shadow: 0 0 0 0 rgba(233,30,99,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(233,30,99,0); }
          100% { box-shadow: 0 0 0 0 rgba(233,30,99,0); }
        }
        .custom-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; padding: 4px !important; }
        .sn-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
      `}</style>

      {/* 标题 + 统计 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
          🌐 共享地震台网
          <span style={{ fontSize: 12, fontWeight: 400, color: '#888', marginLeft: 10 }}>
            消费全球爱好者与机构公开共享的地震监测设备
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statCard(stats.total, '台站总数', '#4285f4')}
          {statCard(stats.raspberryshake, 'Raspberry Shake', '#e91e63')}
          {statCard(stats.earthscope, 'EarthScope', '#00897b')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: '#fff3cd', borderRadius: '10px', color: '#856404', border: '1px solid #ffc107', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 过滤栏 */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { v: 'all', l: '全部' },
            { v: 'raspberryshake', l: 'Raspberry Shake 社区' },
            { v: 'earthscope', l: 'EarthScope 机构' },
          ].map((o) => (
            <button key={o.v} onClick={() => setSourceFilter(o.v)} style={{
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: 13,
              border: '1px solid #ddd', background: sourceFilter === o.v ? '#2E7D9E' : '#fff',
              color: sourceFilter === o.v ? '#fff' : '#555', fontWeight: sourceFilter === o.v ? 600 : 400,
            }}>{o.l}</button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索台站 / 网络代码…"
          style={{ flex: 1, minWidth: 160, padding: '7px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: 13 }}
        />
        <button onClick={loadStations} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' }}>🔄 刷新</button>
        <button onClick={syncStations} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #2E7D9E', background: '#2E7D9E', cursor: 'pointer', fontSize: 13, color: '#fff' }}>⚡ 同步台站</button>
      </div>

      {/* 地图 + 列表 */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div className="sn-card" style={{ flex: '2 1 520px', minHeight: 440, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 440 }} />
          {mapReady && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 4 }}>
              {TILE_PROVIDERS.map((p, i) => (
                <button key={p.name} onClick={() => switchProvider(i)} title={`切换到${p.name}`} style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #ccc',
                  background: activeProvider === i ? '#4285f4' : 'rgba(255,255,255,0.9)',
                  color: activeProvider === i ? '#fff' : '#555', cursor: 'pointer', fontSize: 11,
                }}>{p.name}</button>
              ))}
            </div>
          )}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14, background: 'rgba(240,244,248,0.6)' }}>
              ⏳ 正在加载共享台站…
            </div>
          )}
        </div>

        <div className="sn-card" style={{ flex: '1 1 300px', minWidth: 280, maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontSize: 13, fontWeight: 600, color: '#333' }}>
            台站列表 ({filtered.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {filtered.length === 0 && !loading && (
              <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>暂无台站数据，点击「同步台站」尝试拉取</div>
            )}
            {filtered.map((s) => {
              const meta = SOURCE_META[s.source] || { color: '#888', short: '?' };
              const sel = s.id === selectedId;
              return (
                <div key={s.id} onClick={() => selectStation(s)} style={{
                  padding: '9px 12px', borderRadius: 10, margin: '4px 2px', cursor: 'pointer',
                  background: sel ? '#e3f2fd' : '#fafafa', border: sel ? '1px solid #90caf9' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>{s.station}</span>
                    <span style={{ fontSize: 11, color: '#999' }}>{s.network}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#fff', background: meta.color, borderRadius: 4, padding: '1px 5px' }}>{meta.short}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '（无名称）'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{s.lat?.toFixed(2)}, {s.lng?.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 波形可视化 */}
      {selectedStation && (
        <div className="sn-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>
                📈 {selectedStation.station} 实时波形
              </h3>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {selectedStation.network} · {selectedStation.name || '共享设备'} · {(SOURCE_META[selectedStation.source] || {}).label || ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#666' }}>
                通道：
                <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 8, border: '1px solid #ddd' }}>
                  {channels.length === 0 && <option value={selectedChannel}>{selectedChannel || '加载中…'}</option>}
                  {channels.map((c) => (
                    <option key={c.channel} value={c.channel}>
                      {c.channel}{c.sampleRate ? ` (${c.sampleRate}Hz)` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: '#666' }}>
                时段：
                <select value={windowMin} onChange={(e) => setWindowMin(Number(e.target.value))} style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 8, border: '1px solid #ddd' }}>
                  {WINDOW_OPTIONS.map((o) => <option key={o.min} value={o.min}>{o.label}</option>)}
                </select>
              </label>
              <button onClick={() => fetchWaveform(selectedStation, selectedChannel)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #2E7D9E', background: '#2E7D9E', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
                🔄 重新拉取
              </button>
            </div>
          </div>

          {waveError && (
            <div style={{ padding: '10px 14px', background: '#fdecea', borderRadius: 10, color: '#b71c1c', fontSize: 13, border: '1px solid #ef9a9a' }}>
              {waveError}
            </div>
          )}

          {waveLoading && (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
              ⏳ 正在从 FDSN 拉取并解码 miniSEED 波形…
            </div>
          )}

          {!waveLoading && waveData.length > 0 && (
            <>
              {waveInfo && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                  <span>通道：<b>{waveInfo.channel}</b></span>
                  <span>采样率：<b>{waveInfo.sampleRate} Hz</b></span>
                  <span>采样点：<b>{waveInfo.sampleCount.toLocaleString()}</b></span>
                  <span>起始：<b>{waveInfo.startTime ? new Date(waveInfo.startTime).toLocaleString('zh-CN') : '—'}</b></span>
                </div>
              )}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={waveData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#999' }} label={{ value: '秒', position: 'insideBottomRight', fontSize: 10, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#999' }} width={48} />
                  <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'counts']} labelFormatter={(l) => `t=${l}s`} />
                  <Line type="monotone" dataKey="v" stroke="#e91e63" dot={false} strokeWidth={1} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* AI 智能分析报告 */}
              {report && waveInfo && (
                <div style={{
                  background: 'linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%)',
                  border: '1px solid #d6e4f5', borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>🤖</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>AI 智能分析报告</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, color: '#fff', fontWeight: 600, padding: '2px 10px',
                      borderRadius: 20, background: report.quality.startsWith('优') ? '#34a853'
                        : report.quality.startsWith('良') ? '#4285f4'
                          : report.quality.startsWith('中') ? '#fbbc05' : '#9ca3af',
                    }}>数据质量：{report.quality}</span>
                  </div>

                  {/* 量化指标 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
                    {[
                      { l: '峰值振幅', v: report.peak.toLocaleString(), u: 'counts', c: '#e91e63' },
                      { l: '有效值 RMS', v: report.rms.toLocaleString(), u: 'counts', c: '#4285f4' },
                      { l: '直流均值', v: report.mean.toLocaleString(), u: 'counts', c: '#00897b' },
                      { l: '估算主频', v: report.mainFreq, u: 'Hz', c: '#7c3aed' },
                      { l: '有效时长', v: report.duration, u: '秒', c: '#f59e0b' },
                      { l: '数据完整度', v: report.completeness, u: '%', c: '#34a853' },
                    ].map((m) => (
                      <div key={m.l} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #eef' }}>
                        <div style={{ fontSize: 10, color: '#999' }}>{m.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: m.c }}>
                          {m.v}<span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 3 }}>{m.u}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 自然语言叙述 */}
                  <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.7, background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #eef' }}>
                    {(() => {
                      const s = selectedStation;
                      const meta = SOURCE_META[waveInfo.source] || {};
                      const ratio = report.peak / (report.rms || 1);
                      const activity = ratio > 12 ? '存在明显尖脉冲或突跳，可能为局部扰动、人为噪声或事件信号'
                        : ratio > 6 ? '波动较为活跃，背景噪声之上可见一定起伏'
                          : '整体平稳，以背景微动噪声为主，未见显著事件';
                      const freqDesc = report.mainFreq >= 5 ? '偏高频（数 Hz 以上），常见于近场人为/环境噪声'
                        : report.mainFreq >= 1 ? '中频段，介于人为噪声与区域地脉动之间'
                          : '偏低频（<1 Hz），与海洋地脉动/远场信号特征接近';
                      const compDesc = report.completeness >= 95 ? '数据连续性良好'
                        : report.completeness >= 70 ? '存在少量缺帧，但不影响整体判读'
                          : '缺帧较多，建议更换时段或稍后重试';
                      return (
                        <>
                          台站 <b>{waveInfo.network}.{waveInfo.station}</b>（{meta.label || '共享设备'}
                          {s && s.name ? `，${s.name}` : ''}）通道 <b>{waveInfo.channel}</b> 在
                          <b>近 {windowMin} 分钟</b>、采样率 <b>{waveInfo.sampleRate} Hz</b> 下共采集
                          <b> {report.n.toLocaleString()} </b>个有效点。本段信号{activity}；
                          过零率估算主频约 <b>{report.mainFreq} Hz</b>，{freqDesc}。
                          峰值/RMS 比约 <b>{ratio.toFixed(1)}</b>，{compDesc}。
                          综合判定数据质量为「<b>{report.quality}</b>」。
                          <div style={{ marginTop: 6, color: '#999', fontSize: 11 }}>
                            ⓘ 报告由前端基于真实采样点自动计算生成，仅供快速研判参考，非专业地震定级结论。
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          {!waveLoading && waveData.length === 0 && !waveError && (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>
              选择通道与时段后自动加载波形
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShakeNetwork() {
  return (
    <Layout title="共享地震台网" description="消费全球爱好者与机构公开共享的地震监测设备">
      <BrowserOnly fallback={
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>加载中…</div>
      }>
        {() => <MapCore />}
      </BrowserOnly>
    </Layout>
  );
}
