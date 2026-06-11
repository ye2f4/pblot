import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase, AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE } from '../../supabase/supabaseClient';
import { isBrowser } from '../../utils/env';
import { storage } from '../../utils/storage';
import MiddleStatsCard from '../MiddleStatsCard';

const SCROLL_MODE = false;

const getUserName = (user = null) => {
  if (!user || !user.user_metadata) return "用户";
  return (
    user.user_metadata.full_name ||
    user.user_metadata.preferred_username ||
    user.raw_user_meta_data?.name ||
    user.email ||
    "用户"
  );
};

// ========== 1. 函数参数明确接收 timeEpoch、locationName ==========
export default function TopBanner({
  siteData = {},
  base = '',
  user = null,
  loading = false,
  signOutLoading = false,
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  now = new Date(),
  handleGitHubLogin = () => { },
  handleSignOut = () => { },
  // 时钟参数，带默认兜底
  timeEpoch = Math.floor(Date.now() / 1000),
  locationName = "北京"
}) {
  console.log("【TopBanner中间层】接收 timeEpoch =", timeEpoch, "城市 =", locationName);
  const noticeRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const announcement = siteData?.texts?.announcement || '本站持续更新技术教程和资源分享';
  const [avatarEmoji, setAvatarEmoji] = useState('');

  useEffect(() => {
    if (!isBrowser || !supabase.auth) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isBrowser || !user) {
      setAvatarEmoji('');
      return;
    }
    const userId = user.id;
    const fetchUserAvatar = async () => {
      const cacheStr = storage.get(AVATAR_CACHE_KEY);
      let cachedAvatar = '';
      let cacheValid = false;
      if (cacheStr) {
        try {
          const cacheData = JSON.parse(cacheStr);
          if (cacheData.userId === userId && Date.now() - cacheData.timestamp < AVATAR_CACHE_EXPIRE) {
            cachedAvatar = cacheData.avatar;
            cacheValid = true;
          }
        } catch (e) {
          storage.remove(AVATAR_CACHE_KEY);
        }
      }
      if (cacheValid) {
        setAvatarEmoji(cachedAvatar);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();
        if (error) {
          if (error.code === 'PGRST116') {
            setAvatarEmoji('');
            return;
          }
          throw error;
        }
        const avatar = data?.avatar_url || '';
        setAvatarEmoji(avatar);
        storage.set(AVATAR_CACHE_KEY, JSON.stringify({ userId, avatar, timestamp: Date.now() }));
      } catch (err) {
        console.warn("获取用户头像失败：", err);
        setAvatarEmoji('');
      }
    };
    fetchUserAvatar();
  }, [user]);

  useEffect(() => {
    if (!SCROLL_MODE || !noticeRef.current || !isBrowser) return;
    const rafId = requestAnimationFrame(() => {
      const noticeElement = noticeRef.current;
      const containerWidth = noticeElement.offsetWidth;
      const contentWidth = noticeElement.scrollWidth;
      if (contentWidth > containerWidth) {
        setIsScrolling(true);
        const duration = contentWidth * 0.03;
        noticeElement.style.animation = 'none';
        void noticeElement.offsetWidth;
        noticeElement.style.animation = `marquee ${duration}s linear infinite`;
      } else {
        setIsScrolling(false);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [SCROLL_MODE, announcement]);

  return (
    <section className={styles.topBannerWrap} style={{
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
    }}>
      <div className={styles.bannerGrid}>
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
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              {siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}
            </h3>
          </div>
          <div style={{ paddingLeft: 44, overflowY: 'auto', maxHeight: 60 }}>
            <p ref={noticeRef} style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              {announcement}
            </p>
          </div>
        </div>

        {/* ========== 2. 原样转发 props：timeEpoch、locationName ========== */}
        <MiddleStatsCard
          key={`${locationName}-${timeEpoch}`}
          timeEpoch={timeEpoch}
          locationName={locationName}
          siteData={siteData}
          isSessionChecked={isSessionChecked}
          userCount={userCount}
          latestUser={latestUser}
          now={now}
        />

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
                avatarEmoji.startsWith('http://') || avatarEmoji.startsWith('https://') ? (
                  <img
                    className={styles.avatarWrap}
                    src={avatarEmoji}
                    alt="用户头像"
                    width="50"
                    height="50"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `${base}avatar.png`;
                    }}
                  />
                ) : (
                  <div className={styles.avatarWrap}>
                    {avatarEmoji}
                  </div>
                )
              ) : (
                <img
                  className={styles.avatarWrap}
                  src={`${base}avatar.png`}
                  alt="默认头像"
                  width="50"
                  height="50"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `${base}avatar.png`;
                  }}
                />
              )}

              <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                {getUserName(user)}
              </span>

              <Link
                to="/profile"
                className="btn-hover"
                style={{
                  width: '100%', padding: '7px 14px', backgroundColor: '#4285f4',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, minHeight: 42, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {siteData?.texts?.buttons?.profile || '个人中心'}
              </Link>

              <button
                onClick={handleSignOut}
                disabled={signOutLoading}
                className="btn-hover"
                style={{
                  width: '100%', padding: '7px 14px', backgroundColor: '#dc3545',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, minHeight: 42,
                  opacity: signOutLoading ? 0.7 : 1
                }}
              >
                {signOutLoading ? "退出中..." : (siteData?.texts?.buttons?.logout || '退出登录')}
              </button>
            </>
          ) : (
            <>
              <img
                className={styles.avatarWrap}
                src={`${base}avatar.png`}
                alt="默认头像"
                width="50"
                height="50"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `${base}avatar.png`;
                }}
              />
              <div style={{ display: 'flex', gap: 7, width: '100%' }}>
                <Link to="/login" className="btn-hover" style={{
                  flex: 1, padding: '7px 14px', background: '#4285f4',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, minHeight: 42, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {siteData?.texts?.buttons?.login || '登录'}
                </Link>
                <Link to="/register" className="btn-hover" style={{
                  flex: 1, padding: '7px 14px', background: '#999',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, minHeight: 42, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {siteData?.texts?.buttons?.register || '注册'}
                </Link>
              </div>
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="btn-hover"
                style={{
                  width: '100%', padding: '7px 14px', backgroundColor: '#333',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, opacity: loading ? 0.7 : 1, minHeight: 42,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                }}
              >
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