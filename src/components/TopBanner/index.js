import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase, AVATAR_CACHE_EXPIRE } from '../../supabase/supabaseClient';
import { isBrowser } from '../../utils/env';
import { storage } from '../../utils/storage';
import MiddleStatsCard from '../MiddleStatsCard';
import { triggerGlobalProfileRefresh, AVATAR_CACHE_KEY } from '../../utils/globalProfileUtil';

const SCROLL_MODE = false;

// 登录主题色配置
const loginTheme = {
  primaryBg: '#509feb', primaryHoverBg: '#3e8cd8',
  bilibiliBg: '#fa78a0', githubBg: '#272b30', githubHoverBg: '#373c42',
  logoutBg: '#f53f3f', logoutHoverBg: '#d32f2f',
};

// 优先读取数据库 nickname，兜底授权信息
const getUserName = (user = null, nickName = '') => {
  if (nickName && nickName.trim()) return nickName.trim();
  if (!user || !user.user_metadata) return "用户";
  return (
    user.user_metadata.full_name ||
    user.user_metadata.preferred_username ||
    user.raw_user_meta_data?.name ||
    user.email ||
    "用户"
  );
};

// 头像渲染函数
const renderUserAvatar = (avatarEmoji) => {
  if (!avatarEmoji) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, #e8f4ff, #d1eaff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}>
        😊
      </div>
    );
  }
  if (avatarEmoji.startsWith('http')) {
    return (
      <img
        src={avatarEmoji}
        alt="头像"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}
        onError={(e) => e.target.style.display = 'none'}
      />
    );
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'linear-gradient(135deg, #e8f4ff, #d1eaff)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      {avatarEmoji}
    </div>
  );
};

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
  timeEpoch = Math.floor(Date.now() / 1000),
  locationName = "Beijing",
  timeZoneOffset = 0,
  timeZone = ""
}) {
  const noticeRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const announcement = siteData?.texts?.announcement || '本站持续更新技术教程和资源分享';
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [dbNickname, setDbNickname] = useState('');

  // 挂载全局刷新方法
  window.refreshUserProfile = async () => {
    await triggerGlobalProfileRefresh();
  };

  // 从数据库拉取最新头像、昵称
  const fetchUserProfileData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url,nickname')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const avatar = data?.avatar_url || '';
      const nick = data?.nickname || '';
      setAvatarEmoji(avatar);
      setDbNickname(nick);

      // 写入本地缓存
      storage.set(AVATAR_CACHE_KEY, JSON.stringify({
        userId,
        avatar,
        nickname: nick,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn("TopBanner 刷新资料失败：", err);
    }
  };

  // 初始化用户资料 + 全局监听
  useEffect(() => {
    if (!isBrowser || !user) {
      setAvatarEmoji('');
      setDbNickname('');
      return;
    }

    const userId = user.id;

    // 清理过期/不匹配缓存
    const cacheStr = storage.get(AVATAR_CACHE_KEY);
    if (cacheStr) {
      try {
        const cacheData = JSON.parse(cacheStr);
        if (!cacheData.nickname || cacheData.userId !== userId) {
          storage.remove(AVATAR_CACHE_KEY);
        }
      } catch (e) {
        storage.remove(AVATAR_CACHE_KEY);
      }
    }

    // 读取有效缓存
    const newCacheStr = storage.get(AVATAR_CACHE_KEY);
    let validCache = null;
    if (newCacheStr) {
      const cacheData = JSON.parse(newCacheStr);
      if (cacheData.userId === userId && Date.now() - cacheData.timestamp < AVATAR_CACHE_EXPIRE) {
        validCache = cacheData;
      }
    }

    if (validCache) {
      setAvatarEmoji(validCache.avatar || '');
      setDbNickname(validCache.nickname || '');
    } else {
      fetchUserProfileData(userId);
    }

    // 监听全局资料更新事件
    const onProfileUpdate = (ev) => {
      const data = ev.detail;
      if (data.id !== user.id) return;
      setAvatarEmoji(data.avatar_url);
      setDbNickname(data.nickname);

      // 同步更新缓存
      storage.set(AVATAR_CACHE_KEY, JSON.stringify({
        userId: user.id,
        avatar: data.avatar_url,
        nickname: data.nickname,
        timestamp: Date.now()
      }));
    };

    window.addEventListener('globalProfileUpdated', onProfileUpdate);

    return () => {
      window.removeEventListener('globalProfileUpdated', onProfileUpdate);
    };

  }, [user]);

  // 公告滚动逻辑
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
  }, [announcement]);

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

        <MiddleStatsCard
          key={`${locationName}-${timeEpoch}-${dbNickname}-${avatarEmoji}`}
          timeEpoch={timeEpoch}
          locationName={locationName}
          timeZoneOffset={timeZoneOffset}
          timeZone={timeZone}
          siteData={siteData}
          isSessionChecked={isSessionChecked}
          userCount={userCount}
          latestUser={latestUser}
          now={now}
          currentNickname={dbNickname}
          currentAvatar={avatarEmoji}
          user={user}
          style={{
            animation: 'heatPulse 3.2s ease-in-out infinite'
          }}
        />

        <div style={{
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 12
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#999' }}>加载中...</div>
          ) : !user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                {siteData?.texts?.visitorWelcome || '欢迎访客，登录解锁完整功能'}
              </div>

              {/* 登录、注册强制同一行，弹性均分 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link
                  to="/login"
                  style={{
                    flex: 1, textAlign: 'center',
                    background: siteData?.loginTheme?.primaryBg || loginTheme.primaryBg,
                    color: '#fff', border: 'none',
                    padding: '11px 16px', borderRadius: '12px',
                    textDecoration: 'none', fontSize: 14, fontWeight: 500,
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 8px rgba(80,159,235,0.22)'
                  }}
                  onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.primaryHoverBg || loginTheme.primaryHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(80,159,235,0.32)'; }}
                  onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.primaryBg || loginTheme.primaryBg; e.target.style.boxShadow = '0 2px 8px rgba(80,159,235,0.22)'; }}
                >
                  {siteData?.texts?.buttons?.login || '立即登录'}
                </Link>

                <Link
                  to="/register"
                  style={{
                    flex: 1, textAlign: 'center',
                    background: siteData?.loginTheme?.primaryBg || loginTheme.primaryBg,
                    color: '#fff', border: 'none',
                    padding: '11px 16px', borderRadius: '12px',
                    textDecoration: 'none', fontSize: 14, fontWeight: 500,
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 8px rgba(80,159,235,0.22)'
                  }}
                  onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.primaryHoverBg || loginTheme.primaryHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(80,159,235,0.32)'; }}
                  onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.primaryBg || loginTheme.primaryBg; e.target.style.boxShadow = '0 2px 8px rgba(80,159,235,0.22)'; }}
                >
                  {siteData?.texts?.buttons?.register || '立即注册'}
                </Link>
              </div>

              {/* B站按钮 */}
              <button
                disabled
                style={{
                  width: '100%', border: 'none',
                  background: siteData?.loginTheme?.bilibiliBg || loginTheme.bilibiliBg,
                  color: '#fff', padding: '11px 16px',
                  borderRadius: '12px', fontSize: 14, fontWeight: 500,
                  cursor: 'not-allowed', opacity: 0.92,
                  transition: 'all 0.25s ease',
                  boxShadow: '0 2px 8px rgba(250,120,160,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <span>📺</span>
                {siteData?.texts?.buttons?.bilibiliLogin || 'Bilibili 登录（开发中）'}
              </button>

              {/* GitHub登录 */}
              <button
                onClick={handleGitHubLogin}
                style={{
                  width: '100%', border: 'none',
                  background: siteData?.loginTheme?.githubBg || loginTheme.githubBg,
                  color: '#fff', padding: '11px 16px',
                  borderRadius: '12px', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.githubHoverBg || loginTheme.githubHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.20)'; }}
                onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.githubBg || loginTheme.githubBg; e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)'; }}
              >
                <span>🐱</span>
                {siteData?.texts?.buttons?.githubLogin || 'GitHub 登录'}
              </button>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#333' }}>
                {renderUserAvatar(avatarEmoji)}
                <span>{siteData?.texts?.welcomeBack || '👋 欢迎回来，'}<strong>{dbNickname || getUserName(user)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  to="/profile"
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    textAlign: 'center',
                    border: '1px solid #ccc',
                    padding: '9px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    color: '#333',
                    textDecoration: 'none',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = '#509feb'}
                  onMouseOut={(e) => e.target.style.borderColor = '#ccc'}
                >
                  {siteData?.texts?.buttons?.profile || '个人中心'}
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    border: 'none',
                    background: siteData?.loginTheme?.logoutBg || loginTheme.logoutBg,
                    color: '#fff',
                    padding: '9px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    cursor: signOutLoading ? 'not-allowed' : 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => { if (!signOutLoading) e.target.style.background = siteData?.loginTheme?.logoutHoverBg || loginTheme.logoutHoverBg; }}
                  onMouseOut={(e) => { if (!signOutLoading) e.target.style.background = siteData?.loginTheme?.logoutBg || loginTheme.logoutBg; }}
                >
                  {signOutLoading ? (siteData?.texts?.buttons?.loggingOut || '退出中') : (siteData?.texts?.buttons?.logout || '退出登录')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}