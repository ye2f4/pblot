import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import styles from '../../pages/index.module.css';

const statColors = [
  { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', shadow: 'rgba(59, 130, 246, 0.25)' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(124, 58, 237, 0.25)' },
  { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
  { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', shadow: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', shadow: 'rgba(236, 72, 153, 0.25)' }
];

export default function MiddleStatsCard({
  siteData = {},
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  timeEpoch = Math.floor(Date.now() / 1000),
  locationName = "北京"
}) {
  console.log("【MiddleStatsCard最终层】timeEpoch =", timeEpoch, "城市 =", locationName);
  const [visitStats, setVisitStats] = useState({
    online: 0,
    today: 0,
    total: 0
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

  // 时钟核心逻辑
  const openCalendar = () => window.open('/calendar', '_blank');
  const padZero = (num) => String(num).padStart(2, '0');

  // 基准时间戳用state存储
  const [baseTs, setBaseTs] = useState(timeEpoch);
  const [display, setDisplay] = useState({
    time: '00:00:00',
    weekJp: '水',
    weekEn: 'Wednesday',
    weekNum: 1,
    year: 2026,
    month: 1,
    day: 1
  });
  const weekJpMap = ['日', '月', '火', '水', '木', '金', '土'];
  const weekEnMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ISO周计算函数
  const getISOWeekNumber = (ts) => {
    const date = new Date(ts * 1000);
    date.setHours(0, 0, 0, 0);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day + 3);
    const firstThursday = date.getTime();
    const firstYear = new Date(date.getFullYear(), 0, 1);
    const firstYearDay = (firstYear.getDay() + 6) % 7;
    const firstThursdayYear = new Date(
      firstYear.getTime() - firstYearDay * 86400000 + 3 * 86400000
    );
    return 1 + Math.round((firstThursday - firstThursdayYear) / 604800000);
  };

  // 刷新渲染数据，带打印校验
  const refreshDisplay = (ts) => {
    const date = new Date(ts * 1000);
    const h = padZero(date.getHours());
    const m = padZero(date.getMinutes());
    const s = padZero(date.getSeconds());
    const wIdx = date.getDay();
    const newDisplay = {
      time: `${h}:${m}:${s}`,
      weekJp: weekJpMap[wIdx],
      weekEn: weekEnMap[wIdx],
      weekNum: getISOWeekNumber(ts),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
    console.log("【refresh组装时间】", newDisplay.time, "时间戳", ts);
    setDisplay(newDisplay);
  };

  // 监听父组件传入时间戳变化
  useEffect(() => {
    console.log("=== 触发timeEpoch更新钩子 ===", timeEpoch);
    setBaseTs(timeEpoch);
    refreshDisplay(timeEpoch);
  }, [timeEpoch]);

  // 每秒自动+1秒走时
  useEffect(() => {
    const tickTimer = setInterval(() => {
      setBaseTs(prev => {
        const nextTs = prev + 1;
        refreshDisplay(nextTs);
        return nextTs;
      });
    }, 1000);
    return () => clearInterval(tickTimer);
  }, []);

  // 系统健康检测
  const checkSystemHealth = async () => {
    const startTotal = performance.now();
    let apiHealth = true;
    let dbHealth = true;
    let cacheHealth = true;
    let dbLatency = 0;
    let cacheLatency = 0;

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
    setSysHealth({
      apiHealth,
      dbHealth,
      cacheHealth,
      dbLatency,
      cacheLatency,
      totalLatency
    });

    try {
      await supabase
        .from('visit_stats')
        .update({
          db_latency: dbLatency,
          cache_latency: cacheLatency,
          api_healthy: apiHealth,
          db_healthy: dbHealth,
          cache_healthy: cacheHealth
        })
        .eq('id', 1);
    } catch (e) {
      console.warn('健康数据无写入权限，跳过持久化', e.message);
    }
  };

  // 24小时热力数据加载
  const loadHourlyData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('hourly_visits')
        .select('hour, count')
        .eq('stat_date', today);

      const arr = Array(24).fill(0);
      data?.forEach(item => {
        arr[item.hour] = item.count;
      });
      setHourData(arr);
    } catch (e) {
      console.warn('加载小时热力数据失败', e.message);
      setHourData(Array(24).fill(0));
    }
  };

  // 访问统计轮询
  useEffect(() => {
    if (!supabase) return;
    const updateStats = async () => {
      const todayISO = new Date().toISOString().split('T')[0];
      let currentStat = { today_visits: 0, total_visits: 0, last_reset: todayISO };

      try {
        const res = await supabase
          .from('visit_stats')
          .select('today_visits, total_visits, last_reset')
          .eq('id', 1)
          .single();
        if (res.data) currentStat = res.data;
      } catch (e) {
        console.warn('读取访问统计失败，使用默认值', e.message);
      }

      const displayToday = currentStat.last_reset === todayISO ? currentStat.today_visits : 0;
      const displayTotal = currentStat.total_visits;

      const sessionId = localStorage.getItem('visitor_session') || crypto.randomUUID();
      localStorage.setItem('visitor_session', sessionId);

      try {
        const nowIso = new Date().toISOString();
        await supabase.from('online_users').upsert(
          [{ session_id: sessionId, last_active: nowIso }],
          { onConflict: 'session_id' }
        );
      } catch (e) {
        console.warn('在线用户上报失败', e.message);
      }

      try {
        const expireIso = new Date(Date.now() - 300000).toISOString();
        await supabase.from('online_users').delete().lt('last_active', expireIso);
      } catch (e) {
        console.warn('清理离线用户失败', e.message);
      }

      let onlineCount = 0;
      try {
        const { count } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });
        onlineCount = count || 0;
      } catch (e) {
        console.warn('读取在线人数失败', e.message);
      }

      setVisitStats({
        total: displayTotal,
        today: displayToday,
        online: onlineCount
      });

      checkSystemHealth();
      loadHourlyData();
    };

    updateStats();
    const timer = setInterval(updateStats, 5000);
    return () => clearInterval(timer);
  }, []);

  const maxHourCount = Math.max(...hourData, 1);
  const currentHour = new Date().getHours();

  return (
    <div style={{
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      padding: '14px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: 'auto auto auto auto',
      gap: '4px 14px',
      alignItems: 'stretch',
    }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* A区 顶部5个图标统计 */}
      <div style={{ gridColumn: 1, gridRow: 1 }}>
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
              showVal = latestUser && latestUser.trim() !== '' ? latestUser : '新用户';
            }
            const color = statColors[i] || statColors[0];
            return (
              <div key={i} style={{ textAlign: 'center', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: color.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 3px',
                  boxShadow: `0 2px 6px ${color.shadow}`
                }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{item.label}</span>
                </div>
                <p style={{ fontSize: 11, margin: '1px 0 0', fontWeight: 700, color: '#4285f4' }}>{showVal}</p>
              </div>
            );
          }) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', margin: '0 auto 3px' }} />
                <div style={{ width: 32, height: 9, background: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto 2px' }} />
                <div style={{ width: 26, height: 11, background: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto' }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* B区 在线/今日/总访问 */}
      <div style={{ gridColumn: 1, gridRow: 2 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '10px',
          fontSize: 11,
          color: '#666',
          fontWeight: 500,
        }}>
          <span>👥 在线：{visitStats.online}</span>
          <span>☀️ 今日：{visitStats.today}</span>
          <span>👣 总访问：{visitStats.total}</span>
        </div>
      </div>

      {/* C区 系统健康监控 */}
      <div style={{ gridColumn: 1, gridRow: 3 }}>
        <div style={{
          padding: '3px 6px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 10, color: '#666' }}>⚙️ 系统状态</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 20, height: 20, margin: '0 auto 2px', background: sysHealth.apiHealth ? '#34d399' : '#ef4444', borderRadius: '50%' }} />
              <span style={{ fontSize: 9, color: '#555' }}>API</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 20, height: 20, margin: '0 auto 2px', background: sysHealth.dbHealth ? '#fbbf24' : '#ef4444', borderRadius: '50%' }} />
              <span style={{ fontSize: 9, color: '#555' }}>DB {sysHealth.dbLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 20, height: 20, margin: '0 auto 2px', background: sysHealth.cacheHealth ? '#4285f4' : '#ef4444', borderRadius: '50%' }} />
              <span style={{ fontSize: 9, color: '#555' }}>缓存 {sysHealth.cacheLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 40,
                height: 12,
                margin: '0 auto 2px',
                borderRadius: '2px',
                background: sysHealth.totalLatency < 50
                  ? 'linear-gradient(90deg, #34d399 100%, #e5e7eb 0%)'
                  : sysHealth.totalLatency < 150
                    ? `linear-gradient(90deg, #fbbf24 ${(sysHealth.totalLatency / 150) * 100}%, #e5e7eb ${(sysHealth.totalLatency / 150) * 100}%)`
                    : 'linear-gradient(90deg, #ef4444 100%, #e5e7eb 0%)'
              }} />
              <span style={{ fontSize: 9, color: '#555' }}>总{sysHealth.totalLatency}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* D区 24小时热力图 */}
      <div style={{ gridColumn: 1, gridRow: 4 }}>
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4px 6px',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
            <span>📊 今日访问热力</span>
            <span>当前{currentHour}:00 峰值{maxHourCount}</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(24, 1fr)',
            gap: '1px',
            flex: 1,
            minHeight: '30px',
            alignItems: 'flex-end'
          }}>
            {hourData.map((count, i) => {
              const isCur = i === currentHour;
              const hPercent = maxHourCount === 0 ? 5 : (count / maxHourCount) * 100;
              let fillColor;
              if (isCur) fillColor = '#4285f4';
              else if (count / maxHourCount > 0.8) fillColor = '#34d399';
              else if (count / maxHourCount > 0.5) fillColor = '#fbbf24';
              else if (count > 0) fillColor = '#9ca3af';
              else fillColor = '#e5e7eb';

              return (
                <div
                  key={i}
                  style={{
                    height: `${hPercent}%`,
                    backgroundColor: fillColor,
                    borderRadius: '1px 1px 0 0',
                    transition: 'height 0.5s ease'
                  }}
                  title={`${i}点 访问${count}次`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* E区 时钟面板 */}
      <div className="pixel-clock-fixed" style={{
        padding: "12px 14px",
        borderRadius: "16px",
        textAlign: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        position: "relative",
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        // 新增：动态透明度 + 微小位移，强制浏览器重绘
        opacity: 0.98 + (display.second || 0) * 0.0001,
        transform: `translateY(${(display.second || 0) % 2 === 0 ? 0 : 0.01}px)`
      }}></div>
      <div style={{ gridColumn: 2, gridRow: '1 / span 3', height: '100%' }}>
        <div className="pixel-clock-fixed" style={{
          padding: "12px 14px",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          position: "relative",
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}>
          <p style={{
            margin: '0 0 3px',
            fontSize: 15,
            color: '#1ce306',
            fontWeight: 500
          }}>
            {locationName}当地时间
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            marginBottom: '5px'
          }}>
            <span style={{ fontSize: 17 }}>⏰</span>
            <div className={`pixel-font ${styles.clockText}`} style={{
              fontSize: 19,
              color: '#1a1a1a',
              letterSpacing: 2,
            }}>
              {/* 新增 key={display.time} 内容变化则重建DOM */}
              <div
                key={display.time}
                className={`pixel-font ${styles.clockText}`}
                style={{
                  fontSize: 19,
                  color: '#1a1a1a',
                  letterSpacing: 2,
                }}
              ></div>
              {display.time}
            </div>
          </div>

          <button onClick={openCalendar} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            margin: '0 auto 5px',
            padding: '2px 8px',
            backgroundColor: 'rgba(66, 133, 244, 0.1)',
            border: 'none',
            borderRadius: '18px',
            cursor: 'pointer',
            fontSize: 11,
            color: '#0060fc',
            fontWeight: 500,
          }}>
            <span style={{ fontSize: 12 }}>📅</span>
            <span>{display.weekJp}曜日 · {display.weekEn}</span>
          </button>

          <div className={`pixel-font ${styles.dateText}`} style={{
            fontSize: 13,
            color: '#333',
            fontWeight: 600
          }}>
            {/* 新增 key={`${display.year}${display.month}${display.day}${display.weekNum}`} */}
            <div
              key={`${display.year}${display.month}${display.day}${display.weekNum}`}
              className={`pixel-font ${styles.dateText}`}
              style={{
                fontSize: 13,
                color: '#333',
                fontWeight: 600
              }}
            ></div>
            {display.year}-
            {padZero(display.month)}-
            {padZero(display.day)}
            第{display.weekNum}周
          </div>
        </div>
      </div>

      {/* F区 公告栏 */}
      <div style={{ gridColumn: 2, gridRow: 4 }}>
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '6px 8px',
          background: 'rgba(254, 248, 230, 0.7)',
          borderRadius: '8px',
          border: '1px dashed #f5cc80',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: 12 }}>📢</span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>站点公告</span>
              <p style={{ fontSize: 10, color: '#555', margin: '2px 0 0', lineHeight: 1.4 }}>
                本站持续更新React与嵌入式教程，欢迎交流~
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}