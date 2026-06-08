import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

// 工具函数（头像改回PNG）
const getAvatarUrl = (user = null, base = '') => {
    if (!user) return `${base}avatar.png`;
    const avatar = user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url;
    return avatar && avatar.startsWith('http') ? avatar : `${base}avatar.png`;
};

const getUserName = (user = null) => {
    if (!user) return "用户";
    return (
        user.user_metadata?.full_name ||
        user.user_metadata?.preferred_username ||
        user.raw_user_meta_data?.name ||
        user.email ||
        "用户"
    );
};

// 统计项配色（保留你的原有颜色）
const statColors = [
    { bg: 'linear-gradient(135deg, #4285f4 0%, #1976d2 100%)', shadow: 'rgba(66, 133, 244, 0.3)' }, // 今-蓝
    { bg: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', shadow: 'rgba(156, 39, 176, 0.3)' }, // 昨-紫
    { bg: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', shadow: 'rgba(76, 175, 80, 0.3)' }, // 总-绿
    { bg: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', shadow: 'rgba(255, 152, 0, 0.3)' }, // 会-橙
    { bg: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', shadow: 'rgba(244, 67, 54, 0.3)' }, // 新-红
];

// 日历工具函数
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

export default function TopBanner({
    siteData = {},
    base = '',
    user = null,
    loading = false,
    isSessionChecked = false,
    userCount = 0,
    latestUser = '无',
    now = new Date(),
    handleGitHubLogin = () => { },
    handleSignOut = () => { }
}) {
    const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '火';
    const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || 'Tuesday';

    // 日历状态
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();

    // 生成日历格子
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
        const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
        const days = [];

        // 填充上月空白
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ opacity: 0.3 }}></div>);
        }

        // 填充当月日期
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === now.getDate() && calendarMonth === now.getMonth() && calendarYear === now.getFullYear();
            days.push(
                <div
                    key={day}
                    style={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: isToday ? '#4285f4' : 'transparent',
                        color: isToday ? '#fff' : '#333',
                        fontWeight: isToday ? 600 : 400
                    }}
                >
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
                height: '240px',
                position: 'relative'
            }}
            onClick={() => showCalendar && setShowCalendar(false)}
        >
            <div className={styles.topRow}>
                {/* ========== 左侧公告（保持不变） ========== */}
                <div className={styles.topCol} style={{ flex: 1.2, animationDelay: '0.1s' }}>
                    <div style={{
                        height: '100%',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.9) 100%)',
                        backdropFilter: 'blur(8px)',
                        borderLeft: '5px solid #4285f4',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        animation: 'breathe 4s infinite ease-in-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 8
                        }}>
                            <span style={{ fontSize: 32, animation: 'pixelBounce 2s infinite' }}>📢</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                                {siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}
                            </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6, paddingLeft: 44 }}>
                            {siteData?.texts?.announcement || '本站持续更新技术教程和资源分享，记得常来看看哦~'}
                        </p>
                    </div>
                </div>

                {/* ========== 中间：奥运五环式统计 + 可点击日历时钟 ========== */}
                <div className={styles.topCol} style={{ flex: 2.6, minWidth: 500, animationDelay: '0.2s' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '100%',
                        gap: 24
                    }}>
                        {/* ✅ 奥运五环式统计排列（上3下2，居中交错） */}
                        <div style={{
                            display: 'flex',
                            gap: '16px 24px',
                            flexWrap: 'wrap',
                            minHeight: '80px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 3,
                            maxWidth: 300
                        }}>
                            {isSessionChecked ? (
                                (siteData?.stats || []).map((item, i) => {
                                    let showValue = item.value;
                                    if (item.label === "会") showValue = userCount;
                                    if (item.label === "新") showValue = latestUser;
                                    const color = statColors[i] || statColors[0];

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                textAlign: 'center',
                                                minWidth: 56,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                animation: `fadeIn 0.6s ease-out ${0.3 + i * 0.1}s`
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px) scale(1.08)';
                                                e.currentTarget.style.filter = 'brightness(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                e.currentTarget.style.filter = 'brightness(1)';
                                            }}
                                        >
                                            <div style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '50%',
                                                background: color.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 6px',
                                                boxShadow: `0 4px 12px ${color.shadow}`
                                            }}>
                                                <span style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, margin: 0, textAlign: 'center', fontWeight: 600, color: '#333' }}>
                                                {item.label === "会" ? '会员' : item.label === "新" ? '最新' : item.label}
                                            </p>
                                            <p style={{ fontSize: 14, margin: '2px 0 0 0', textAlign: 'center', fontWeight: 700, color: color.bg.includes('f44336') ? '#f44336' : '#4285f4' }}>
                                                {showValue}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} style={{ textAlign: 'center', minWidth: 56, opacity: 0.5 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', margin: '0 auto 6px' }} />
                                        <div style={{ width: 40, height: 12, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto 4px' }} />
                                        <div style={{ width: 32, height: 14, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, margin: '0 auto' }} />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ✅ 缩小字体 + 可点击日历按钮 + 弹窗 */}
                        <div style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            textAlign: 'center',
                            minWidth: 180,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            flex: 2,
                            position: 'relative'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                marginBottom: 8
                            }}>
                                <span style={{ fontSize: 20 }}>⏰</span>
                                {/* 缩小字体防止溢出 */}
                                <div className={`pixel-font ${styles.clockText}`} style={{
                                    fontSize: 22,
                                    color: '#1a1a1a',
                                    letterSpacing: 4,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    animation: 'digitPulse 1s infinite'
                                }}>
                                    {now.toLocaleTimeString()}
                                </div>
                            </div>

                            {/* ✅ 日期行做成可点击按钮 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCalendar(!showCalendar);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    marginBottom: 6,
                                    padding: '4px 12px',
                                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                                    border: 'none',
                                    borderRadius: 20,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: 13,
                                    color: '#4285f4',
                                    fontWeight: 500
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.1)'}
                            >
                                <span style={{ fontSize: 14 }}>📅</span>
                                <span>{weekJp}曜日 · {weekEn}</span>
                            </button>

                            <div className={`pixel-font ${styles.dateText}`} style={{
                                fontSize: 16,
                                color: '#333',
                                fontWeight: 600,
                                letterSpacing: 2
                            }}>
                                {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')}
                            </div>

                            {/* ✅ 日历弹窗 */}
                            {showCalendar && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        top: '110%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#fff',
                                        borderRadius: 12,
                                        padding: 16,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                        minWidth: 240
                                    }}
                                >
                                    {/* 日历头部 */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 12
                                    }}>
                                        <button
                                            onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
                                        >
                                            ◀
                                        </button>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                                            {calendarYear}年{calendarMonth + 1}月
                                        </span>
                                        <button
                                            onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
                                        >
                                            ▶
                                        </button>
                                    </div>

                                    {/* 星期表头 */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: 2,
                                        marginBottom: 8
                                    }}>
                                        {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                                            <div key={i} style={{
                                                textAlign: 'center',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#666'
                                            }}>
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* 日期格子 */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: 2
                                    }}>
                                        {renderCalendar()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ========== 右侧用户栏（头像改回PNG） ========== */}
                <div className={styles.topCol} style={{ flex: 1.2, animationDelay: '0.3s' }}>
                    {user ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                            height: '100%',
                            justifyContent: 'center'
                        }}>
                            <img
                                src={getAvatarUrl(user, base)}
                                alt={getUserName(user)}
                                width="56"
                                height="56"
                                loading="lazy"
                                {/* 头像改回PNG */}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `${base}avatar.png`;
                                }}
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    transition: 'all 0.5s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'rotate(360deg) scale(1.15)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'rotate(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                            />
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>
                                {getUserName(user)}
                            </span>
                            <Link
                                to="/pblot/profile"
                                className="btn-hover"
                                style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    backgroundColor: '#4285f4',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    minWidth: 48,
                                    minHeight: 48,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {siteData?.texts?.buttons?.profile || '个人中心'}
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="btn-hover"
                                style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    backgroundColor: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    minWidth: 48,
                                    minHeight: 48,
                                }}
                            >
                                {siteData?.texts?.buttons?.logout || '退出登录'}
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                            height: '100%',
                            justifyContent: 'center'
                        }}>
                            <img
                                src={`${base}avatar.png`}
                                alt="默认头像"
                                width="56"
                                height="56"
                                loading="lazy"
                                {/* 头像改回PNG */}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `${base}avatar.png`;
                                }}
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    transition: 'all 0.5s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'rotate(360deg) scale(1.15)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'rotate(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                            />
                            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                <Link
                                    to="/pblot/login"
                                    className="btn-hover"
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        background: '#4285f4',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        minWidth: 48,
                                        minHeight: 48,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {siteData?.texts?.buttons?.login || '登录'}
                                </Link>
                                <Link
                                    to="/pblot/register"
                                    className="btn-hover"
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        background: '#999',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        minWidth: 48,
                                        minHeight: 48,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {siteData?.texts?.buttons?.register || '注册'}
                                </Link>
                            </div>
                            <button
                                onClick={handleGitHubLogin}
                                disabled={loading}
                                className="btn-hover"
                                style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    opacity: loading ? 0.7 : 1,
                                    minWidth: 48,
                                    minHeight: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
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