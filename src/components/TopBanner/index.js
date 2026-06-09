import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';
// 导入我们刚分离的中间卡片组件
import MiddleStatsCard from '../MiddleStatsCard';

const SCROLL_MODE = false;

const getUserName = (user = null) => {
    if (!user) return "用户";
    return user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.raw_user_meta_data?.name || user.email || "用户";
};

export default function TopBanner({
    siteData = {}, base = '', user: propUser = null, loading = false, isSessionChecked = false,
    userCount = 0, latestUser = '新用户', now = new Date(), handleGitHubLogin = () => { }, handleSignOut = () => { }
}) {
    const noticeRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const announcement = siteData?.texts?.announcement || '本站持续更新技术教程和资源分享';

    const [avatarEmoji, setAvatarEmoji] = useState('');
    const [user, setUser] = useState(propUser);

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

    return (
        <section
            className={styles.topBannerWrap}
            style={{
                boxSizing: 'border-box',
                backgroundImage: `url(${base}img/bg_big.webp)`,
                padding: '24px',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                borderRadius: '24px',
                margin: '16px auto',
                width: '100%',
                maxWidth: '1200px',
            }}
        >
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr',
                gap: '20px',
                width: '100%',
                alignItems: 'stretch',
                '@media (max-width: 992px)': {
                    gridTemplateColumns: '1fr',
                }
            }}>
                {/* 左侧公告卡片 */}
                <div style={{
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.9) 100%)',
                    backdropFilter: 'blur(8px)',
                    borderLeft: '5px solid #f4bc42',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    padding: '18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 32, animation: 'pixelBounce 2s infinite' }}>📢</span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}</h3>
                    </div>
                    <div style={{ paddingLeft: 44, overflowY: 'auto', maxHeight: 60 }}>
                        <p ref={noticeRef} style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6 }}>{announcement}</p>
                    </div>
                </div>

                {/* 中间：直接使用分离后的组件 */}
                <MiddleStatsCard
                    siteData={siteData}
                    isSessionChecked={isSessionChecked}
                    userCount={userCount}
                    latestUser={latestUser}
                    now={now}
                />

                {/* 右侧登录面板 */}
                <div style={{
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                }}>
                    {user ? (
                        <>
                            {avatarEmoji ? (
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }}>
                                    {avatarEmoji}
                                </div>
                            ) : (
                                <img src={`${base}avatar.png`} alt="默认头像" width="50" height="50" loading="lazy"
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.png`; }}
                                    style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }} />
                            )}
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{getUserName(user)}</span>
                            <Link to="/pblot/profile" className="btn-hover" style={{ 
                                width: '100%', padding: '7px 14px', backgroundColor: '#4285f4', 
                                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, 
                                fontWeight: 500, minHeight: 42, textDecoration: 'none', 
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                {siteData?.texts?.buttons?.profile || '个人中心'}
                            </Link>
                            <button onClick={handleSignOut} className="btn-hover" style={{ 
                                width: '100%', padding: '7px 14px', backgroundColor: '#dc3545', 
                                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, 
                                fontWeight: 500, minHeight: 42 
                            }}>
                                {siteData?.texts?.buttons?.logout || '退出登录'}
                            </button>
                        </>
                    ) : (
                        <>
                            <img src={`${base}avatar.png`} alt="默认头像" width="50" height="50" loading="lazy"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.png`; }}
                                style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }} />
                            <div style={{ display: 'flex', gap: 7, width: '100%' }}>
                                <Link to="/pblot/login" className="btn-hover" style={{ 
                                    flex: 1, padding: '7px 14px', background: '#4285f4', 
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, 
                                    fontWeight: 500, minHeight: 42, textDecoration: 'none', 
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {siteData?.texts?.buttons?.login || '登录'}
                                </Link>
                                <Link to="/pblot/register" className="btn-hover" style={{ 
                                    flex: 1, padding: '7px 14px', background: '#999', 
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, 
                                    fontWeight: 500, minHeight: 42, textDecoration: 'none', 
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {siteData?.texts?.buttons?.register || '注册'}
                                </Link>
                            </div>
                            <button onClick={handleGitHubLogin} disabled={loading} className="btn-hover" style={{ 
                                width: '100%', padding: '7px 14px', backgroundColor: '#333', 
                                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, 
                                fontWeight: 500, opacity: loading ? 0.7 : 1, minHeight: 42, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 
                            }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                {loading ? (siteData?.texts?.buttons?.logging || '登录中...') : (siteData?.texts?.buttons?.githubLogin || 'GitHub登录')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}