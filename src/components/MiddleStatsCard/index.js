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

  const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '水';
  const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Wednesday';
  const weekNum = getWeekNumber(now);

  useEffect(() => {
    if (!supabase) return;
    const updateStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: current } = await supabase
          .from('visit_stats')
          .select('*')
          .eq('id', 1)
          .single();

        let todayCount = current?.today_visits || 0;
        if (current?.last_reset !== today) todayCount = 0;
        const newTotal = (current?.total_visits || 0) + 1;
        const newToday = todayCount + 1;

        await supabase
          .from('visit_stats')
          .update({ total_visits: newTotal, today_visits: newToday, last_reset: today })
          .eq('id', 1);

        const sessionId = localStorage.getItem('visitor_session') || crypto.randomUUID();
        localStorage.setItem('visitor_session', sessionId);

        await supabase.from('online_users').upsert(
          [{ session_id: sessionId, last_active: new Date() }],
          { onConflict: 'session_id' }
        );
        await supabase.from('online_users').delete().lt('last_active', new Date(Date.now() - 300000));

        const { count: onlineCount } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });

        setVisitStats({ total: newTotal, today: newToday, online: onlineCount || 0 });
      } catch (e) {
        console.log('统计加载失败', e);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      padding: '14px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr', // 左右两列宽度完全相等
      gridTemplateRows: 'auto auto auto auto', // 4行基础骨架
      gap: '4px 14px',
      alignItems: 'stretch',
      // 移动端自适应：小屏幕切换为单列堆叠
      '@media (max-width: 768px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto auto auto auto auto auto',
      }
    }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ========== A区域：左列第1行 | 今昨总会新图标 ========== */}
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

      {/* ========== B区域：左列第2行 | 在线/今日/总访问 ========== */}
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

      {/* ========== C区域：左列第3行 | 系统状态监控 ========== */}
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
              <div style={{ width: '20px', height: '20px', margin: '0 auto 2px', background: '#34d399' }} />
              <span style={{ fontSize: '9px', color: '#555' }}>API</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '20px', height: '20px', margin: '0 auto 2px', background: '#fbbf24' }} />
              <span style={{ fontSize: '9px', color: '#555' }}>DB</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '20px', height: '20px', margin: '0 auto 2px', background: '#4285f4' }} />
              <span style={{ fontSize: '9px', color: '#555' }}>缓存</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '12px', margin: '0 auto 2px', background: 'linear-gradient(90deg, #34d399 85%, #e5e7eb 85%)', borderRadius: '2px' }} />
              <span style={{ fontSize: '9px', color: '#555' }}>23ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== D区域：左列第4行 | 24小时访问热力图（高度=F） ========== */}
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
            <span>{new Date().getHours()}:00 高峰</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(24, 1fr)',
            gap: '1px',
            flex: 1,
            minHeight: '30px',
            alignItems: 'flex-end'
          }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const hour = new Date().getHours();
              const isCurrent = i === hour;
              const intensity = isCurrent ? 1 : Math.abs(i - hour) <= 2 ? 0.8 : Math.random() * 0.6 + 0.2;
              const height = `${intensity * 100}%`;
              const color = intensity > 0.8 ? '#4285f4' : intensity > 0.6 ? '#34d399' : intensity > 0.4 ? '#fbbf24' : '#9ca3af';
              return <div key={i} style={{ height, backgroundColor: color, borderRadius: '1px 1px 0 0', transition: 'height 0.5s ease' }} title={`${i}:00`} />;
            })}
          </div>
        </div>
      </div>

      {/* ========== E区域：右列 横跨行1/2/3 | 像素时钟（高度=A+B+C总和） ========== */}
      <div style={{ gridColumn: 2, gridRow: '1 / span 3', height: '100%' }}>
        <PixelClock now={now} weekJp={weekJp} weekEn={weekEn} weekNum={weekNum} />
      </div>

      {/* ========== F区域：右列第4行 | 公告栏（高度=D） ========== */}
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
          {/* 可整体替换此div内部内容：签到/导航/计时器/标语等 */}
        </div>
      </div>
    </div>
  );
}