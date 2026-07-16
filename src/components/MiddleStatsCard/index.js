import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import siteData from '../../data/siteData.json';
import articlesData from '../../data/articles.json';
import styles from '../../pages/index.module.css';

const statColors = (siteData.statColors && siteData.statColors.length > 0) ? siteData.statColors : [
  { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', shadow: 'rgba(59, 130, 246, 0.25)' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(124, 58, 237, 0.25)' },
  { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
  { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', shadow: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', shadow: 'rgba(236, 72, 153, 0.25)' }
];

const getUserName = (user = null, nickName = '') => {
  if (nickName && nickName.trim()) return nickName.trim();
  if (!user || !user.user_metadata) return "用户";
  return (
    user.user_metadata.full_name ||
    user.user_metadata.preferred_username ||
    user.raw_user_meta_data?.name ||
    user.email ||
    "用户"
  );
};

// 获取浏览器和设备信息
const getDeviceInfo = () => {
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

  return { isMobile, browser, os, userAgent: ua };
};

// ============ IP 地理信息查询（多源兜底，保证国家/城市/IP 不为「未知」）============
const fetchIpInfo = async () => {
  const providers = [
    {
      url: 'https://ipapi.co/json/',
      map: (d) => ({
        latitude: d.latitude, longitude: d.longitude,
        city: d.city, country: d.country_name, country_code: d.country_code,
        region: d.region, timezone: d.timezone, ip_address: d.ip, isp: d.org,
      }),
    },
    {
      url: 'https://ipwho.is/',
      map: (d) => (d && d.success !== false ? {
        latitude: d.latitude, longitude: d.longitude,
        city: d.city, country: d.country, country_code: d.country_code,
        region: d.region, timezone: d.timezone?.id || d.timezone,
        ip_address: d.ip, isp: d.connection?.isp || d.connection?.org,
      } : null),
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      map: (d) => ({
        latitude: parseFloat(d.latitude), longitude: parseFloat(d.longitude),
        city: d.city, country: d.country, country_code: d.country_code,
        region: d.region, timezone: d.timezone, ip_address: d.ip, isp: d.organization_name,
      }),
    },
  ];

  for (const p of providers) {
    try {
      const resp = await fetch(p.url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const info = p.map(data);
      if (info && (info.ip_address || info.country || info.city)) return info;
    } catch (e) { /* 尝试下一个源 */ }
  }
  return null;
};

// 获取访客位置：始终先查 IP 信息（拿到国家/城市/IP/ISP），
// 若浏览器 GPS 可用则用更精确的 GPS 坐标覆盖经纬度。
// 注意：必须先拿 IP 地理信息，否则 GPS 成功时只会写入坐标而丢失国家/城市，
// 导致地图的「国家/地区」「城市」统计始终为 0。
const fetchLocation = async () => {
  const ipInfo = await fetchIpInfo();
  const base = ipInfo || {};

  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 300000 });
      });
      return {
        ...base,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: ipInfo ? 'gps+ip' : 'gps',
      };
    } catch (e) { /* GPS 失败，用 IP 结果 */ }
  }

  if (ipInfo && (ipInfo.latitude || ipInfo.longitude)) {
    return { ...ipInfo, source: 'ip' };
  }
  return null;
};

export default function MiddleStatsCard({
  siteData = {},
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  timeEpoch = Math.floor(Date.now() / 1000),
  locationName = "北京",
  currentNickname = "",
  currentAvatar = "",
  user = null,
  timeZoneOffset = 0,
  timeZone = ""
}) {
  const [visitStats, setVisitStats] = useState({
    online: 0,
    today: 0,
    yesterday: 0,
    total: 0,
    uv: 0
  });
  // 帖子统计（今/昨/总）——直接来自构建时生成的文章数据（博客 + 文档），创建文章后重新构建即自动更新
  const [postStats, setPostStats] = useState({
    todayPosts: articlesData?.todayCount ?? 0,
    yesterdayPosts: articlesData?.yesterdayCount ?? 0,
    totalPosts: articlesData?.total ?? 0
  });
  const [sysHealth, setSysHealth] = useState({
    apiHealth: true,
    dbHealth: true,
    cacheHealth: true,
    dbLatency: 0,
    cacheLatency: 0,
    totalLatency: 0
  });
  const [hourData, setHourData] = useState(Array(24).fill(0));
  const sessionReported = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const openCalendar = () => window.open('/calendar', '_blank');
  const padZero = (num) => String(num).padStart(2, '0');

  // 基于文章发布日期 + 浏览器本地时区，实时统计今/昨/总帖子数。
  // 替代构建时写死的 todayCount/yesterdayCount：构建产物是静态快照，不会随本地日期滚动，
  // 且构建服务器时区（Vercel 上为 UTC）与用户本地"今天"可能差一天。
  const computePostStats = () => {
    const list = articlesData?.articles || [];
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = fmt(new Date());
    const yesterdayStr = fmt(new Date(Date.now() - 86400000));
    return {
      todayPosts: list.filter((a) => a.date && a.date.slice(0, 10) === todayStr).length,
      yesterdayPosts: list.filter((a) => a.date && a.date.slice(0, 10) === yesterdayStr).length,
      totalPosts: articlesData?.total ?? list.length,
    };
  };

  // ---- 时钟逻辑 ----
  const [baseTs, setBaseTs] = useState(timeEpoch);
  const [display, setDisplay] = useState({
    time: '00:00:00',
    weekJp: '水',
    weekEn: 'Wednesday',
    weekNum: 1,
    year: 2026,
    month: 1,
    day: 1,
    second: 0
  });
  const weekJpMap = siteData.texts?.weekJp || ['日', '月', '火', '水', '木', '金', '土'];
  const weekEnMap = siteData.texts?.weekEn || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 由「墙上日期」(年/月/日) 计算 ISO 周数，与具体时区无关
  const getISOWeekNumber = (y, m, d) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCHours(0, 0, 0, 0);
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day + 3);
    const firstThursday = date.getTime();
    const firstYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const firstYearDay = (firstYear.getUTCDay() + 6) % 7;
    const firstThursdayYear = new Date(
      firstYear.getTime() - firstYearDay * 86400000 + 3 * 86400000
    );
    return 1 + Math.round((firstThursday - firstThursdayYear) / 604800000);
  };

  // 用 Intl 在指定 IANA 时区下提取「墙上时间」各部分（自动处理夏令时/DST）
  const readPartsByTimeZone = (ts, tz) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(ts * 1000));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    let h = get('hour');
    if (h === '24') h = '00'; // 个别环境午夜返回 24 的兜底
    return {
      h: padZero(parseInt(h, 10)),
      m: padZero(parseInt(get('minute'), 10)),
      s: padZero(parseInt(get('second'), 10)),
      year: parseInt(get('year'), 10),
      month: parseInt(get('month'), 10),
      day: parseInt(get('day'), 10),
    };
  };

  // ts 为绝对 UTC 秒。
  // 优先用 IANA timeZone + Intl 渲染(自动夏令时)；无 timeZone 时回退到
  // timeZoneOffset 偏移 + UTC 方法(浏览器本地/兜底场景)。
  const refreshDisplay = (ts, tz = '', offset = 0) => {
    let h, m, s, year, month, day;
    if (tz) {
      try {
        ({ h, m, s, year, month, day } = readPartsByTimeZone(ts, tz));
      } catch (e) {
        // IANA 字符串无效时回退偏移方案
        const date = new Date((ts + offset) * 1000);
        h = padZero(date.getUTCHours());
        m = padZero(date.getUTCMinutes());
        s = padZero(date.getUTCSeconds());
        year = date.getUTCFullYear();
        month = date.getUTCMonth() + 1;
        day = date.getUTCDate();
      }
    } else {
      const date = new Date((ts + offset) * 1000);
      h = padZero(date.getUTCHours());
      m = padZero(date.getUTCMinutes());
      s = padZero(date.getUTCSeconds());
      year = date.getUTCFullYear();
      month = date.getUTCMonth() + 1;
      day = date.getUTCDate();
    }
    const wallDate = new Date(Date.UTC(year, month - 1, day));
    const wIdx = wallDate.getUTCDay();
    setDisplay({
      time: `${h}:${m}:${s}`,
      weekJp: weekJpMap[wIdx],
      weekEn: weekEnMap[wIdx],
      weekNum: getISOWeekNumber(year, month, day),
      year,
      month,
      day,
      second: parseInt(s, 10)
    });
  };

  useEffect(() => {
    setBaseTs(timeEpoch);
    refreshDisplay(timeEpoch, timeZone, timeZoneOffset);
  }, [timeEpoch, currentNickname, timeZone, timeZoneOffset]);

  useEffect(() => {
    const tickTimer = setInterval(() => {
      setBaseTs(prev => {
        const nextTs = prev + 1;
        refreshDisplay(nextTs, timeZone, timeZoneOffset);
        return nextTs;
      });
    }, 1000);
    return () => clearInterval(tickTimer);
  }, [timeZone, timeZoneOffset]);

  // ---- 系统健康检测 ----
  const checkSystemHealth = useCallback(async () => {
    const startTotal = performance.now();
    let apiHealth = true, dbHealth = true, cacheHealth = true;
    let dbLatency = 0, cacheLatency = 0;

    try {
      const dbStart = performance.now();
      const { error: dbErr } = await supabase.from('visit_stats').select('id').limit(1);
      dbLatency = Math.round(performance.now() - dbStart);
      if (dbErr) dbHealth = false;
    } catch {
      dbHealth = false;
      dbLatency = 999;
    }

    try {
      const cacheStart = performance.now();
      localStorage.setItem('health_test', Date.now().toString());
      localStorage.getItem('health_test');
      cacheLatency = Math.round(performance.now() - cacheStart);
    } catch {
      cacheHealth = false;
      cacheLatency = 999;
    }

    const totalLatency = Math.round(performance.now() - startTotal);
    setSysHealth({ apiHealth, dbHealth, cacheHealth, dbLatency, cacheLatency, totalLatency });

    try {
      await supabase
        .from('visit_stats')
        .update({ db_latency: dbLatency, cache_latency: cacheLatency, api_healthy: apiHealth, db_healthy: dbHealth, cache_healthy: cacheHealth })
        .eq('id', 1);
    } catch (e) {
      console.warn('健康数据持久化失败', e.message);
    }
  }, []);

  // ---- 24小时热力 ----
  const loadHourlyData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('hourly_visits')
        .select('hour, count')
        .eq('stat_date', today);

      const arr = Array(24).fill(0);
      data?.forEach(item => {
        if (item.hour >= 0 && item.hour < 24) arr[item.hour] = item.count;
      });
      setHourData(arr);
    } catch (e) {
      console.warn('加载小时热力数据失败', e.message);
    }
  }, []);

  // ---- 上报访客位置（一次性） ----
  const reportLocation = useCallback(async (sessionId) => {
    if (sessionReported.current) return;
    sessionReported.current = true;

    try {
      const loc = await fetchLocation();
      if (!loc) return;

      const deviceInfo = getDeviceInfo();
      const payload = {
        session_id: sessionId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.city || null,
        country: loc.country || null,
        country_code: loc.country_code || null,
        region: loc.region || null,
        timezone: loc.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        ip_address: loc.ip_address || null,
        isp: loc.isp || null,
        is_mobile: deviceInfo.isMobile,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        last_active: new Date().toISOString()
      };

      // Upsert by session_id
      const { data: existing } = await supabase
        .from('visitor_locations')
        .select('id, visit_count')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('visitor_locations')
          .update({ ...payload, visit_count: (existing.visit_count || 0) + 1 })
          .eq('id', existing.id);
      } else {
        await supabase.from('visitor_locations').insert([{ ...payload, visit_count: 1 }]);
      }
    } catch (e) {
      console.warn('位置上报失败', e.message);
    }
  }, []);

  // ---- 核心访问统计轮询（统一入口，带错误降级） ----
  useEffect(() => {
    if (!supabase) return;

    let sessionId = localStorage.getItem('visitor_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('visitor_session', sessionId);
    }

    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    let pollingActive = true;

    const updateStats = async () => {
      if (!pollingActive) return;
      const todayISO = new Date().toISOString().split('T')[0];
      const yesterdayISO = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let todayVisits = visitStats?.today || 0;
      let yesterdayVisits = visitStats?.yesterday || 0;
      let totalVisits = visitStats?.total || 0;
      let uvCount = visitStats?.uv || 0;
      let onlineCount = visitStats?.online || 0;
      let anySuccess = false;

      // 1. 读取 visit_stats（独立 try/catch）
      try {
        const { data: statRow, error: statErr } = await supabase
          .from('visit_stats')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (statErr) throw statErr;

        if (statRow) {
          todayVisits = statRow.today_visits || 0;
          yesterdayVisits = statRow.yesterday_visits || 0;
          totalVisits = statRow.total_visits || 0;
          uvCount = statRow.uv_count || 0;
          const lastReset = statRow.last_reset;

          if (lastReset !== todayISO) {
            yesterdayVisits = (lastReset === yesterdayISO) ? todayVisits : 0;
            todayVisits = 0;
          }
          anySuccess = true;
        }
      } catch (e) {
        console.warn('[统计] visit_stats 读取失败', e.message);
      }

      // 2. 上线当前用户（独立 try/catch）
      try {
        const deviceInfo = getDeviceInfo();
        await supabase.from('online_users').upsert(
          [{ session_id: sessionId, last_active: new Date().toISOString(), user_agent: deviceInfo.userAgent, page_path: window.location.pathname }],
          { onConflict: 'session_id' }
        );
        anySuccess = true;
      } catch (e) {
        console.warn('[统计] online_users 写入失败', e.message);
      }

      // 3. 清理超时离线用户（独立 try/catch）
      try {
        const expireIso = new Date(Date.now() - 300000).toISOString();
        await supabase.from('online_users').delete().lt('last_active', expireIso);
      } catch (e) {
        // 静默忽略清理错误
      }

      // 4. 新会话首次心跳 +1（使用 sessionStorage 防刷新重复计数）
      const sessionKey = `visit_counted_${sessionId}`;
      const alreadyCounted = sessionStorage.getItem(sessionKey);
      if (!alreadyCounted) {
        sessionStorage.setItem(sessionKey, '1');
        todayVisits += 1;
        totalVisits += 1;
        // UV 增量（首次记录此会话时尝试新增 UV）
        try {
          await supabase.rpc('record_unique_visitor', { visitor_fingerprint: sessionId });
          // 重新读取 uv_count
          const { data: uvRow } = await supabase
            .from('visit_stats').select('uv_count').eq('id', 1).maybeSingle();
          uvCount = uvRow?.uv_count || 0;
        } catch (e) {
          // RPC 不可用时降级直接更新
          try {
            uvCount += 1;
            await supabase.from('visit_stats').update({ uv_count: uvCount }).eq('id', 1);
          } catch (e2) { /* 静默忽略 */ }
        }

        try {
          await supabase
            .from('visit_stats')
            .update({
              today_visits: todayVisits,
              total_visits: totalVisits,
              yesterday_visits: yesterdayVisits,
              last_reset: todayISO
            })
            .eq('id', 1);
          anySuccess = true;
        } catch (e) {
          console.warn('[统计] visit_stats 更新失败', e.message);
        }

        // hourly_visits（独立 try/catch）
        try {
          const currentHour = new Date().getHours();
          await supabase.rpc('record_hourly_visit', { target_hour: currentHour });
        } catch (e) {
          try {
            await supabase.from('hourly_visits').upsert(
              { stat_date: todayISO, hour: new Date().getHours(), count: 1 },
              { onConflict: 'stat_date,hour', ignoreDuplicates: false }
            );
          } catch (e2) {
            // 静默忽略
          }
        }
      }

      // 5. 统计在线人数（独立 try/catch）
      try {
        const { count } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });
        onlineCount = count || 0;
        anySuccess = true;
      } catch (e) {
        console.warn('[统计] 在线人数读取失败', e.message);
      }

      // 更新状态
      setVisitStats({
        total: totalVisits,
        today: todayVisits,
        yesterday: yesterdayVisits,
        online: onlineCount,
        uv: uvCount
      });

      // 6. 帖子统计（今/昨/总）：基于文章数据 + 浏览器本地时区实时计算，
      //    不再依赖构建时写死的 todayCount/yesterdayCount（不会随本地日期滚动且受构建服务器时区影响）
      setPostStats(computePostStats());

      // 7. 上报访客位置（异步，不阻塞）
      reportLocation(sessionId);

      // 8. 健康检测 + 热力（独立调用，不阻塞）
      checkSystemHealth();
      loadHourlyData();

      // 错误累积检测：连续失败 N 次则暂停轮询，但 60 秒后自动恢复，
      // 避免 Supabase 免费项目「唤醒期间」的短暂失败导致统计永久停摆
      if (anySuccess) {
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          pollingActive = false;
          console.warn('[统计] Supabase 连续不可用，60 秒后自动重试（若项目被暂停，唤醒期间属正常）。');
          setTimeout(() => {
            pollingActive = true;
            consecutiveErrors = 0;
          }, 60000);
        }
      }
    };

    updateStats();
    const timer = setInterval(updateStats, 5000);
    return () => clearInterval(timer);
  }, [checkSystemHealth, loadHourlyData, reportLocation]);

  const maxHourCount = Math.max(...hourData, 1);
  const currentHour = new Date().getHours();
  const finalUserName = getUserName(user, currentNickname);

  // 跳转访问地图
  const openVisitMap = () => {
    window.open('/visit-map', '_blank');
  };

  return (
    <div style={{
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      padding: isMobile ? '10px' : '14px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gridTemplateRows: isMobile ? 'auto' : 'auto auto auto auto',
      gap: isMobile ? '8px' : '4px 14px',
      alignItems: 'stretch',
    }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* A区 顶部5个图标统计 */}
      <div style={{ gridColumn: 1, gridRow: isMobile ? 'auto' : 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          justifyContentItems: 'center',
        }}>
          {isSessionChecked ? (siteData?.stats || []).map((item, i) => {
            let showVal = item.value;
            if (item.label === "会") showVal = userCount;
            if (item.label === "新") {
              showVal = latestUser || '新用户';
            }
            // 动态展示今日/昨日/总数（帖子数量）
            if (item.label === "今") showVal = postStats.todayPosts;
            if (item.label === "昨") showVal = postStats.yesterdayPosts;
            if (item.label === "总") showVal = postStats.totalPosts;
            const color = statColors[i] || statColors[0];
            return (
              <div key={`${i}-${currentNickname}`} style={{ textAlign: 'center', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
              >
                <div style={{
                  width: isMobile ? 32 : 42, height: isMobile ? 32 : 42, borderRadius: '50%',
                  background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 3px', boxShadow: `0 2px 6px ${color.shadow}`
                }}>
                  <span style={{ fontSize: isMobile ? 14 : 18, fontWeight: 'bold', color: '#fff' }}>{item.label}</span>
                </div>
                <p style={{ fontSize: isMobile ? 10 : 11, margin: '1px 0 0', fontWeight: 700, color: '#4285f4' }}>{showVal}</p>
              </div>
            );
          }) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ width: isMobile ? 32 : 42, height: isMobile ? 32 : 42, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', margin: '0 auto 3px' }} />
                <div style={{ width: 32, height: 9, background: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto 2px' }} />
                <div style={{ width: 26, height: 11, background: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto' }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* B区 在线/今日/总访问 */}
      <div style={{ gridColumn: 1, gridRow: isMobile ? 'auto' : 2 }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px',
          fontSize: isMobile ? 10 : 11, color: '#666', fontWeight: 500,
          gap: isMobile ? '4px' : '0',
        }}>
          <span>👥 在线：{visitStats.online}</span>
          <span>☀️ 今日：{visitStats.today}</span>
          <span>👣 总访问：{visitStats.total}</span>
          <span>📊 UV：{visitStats.uv}</span>
        </div>
      </div>

      {/* C区 系统健康监控 */}
      <div style={{ gridColumn: 1, gridRow: isMobile ? 'auto' : 3 }}>
        <div style={{
          padding: '3px 6px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{ fontSize: 10, color: '#666' }}>{siteData.texts?.systemStatus || '⚙️ 系统状态'}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 20, height: 20, margin: '0 auto 2px',
                background: sysHealth.apiHealth ? '#34d399' : '#ef4444',
                borderRadius: '50%', transition: 'background 0.5s ease'
              }} />
              <span style={{ fontSize: 9, color: '#555' }}>API</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 20, height: 20, margin: '0 auto 2px',
                background: sysHealth.dbHealth ? '#fbbf24' : '#ef4444',
                borderRadius: '50%', transition: 'background 0.5s ease'
              }} />
              <span style={{ fontSize: 9, color: '#555' }}>DB {sysHealth.dbLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 20, height: 20, margin: '0 auto 2px',
                background: sysHealth.cacheHealth ? '#4285f4' : '#ef4444',
                borderRadius: '50%', transition: 'background 0.5s ease'
              }} />
              <span style={{ fontSize: 9, color: '#555' }}>Cache {sysHealth.cacheLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 40, height: 12, margin: '0 auto 2px', borderRadius: '2px',
                background: sysHealth.totalLatency < 50
                  ? 'linear-gradient(90deg, #34d399 100%, #e5e7eb 0%)'
                  : sysHealth.totalLatency < 150
                    ? `linear-gradient(90deg, #fbbf24 ${Math.min((sysHealth.totalLatency / 150) * 100, 100)}%, #e5e7eb 0%)`
                    : 'linear-gradient(90deg, #ef4444 100%, #e5e7eb 0%)'
              }} />
              <span style={{ fontSize: 9, color: '#555' }}>总{sysHealth.totalLatency}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* D区 24小时热力图（可点击跳转访问地图） */}
      <div style={{ gridColumn: 1, gridRow: 4 }}>
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '4px 6px',
          background: 'rgba(0,0,0,0.02)', borderRadius: '8px', gap: '4px',
          cursor: 'pointer', transition: 'box-shadow 0.3s ease',
        }}
          onClick={openVisitMap}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #4285f4 inset'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          title="点击查看全球访问地图"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
            <span>{siteData.texts?.todayHeatmap || '📊 今日访问热力'}</span>
            <span>当前{currentHour}:00 峰值{maxHourCount} 🔗地图</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)',
            gap: '1px', flex: 1, minHeight: '30px', alignItems: 'flex-end'
          }}>
            {hourData.map((count, i) => {
              const isCur = i === currentHour;
              const hPercent = maxHourCount === 0 ? 5 : Math.max((count / maxHourCount) * 100, 3);
              let fillColor;
              if (isCur) fillColor = '#4285f4';
              else if (count / maxHourCount > 0.8) fillColor = '#34d399';
              else if (count / maxHourCount > 0.5) fillColor = '#fbbf24';
              else if (count > 0) fillColor = '#9ca3af';
              else fillColor = '#e5e7eb';

              return (
                <div key={i} style={{
                  height: `${hPercent}%`,
                  backgroundColor: fillColor,
                  borderRadius: '1px 1px 0 0',
                  transition: 'height 0.5s ease, background-color 0.3s ease'
                }} title={`${i}:00 访问${count}次`} />
              );
            })}
          </div>
        </div>
      </div>

      {/* E区 时钟面板 */}
      <div style={{ gridColumn: isMobile ? 1 : 2, gridRow: isMobile ? 'auto' : '1 / span 3', height: isMobile ? 'auto' : '100%' }}>
        <div className="pixel-clock-fixed" style={{
          padding: isMobile ? "10px 12px" : "12px 14px", borderRadius: "16px", textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)", position: "relative",
          width: '100%', height: isMobile ? 'auto' : '100%', boxSizing: 'border-box',
        }}>
          <p style={{ margin: '0 0 3px', fontSize: isMobile ? 12 : 15, color: '#1ce306', fontWeight: 500 }}>
            {locationName}当地时间
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '5px', marginBottom: '5px'
          }}>
            <span style={{ fontSize: isMobile ? 14 : 17 }}>⏰</span>
            <div className={`pixel-font ${styles.clockText}`} style={{
              fontSize: isMobile ? 16 : 19, color: '#1a1a1a', letterSpacing: 2,
            }}>
              {display.time}
            </div>
          </div>
          <button onClick={openCalendar} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
            margin: '0 auto 5px', padding: '2px 8px',
            backgroundColor: 'rgba(66, 133, 244, 0.1)', border: 'none',
            borderRadius: '18px', cursor: 'pointer', fontSize: isMobile ? 10 : 11, color: '#0060fc', fontWeight: 500,
          }}>
            <span style={{ fontSize: isMobile ? 10 : 12 }}>📅</span>
            <span>{display.weekJp}曜日 · {display.weekEn}</span>
          </button>
          <div className={`pixel-font ${styles.dateText}`} style={{
            fontSize: isMobile ? 11 : 13, color: '#333', fontWeight: 600
          }}>
            {display.year}-{padZero(display.month)}-{padZero(display.day)} 第{display.weekNum}周
          </div>
        </div>
      </div>

      {/* F区 公告栏 */}
      <div style={{ gridColumn: isMobile ? 1 : 2, gridRow: isMobile ? 'auto' : 4 }}>
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '6px 8px', background: 'rgba(254, 248, 230, 0.7)',
          borderRadius: '8px', border: '1px dashed #f5cc80',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: 12 }}>📢</span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>{siteData.texts?.siteNotice || '站点公告'}</span>
              <p style={{ fontSize: 10, color: '#555', margin: '2px 0 0', lineHeight: 1.4 }}>
                {siteData?.texts?.announcement || siteData?.siteAnnouncement || '本站持续更新React与嵌入式教程，欢迎交流~'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
