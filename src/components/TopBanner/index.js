import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase, AVATAR_CACHE_EXPIRE } from '../../supabase/supabaseClient';
import { isBrowser } from '../../utils/env';
import { storage } from '../../utils/storage';
import MiddleStatsCard from '../MiddleStatsCard';
import { triggerGlobalProfileRefresh, AVATAR_CACHE_KEY } from '../../utils/globalProfileUtil';

const SCROLL_MODE = false;

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
  locationName = "北京"
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
          siteData={siteData}
          isSessionChecked={isSessionChecked}
          userCount={userCount}
          latestUser={latestUser}
          now={now}
          currentNickname={dbNickname}
          currentAvatar={avatarEmoji}
          user={user}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                欢迎访客，登录解锁完整功能
              </div>
              <button
                onClick={handleGitHubLogin}
                style={{
                  border: 'none',
                  background: '#222',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                GitHub 快捷登录
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, color: '#333' }}>
                👋 欢迎回来，<strong>{dbNickname || getUserName(user)}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  to="/profile"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    border: '1px solid #ccc',
                    padding: '8px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    color: '#333',
                    textDecoration: 'none'
                  }}
                >
                  个人中心
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: '#f53f3f',
                    color: '#fff',
                    padding: '8px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    cursor: signOutLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {signOutLoading ? '退出中' : '退出登录'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}