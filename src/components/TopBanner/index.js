import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';

// 工具函数
const getAvatarUrl = (user, base) => {
    if (!user) return `${base}avatar.png`;
    const avatar = user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url;
    return avatar && avatar.startsWith('http') ? avatar : `${base}avatar.png`;
};

const getUserName = (user) => {
    if (!user) return "用户";
    return (
        user.user_metadata?.full_name ||
        user.user_metadata?.preferred_username ||
        user.raw_user_meta_data?.name ||
        user.email ||
        "用户"
    );
};

export default function TopBanner({
    siteData,
    base,
    user,
    loading,
    isSessionChecked,
    userCount,
    latestUser,
    now,
    handleGitHubLogin,
    handleSignOut
}) {
    const weekJp = siteData.texts.weekJp[now.getDay()];
    const weekEn = siteData.texts.weekEn[now.getDay()];

    return (
        <section
            className={styles.topBannerWrap}
            style={{
                backgroundColor: '#f8f9fa',
                backgroundImage: `url(${base}img/bg_big.webp)`,
                backgroundSize: '100% auto',
                backgroundPosition: 'center top',
                backgroundRepeat: 'no-repeat',
                padding: '25px 15px',
                width: '100%',
                overflow: 'hidden',
            }}
        >
            <div className={styles.topRow} style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* 左侧公告 */}
                <div className={styles.topCol}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        height: '100%',
                    }}>
                        <span style={{ fontSize: 24 }}>📢</span>
                        <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                            {siteData.texts.announcement}
                        </p>
                    </div>
                </div>

                {/* 中间统计+时钟 */}
                <div className={styles.topCol} style={{ flex: 2, minWidth: 400 }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '100%'
                    }}>
                        {/* 统计数据 */}
                        <div style={{
                            display: 'flex',
                            gap: 15,
                            flexWrap: 'wrap',
                            minHeight: '60px',
                            alignItems: 'center',
                        }}>
                            {isSessionChecked ? (
                                siteData.stats.map((item, i) => {
                                    let showValue = item.value;
                                    if (item.label === "会") showValue = `会员:${userCount}`;
                                    if (item.label === "新") showValue = `最新:${latestUser}`;

                                    return (
                                        <div key={i} style={{ textAlign: 'center', minWidth: 40 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(0,0,0,0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 6px',
                                            }}>
                                                <span style={{ fontSize: 20, fontWeight: 'bold' }}>{item.label}</span>
                                            </div>
                                            <p style={{ color: item.color, fontSize: 11, margin: 0, textAlign: 'center' }}>
                                                {showValue}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} style={{ textAlign: 'center', minWidth: 40, opacity: 0.5 }}>
                                        <div style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            margin: '0 auto 6px',
                                        }} />
                                        <div style={{
                                            width: 40,
                                            height: 12,
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            borderRadius: 4,
                                        }} />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 时钟 */}
                        <div className={styles.bannerRight} style={{
                            padding: 0,
                            backgroundColor: 'transparent',
                            backdropFilter: 'none',
                            textAlign: 'right',
                            minWidth: 160
                        }}>
                            <div className={styles.clockText} style={{
                                fontSize: 24,
                                color: '#333',
                                marginBottom: 4,
                                textShadow: 'none',
                            }}>
                                {now.toLocaleTimeString()}
                            </div>
                            <div className={styles.dateText} style={{
                                fontSize: 14,
                                color: '#666',
                                marginBottom: 4,
                            }}>
                                {weekJp}曜日 ({weekEn})
                            </div>
                            <div className={styles.dateText} style={{
                                fontSize: 16,
                                color: '#333',
                                textShadow: 'none',
                            }}>
                                {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧登录/用户信息 */}
                <div className={styles.topCol}>
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
                                width="50"
                                height="50"
                                loading="lazy"
                                onError={(e) => e.target.src = `${base}avatar.png`}
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                                {getUserName(user)}
                            </span>
                            <Link
                                to="/pblot/profile"
                                className={styles.btnHover}
                                aria-label="进入个人中心"
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    backgroundColor: '#4285f4',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    minWidth: 48,
                                    minHeight: 48,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {siteData.texts.buttons.profile}
                            </Link>
                            <button
                                className={styles.btnHover}
                                onClick={handleSignOut}
                                aria-label="退出当前账号"
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    backgroundColor: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    minWidth: 48,
                                    minHeight: 48,
                                }}
                            >
                                {siteData.texts.buttons.logout}
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
                                width="50"
                                height="50"
                                loading="lazy"
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                }}
                            />
                            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                <Link
                                    to="/pblot/login"
                                    className={styles.btnHover}
                                    aria-label="登录账号"
                                    style={{
                                        flex: 1,
                                        padding: '6px 12px',
                                        background: '#4285f4',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        minWidth: 48,
                                        minHeight: 48,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {siteData.texts.buttons.login}
                                </Link>
                                <Link
                                    to="/pblot/register"
                                    className={styles.btnHover}
                                    aria-label="注册新账号"
                                    style={{
                                        flex: 1,
                                        padding: '6px 12px',
                                        background: '#999',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        minWidth: 48,
                                        minHeight: 48,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {siteData.texts.buttons.register}
                                </Link>
                            </div>
                            <button
                                className={styles.btnHover}
                                onClick={handleGitHubLogin}
                                disabled={loading}
                                aria-label="使用GitHub账号登录"
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 14,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: loading ? 0.7 : 1,
                                    minWidth: 48,
                                    minHeight: 48,
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                {loading ? siteData.texts.buttons.logging : siteData.texts.buttons.githubLogin}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}