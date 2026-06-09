import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

const statColors = [
    { bg: 'linear-gradient(135deg, #4285f4 0%, #1976d2 100%)', shadow: 'rgba(66, 133, 244, 0.3)' },
    { bg: 'linear-gradient(135deg, #433b3b 0%, #433b3b 100%)', shadow: 'rgba(156, 39, 176, 0.3)' },
    { bg: 'linear-gradient(135deg, #58ac5b 0%, #58ac5b 100%)', shadow: 'rgba(76, 175, 80, 0.3)' },
    { bg: 'linear-gradient(135deg, #fbd900 0%, #fbd900 100%)', shadow: 'rgba(255, 152, 0, 0.3)' },
    { bg: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', shadow: 'rgba(244, 67, 54, 0.3)' },
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const getWeekNumber = (d) => {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const SCROLL_MODE = false;
const CARD_CONFIGS = {
    left: { flex: 1.2, width: 'auto', height: '100px', minWidth: '200px', minHeight: 'unset', borderRadius: '18px' },
    middle: { flex: 2.6, width: 'auto', height: '100px', minWidth: '200px', minHeight: 'unset', borderRadius: '18px' },
    right: { flex: 1.2, width: 'auto', height: '100px', minWidth: '200px', minHeight: 'unset', borderRadius: '18px' }
};

const getUserName = (user = null) => {
    if (!user) return "用户";
    return user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.raw_user_meta_data?.name || user.email || "用户";
};

export default function TopBanner({
    siteData = {}, base = '', user: propUser = null, loading = false, isSessionChecked = false,
    userCount = 0, latestUser = '新用户', now = new Date(), handleGitHubLogin = () => { }, handleSignOut = () => { }
}) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();

    const noticeRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const announcement = siteData?.texts?.announcement || '本站持续更新技术教程和资源分享';

    const [avatarEmoji, setAvatarEmoji] = useState('');
    const [user, setUser] = useState(propUser);

    // 从父组件接收网络时间
    const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '火';
    const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Tuesday';
    const weekNum = getWeekNumber(now);

    // 监听登录状态
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);

    // 读取用户头像
    useEffect(() => {
        const fetchUserAvatar = async () => {
            if (!user) { setAvatarEmoji(''); return; }
            try {
                const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
                setAvatarEmoji(data?.avatar_url || '');
            } catch (err) {
                setAvatarEmoji('');
            }
        };
        fetchUserAvatar();
    }, [user]);

    // 公告滚动逻辑
    useEffect(() => {
        if (!SCROLL_MODE || !noticeRef.current) return;
        const noticeElement = noticeRef.current;
        const containerWidth = noticeElement.offsetWidth;
        const contentWidth = noticeElement.scrollWidth;
        if (contentWidth > containerWidth) {
            setIsScrolling(true);
            const duration = contentWidth * 0.03;
            noticeElement.style.animation = 'none';
            void noticeElement.offsetWidth;
            noticeElement.style.animation = `marquee ${duration}s linear infinite`;
        } else setIsScrolling(false);
    }, [SCROLL_MODE, announcement]);

    // 日历渲染
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
        <section
            className={styles.topBannerWrap}
            style={{
                backgroundImage: `url(${base}img/bg_big.webp)`,
                height: '280px',
                position: 'relative',
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                backgroundRepeat: 'no-repeat'
            }}
            onClick={() => showCalendar && setShowCalendar(false)}
        >
            <div className={styles.topRow} style={{ display: 'flex', gap: '20px', height: '100%' }}>
                {/* 左侧公告卡片 */}
                <div className={styles.topCol} style={{ flex: CARD_CONFIGS.left.flex, width: CARD_CONFIGS.left.width, minWidth: CARD_CONFIGS.left.minWidth, minHeight: CARD_CONFIGS.left.minHeight, borderRadius: CARD_CONFIGS.left.borderRadius, animationDelay: '0.1s', animation: 'breathe 4s infinite ease-in-out' }}>
                    <div style={{ height: '100%', padding: '18px 22px', borderRadius: CARD_CONFIGS.left.borderRadius, background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.9) 100%)', backdropFilter: 'blur(8px)', borderLeft: '5px solid #f4bc42', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: 32, animation: 'pixelBounce 2s infinite' }}>📢</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}</h3>
                        </div>
                        {SCROLL_MODE ? (
                            <div style={{ paddingLeft: 44, overflow: 'hidden', position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
                                <p ref={noticeRef} style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6, whiteSpace: 'nowrap', position: 'absolute', animation: isScrolling ? 'marquee linear infinite' : 'none' }}>{announcement}</p>
                            </div>
                        ) : (
                            <div style={{ paddingLeft: 44, overflowY: 'auto', maxHeight: 60, scrollbarWidth: 'thin', scrollbarColor: '#4285f4 rgba(0,0,0,0.05)' }}>
                                <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6 }}>{announcement}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 中间统计 + 时钟区域 */}
                <div className={styles.topCol} style={{ flex: CARD_CONFIGS.middle.flex, width: CARD_CONFIGS.middle.width, minWidth: CARD_CONFIGS.middle.minWidth, minHeight: CARD_CONFIGS.middle.minHeight, borderRadius: CARD_CONFIGS.middle.borderRadius, animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: 24 }}>
                        <div style={{ display: 'flex', gap: '16px 24px', flexWrap: 'wrap', minHeight: '80px', alignItems: 'center', justifyContent: 'center', flex: 3, maxWidth: 300 }}>
                            {isSessionChecked ? (siteData?.stats || []).map((item, i) => {
                                let showValue = item.value;
                                if (item.label === "会") showValue = userCount;
                                if (item.label === "新") {
                                    showValue = latestUser && latestUser.trim() !== '' ? latestUser : '新用户';
                                }
                                const color = statColors[i] || statColors[0];
                                return (
                                    <div key={i} style={{ textAlign: 'center', minWidth: 56, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeIn 0.6s ease-out ${0.3 + i * 0.1}s` }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.08)'; e.currentTarget.style.filter = 'brightness(1.1)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.filter = 'brightness(1)' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', boxShadow: `0 4px 12px ${color.shadow}` }}>
                                            <span style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{item.label}</span>
                                        </div>
                                        <p style={{ fontSize: 12, margin: 0, textAlign: 'center', fontWeight: 600, color: '#333' }}>{item.label === "会" ? '会员' : item.label === "新" ? '最新' : item.label}</p>
                                        <p style={{ fontSize: 14, margin: '2px 0 0 0', textAlign: 'center', fontWeight: 700, color: color.bg.includes('f44336') ? '#f44336' : '#4285f4' }}>{showValue}</p>
                                    </div>
                                );
                            }) : (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} style={{ textAlign: 'center', minWidth: 56, opacity: 0.5 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', margin: '0 auto 6px' }} />
                                        <div style={{ width: 40, height: 12, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto 4px' }} />
                                        <div style={{ width: 32, height: 14, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto' }} />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 时钟卡片（纯展示网络时间） */}
                        <div style={{ width: "250px", height: "200px", padding: "16px 20px", background: "rgba(75, 157, 205, 0.9)", borderRadius: "16px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", position: "relative" }}>
                            <p style={{ margin: '0 0 6px 0', fontSize: 18, color: '#1ce306', fontWeight: 500 }}>标准北京时间</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 20 }}>⏰</span>
                                <div className={`pixel-font ${styles.clockText}`} style={{ fontSize: 22, color: '#1a1a1a', letterSpacing: 4, textShadow: '0 1px 2px rgba(0,0,0,0.1)', animation: 'digitPulse 1s infinite' }}>
                                    {now.toLocaleTimeString()}
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto 6px auto', padding: '4px 12px', backgroundColor: 'rgba(66, 133, 244, 0.1)', border: 'none', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s ease', fontSize: 13, color: '#0060fc', fontWeight: 500 }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.1)'}>
                                <span style={{ fontSize: 14 }}>📅</span>
                                <span>{weekJp}曜日 · {weekEn}</span>
                            </button>
                            <div className={`pixel-font ${styles.dateText}`} style={{ fontSize: 16, color: '#333', fontWeight: 600, letterSpacing: 2 }}>
                                {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')} 第{weekNum}周
                            </div>
                            {showCalendar && (
                                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: 240 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>◀</button>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{calendarYear}年{calendarMonth + 1}月</span>
                                        <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>▶</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
                                        {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                                            <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666' }}>{day}</div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>{renderCalendar()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右侧登录面板 */}
                <div className={styles.topCol} style={{ flex: CARD_CONFIGS.right.flex, width: CARD_CONFIGS.right.width, minWidth: CARD_CONFIGS.right.minWidth, minHeight: CARD_CONFIGS.right.minHeight, borderRadius: CARD_CONFIGS.right.borderRadius, animationDelay: '0.3s' }}>
                    {user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', justifyContent: 'center' }}>
                            {avatarEmoji ? (
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.15)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }}>
                                    {avatarEmoji}
                                </div>
                            ) : (
                                <img src={`${base}avatar.png`} alt="默认头像" width="56" height="56" loading="lazy"
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.png`; }}
                                    style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.15)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }} />
                            )}
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{getUserName(user)}</span>
                            <Link to="/pblot/profile" className="btn-hover" style={{ width: '100%', padding: '8px 16px', backgroundColor: '#4285f4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {siteData?.texts?.buttons?.profile || '个人中心'}
                            </Link>
                            <button onClick={handleSignOut} className="btn-hover" style={{ width: '100%', padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, minWidth: 48, minHeight: 48 }}>
                                {siteData?.texts?.buttons?.logout || '退出登录'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', justifyContent: 'center' }}>
                            <img src={`${base}avatar.png`} alt="默认头像" width="56" height="56" loading="lazy"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.png`; }}
                                style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.15)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }} />
                            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                <Link to="/pblot/login" className="btn-hover" style={{ flex: 1, padding: '8px 16px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {siteData?.texts?.buttons?.login || '登录'}
                                </Link>
                                <Link to="/pblot/register" className="btn-hover" style={{ flex: 1, padding: '8px 16px', background: '#999', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {siteData?.texts?.buttons?.register || '注册'}
                                </Link>
                            </div>
                            <button onClick={handleGitHubLogin} disabled={loading} className="btn-hover" style={{ width: '100%', padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, opacity: loading ? 0.7 : 1, minWidth: 48, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                {loading ? (siteData?.texts?.buttons?.logging || '登录中...') : (siteData?.texts?.buttons?.githubLogin || 'GitHub登录')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}