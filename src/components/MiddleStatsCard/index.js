import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import PixelClock from '../PixelClock';

const statColors = [
  { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', shadow: 'rgba(59, 130, 246, 0.25)' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(124, 58, 237, 0.25)' },
  { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
  { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', shadow: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', shadow: 'rgba(236, 72, 153, 0.25)' }
];

const getWeekNumber = (d) => {
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export default function MiddleStatsCard({
  siteData = {},
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  now = new Date()
}) {
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

  const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '水';
  const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Wednesday';
  const weekNum = getWeekNumber(now);

  // 1. 系统健康检测（带容错，写入失败不阻塞）
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

    // 权限不足会静默失败，加捕获
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

  // 2. 加载24小时小时访问热力数据
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

  // 3. 主统计更新逻辑（全链路拆分容错）
  useEffect(() => {
    if (!supabase) return;
    const updateStats = async () => {
      const todayISO = new Date().toISOString().split('T')[0];
      let currentStat = { today_visits: 0, total_visits: 0, last_reset: todayISO };

      // 第一步：读取visit_stats（单独捕获406权限错误）
      try {
        const res = await supabase
          .from('visit_stats')
          .select('today_visits, total_visits, last_reset')
          .eq('id', 1)
          .single();
        if (res.data) currentStat = res.data;
      } catch (e) {
        console.warn('读取访问总量受限，使用默认值', e.message);
      }

      // 前端不再执行UPDATE写入（无service_role权限，避免406报错）
      const displayToday = currentStat.last_reset === todayISO ? currentStat.today_visits : 0;
      const displayTotal = currentStat.total_visits;

      // 访客会话标识
      const sessionId = localStorage.getItem('visitor_session') || crypto.randomUUID();
      localStorage.setItem('visitor_session', sessionId);

      // 上报在线状态（时间强制ISO）
      try {
        const nowIso = new Date().toISOString();
        await supabase.from('online_users').upsert(
          [{ session_id: sessionId, last_active: nowIso }],
          { onConflict: 'session_id' }
        );
      } catch (e) {
        console.warn('在线状态上报失败', e.message);
      }

      // 清理过期在线用户（修复ISO时间格式，根除400）
      try {
        const expireIso = new Date(Date.now() - 300000).toISOString();
        await supabase.from('online_users').delete().lt('last_active', expireIso);
      } catch (e) {
        console.warn('清理过期在线用户失败', e.message);
      }

      // 获取实时在线人数
      let onlineCount = 0;
      try {
        const { count } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });
        onlineCount = count || 0;
      } catch (e) {
        console.warn('读取在线人数失败', e.message);
      }

      // 更新页面展示数据
      setVisitStats({
        total: displayTotal,
        today: displayToday,
        online: onlineCount
      });

      // 异步加载辅助数据
      checkSystemHealth();
      loadHourlyData();
    };

    // 立即执行 + 5秒轮询
    updateStats();
    const timer = setInterval(updateStats, 5000);
    return () => clearInterval(timer);
  }, []);

  // 热力图峰值计算
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
      {/* A区域：顶部5个图标统计 */}
      <div style={{ gridColumn: 1, gridRow: 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          justifyItems: 'center',
        }}>
          {isSessionChecked ? (siteData?.stats || []).map((item, i) => {
            let showValue = item.value;
            if (item.label === "会") showValue = userCount;
            if (item.label === "新") {
              showValue = latestUser && latestUser.trim() !== '' ? latestUser : '新用户';
            }
            const color = statColors[i] || statColors[0];
            return (
              <div key={i} style={{ textAlign: 'center', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: color.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 3px',
                  boxShadow: `0 2px 6px ${color.shadow}`
                }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{item.label}</span>
                </div>
                <p style={{ fontSize: 11, margin: '1px 0 0 0', fontWeight: 700, color: '#4285f4' }}>{showValue}</p>
              </div>
            );
          }) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', margin: '0 auto 3px' }} />
                <div style={{ width: 32, height: 9, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto 2px' }} />
                <div style={{ width: 26, height: 11, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto' }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* B区域：在线/今日/总访问 */}
      <div style={{ gridColumn: 1, gridRow: 2 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '10px',
          fontSize: '11px',
          color: '#666',
          fontWeight: 500,
        }}>
          <span>👥 在线：{visitStats.online}</span>
          <span>☀️ 今日：{visitStats.today}</span>
          <span>👣 总访问：{visitStats.total}</span>
        </div>
      </div>

      {/* C区域：真实系统健康监控面板 */}
      <div style={{ gridColumn: 1, gridRow: 3 }}>
        <div style={{
          padding: '3px 6px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '10px', color: '#666' }}>⚙️ 系统状态</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '20px', height: '20px', margin: '0 auto 2px',
                background: sysHealth.apiHealth ? '#34d399' : '#ef4444'
              }} />
              <span style={{ fontSize: '9px', color: '#555' }}>API</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '20px', height: '20px', margin: '0 auto 2px',
                background: sysHealth.dbHealth ? '#fbbf24' : '#ef4444'
              }} />
              <span style={{ fontSize: '9px', color: '#555' }}>DB {sysHealth.dbLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '20px', height: '20px', margin: '0 auto 2px',
                background: sysHealth.cacheHealth ? '#4285f4' : '#ef4444'
              }} />
              <span style={{ fontSize: '9px', color: '#555' }}>缓存 {sysHealth.cacheLatency}ms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '12px', margin: '0 auto 2px',
                borderRadius: '2px',
                background: sysHealth.totalLatency < 50
                  ? 'linear-gradient(90deg, #34d399 100%, #e5e7eb 0%)'
                  : sysHealth.totalLatency < 150
                    ? `linear-gradient(90deg, #fbbf24 ${(sysHealth.totalLatency / 150) * 100}%, #e5e7eb ${(sysHealth.totalLatency / 150) * 100}%)`
                    : `linear-gradient(90deg, #ef4444 100%, #e5e7eb 0%)`
              }} />
              <span style={{ fontSize: '9px', color: '#555' }}>总{sysHealth.totalLatency}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* D区域：24小时真实访问热力图 */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
            <span>📊 今日访问热力</span>
            <span>当前{currentHour}:00 峰值{Math.max(...hourData)}次</span>
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
              const isCurrent = i === currentHour;
              const heightPercent = maxHourCount === 0 ? 5 : (count / maxHourCount) * 100;
              let color;
              if (isCurrent) color = '#4285f4';
              else if (count / maxHourCount > 0.8) color = '#34d399';
              else if (count / maxHourCount > 0.5) color = '#fbbf24';
              else if (count > 0) color = '#9ca3af';
              else color = '#e5e7eb';

              return (
                <div
                  key={i}
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: color,
                    borderRadius: '1px 1px 0 0',
                    transition: 'height 0.5s ease'
                  }}
                  title={`${i}:00 访问${count}次`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* E区域：像素时钟 */}
      <div style={{ gridColumn: 2, gridRow: '1 / span 3', height: '100%' }}>
        <PixelClock now={now} weekJp={weekJp} weekEn={weekEn} weekNum={weekNum} />
      </div>

      {/* F区域：站点公告 */}
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
            <span style={{ fontSize: '12px' }}>📢</span>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706' }}>站点公告</span>
              <p style={{ fontSize: '10px', color: '#555', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                本站持续更新React与嵌入式教程，欢迎留言交流~
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}