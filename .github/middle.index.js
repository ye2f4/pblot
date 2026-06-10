import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
// 导入分离后的像素时钟组件
import PixelClock from '../PixelClock';

const statColors = [
    { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', shadow: 'rgba(59, 130, 246, 0.25)' }, // 今 - 清新蓝
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(124, 58, 237, 0.25)' }, // 昨 - 优雅紫
    { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', shadow: 'rgba(16, 185, 129, 0.25)' }, // 总 - 自然绿
    { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', shadow: 'rgba(245, 158, 11, 0.25)' }, // 会 - 温暖橙
    { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', shadow: 'rgba(236, 72, 153, 0.25)' } // 新 - 柔粉
];

// 周数计算工具函数（保留在这里，因为TopBanner也需要）
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
    // 访问统计状态
    const [visitStats, setVisitStats] = useState({
        online: 0,
        today: 0,
        total: 0
    });

    // 计算时间相关参数（传递给时钟组件）
    const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '水';
    const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Wednesday';
    const weekNum = getWeekNumber(now);

    // 访问统计更新逻辑
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
        onClick={(e) => e.stopPropagation()}
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

            {/* 右侧：独立像素时钟组件 */}
            <PixelClock
                now={now}
                weekJp={weekJp}
                weekEn={weekEn}
                weekNum={weekNum}
            />
        </div>
    );
}

