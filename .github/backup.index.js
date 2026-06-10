import React, { useState, useEffect, useRef } from 'react';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

// 工具函数（原TopBanner中的，随组件一起分离）
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const getWeekNumber = (d) => {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const statColors = [
    { bg: 'linear-gradient(135deg, #4285f4 0%, #1976d2 100%)', shadow: 'rgba(66, 133, 244, 0.3)' },
    { bg: 'linear-gradient(135deg, #433b3b 0%, #433b3b 100%)', shadow: 'rgba(156, 39, 176, 0.3)' },
    { bg: 'linear-gradient(135deg, #58ac5b 0%, #58ac5b 100%)', shadow: 'rgba(76, 175, 80, 0.3)' },
    { bg: 'linear-gradient(135deg, #fbd900 0%, #fbd900 100%)', shadow: 'rgba(255, 152, 0, 0.3)' },
    { bg: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', shadow: 'rgba(244, 67, 54, 0.3)' },
];

export default function MiddleStatsCard({
    siteData = {},
    isSessionChecked = false,
    userCount = 0,
    latestUser = '新用户',
    now = new Date()
}) {
    // 组件内部状态（全部从TopBanner移到这里）
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();

    const [visitStats, setVisitStats] = useState({
        online: 0,
        today: 0,
        total: 0
    });

    const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '水';
    const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Wednesday';
    const weekNum = getWeekNumber(now);

    // 访问统计逻辑（移到组件内部）
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
                    .update({
                        total_visits: newTotal,
                        today_visits: newToday,
                        last_reset: today
                    })
                    .eq('id', 1);

                const sessionId = localStorage.getItem('visitor_session') || crypto.randomUUID();
                localStorage.setItem('visitor_session', sessionId);

                await supabase
                    .from('online_users')
                    .upsert([{ session_id: sessionId, last_active: new Date() }], {
                        onConflict: 'session_id'
                    });

                await supabase
                    .from('online_users')
                    .delete()
                    .lt('last_active', new Date(Date.now() - 300000).toISOString());

                const { count: onlineCount } = await supabase
                    .from('online_users')
                    .select('*', { count: 'exact', head: true });

                setVisitStats({
                    total: newTotal,
                    today: newToday,
                    online: onlineCount || 0
                });
            } catch (e) {
                console.log('统计加载失败', e);
            }
        };

        updateStats();
        const interval = setInterval(updateStats, 5000);
        return () => clearInterval(interval);
    }, []);

    // 日历渲染逻辑（移到组件内部）
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
        const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} style={{ opacity: 0.3 }}></div>);
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === now.getDate() && calendarMonth === now.getMonth() && calendarYear === now.getFullYear();
            days.push(
                <div key={day} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12, backgroundColor: isToday ? '#3ff3a5' : 'transparent', color: isToday ? '#fff' : '#333', fontWeight: isToday ? 600 : 400 }}>
                    {day}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 230px',
            gridTemplateRows: 'auto auto',
            gap: '10px 14px',
            alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()} // 阻止冒泡到外层Banner关闭日历
        >
            {/* 第一行：5个统计图标 */}
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
                            <p style={{ fontSize: 10, margin: 0, fontWeight: 600, color: '#333' }}>
                                {item.label === "会" ? '会员' : item.label === "新" ? '最新' : item.label}
                            </p>
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

            {/* 第二行：访问统计条 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
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

            {/* 右侧时钟卡片 */}
            <div style={{
                gridRow: '1 / 3',
                padding: "12px 14px",
                background: "rgba(75, 157, 205, 0.9)",
                borderRadius: "16px",
                textAlign: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                position: "relative",
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <p style={{ margin: '0 0 3px 0', fontSize: 15, color: '#1ce306', fontWeight: 500 }}>标准北京时间</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 17 }}>⏰</span>
                    <div className={`pixel-font ${styles.clockText}`} style={{ fontSize: 19, color: '#1a1a1a', letterSpacing: 2 }}>
                        {now.toLocaleTimeString()}
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); }} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, 
                    margin: '0 auto 5px auto', padding: '2px 8px', 
                    backgroundColor: 'rgba(66, 133, 244, 0.1)', 
                    border: 'none', borderRadius: 18, cursor: 'pointer', 
                    fontSize: 11, color: '#0060fc', fontWeight: 500 
                }}>
                    <span style={{ fontSize: 12 }}>📅</span>
                    <span>{weekJp}曜日 · {weekEn}</span>
                </button>
                <div className={`pixel-font ${styles.dateText}`} style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>
                    {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')} 第{weekNum}周
                </div>
                {showCalendar && (
                    <div onClick={(e) => e.stopPropagation()} style={{ 
                        position: 'absolute', top: '105%', left: '50%', transform: 'translateX(-50%)', 
                        backgroundColor: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
                        zIndex: 9999, minWidth: 220 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15 }}>◀</button>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{calendarYear}年{calendarMonth + 1}月</span>
                            <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15 }}>▶</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 5 }}>
                            {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                                <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#666' }}>{day}</div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>{renderCalendar()}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

