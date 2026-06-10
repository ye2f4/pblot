import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
// 样式文件：向上 2 级到 pages
import styles from '../../pages/index.module.css';
// 【修复路径】向上 2 级 → src/supabase
import { supabase, AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE } from '../../supabase/supabaseClient';
// 【修复路径】向上 2 级 → src/utils
import { isBrowser } from '../../utils/env';
import { storage } from '../../utils/storage';
// 同目录层级，向上 1 级即可
import MiddleStatsCard from '../MiddleStatsCard';

const SCROLL_MODE = false;

/**
 * 解析用户昵称（多层兜底，加固判空）
 * @param {object|null} user Supabase 用户对象
 * @returns {string} 展示昵称
 */
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

export default function TopBanner({
  siteData = {},
  base = '',
  user = null,          // 直接使用父组件传入的user，不再本地初始化state
  loading = false,     // GitHub登录加载态
  signOutLoading = false, // 退出登录加载态
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  now = new Date(),
  handleGitHubLogin = () => { },
  handleSignOut = () => { }
}) {
  const noticeRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const announcement = siteData?.texts?.announcement || '本站持续更新技术教程和资源分享';
  const [avatarEmoji, setAvatarEmoji] = useState('');

  // 1. 全局会话监听
  useEffect(() => {
    if (!isBrowser || !supabase.auth) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      // 仅同步状态，不再本地维护user
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 带本地缓存的头像拉取（修复single()错误区分、统一存储工具）
  useEffect(() => {
    if (!isBrowser || !user) {
      setAvatarEmoji('');
      return;
    }

    const userId = user.id;
    const fetchUserAvatar = async () => {
      // 读取本地缓存
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

      // 缓存有效，直接使用
      if (cacheValid) {
        setAvatarEmoji(cachedAvatar);
        return;
      }

      // 缓存失效，请求数据库
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();

        // 区分：查询结果为空(正常) / 真实接口错误
        if (error) {
          // PGRST116 = 无匹配数据（用户未设置头像）
          if (error.code === 'PGRST116') {
            setAvatarEmoji('');
            return;
          }
          throw error;
        }

        const avatar = data?.avatar_url || '';
        setAvatarEmoji(avatar);

        // 写入缓存
        storage.set(
          AVATAR_CACHE_KEY,
          JSON.stringify({ userId, avatar, timestamp: Date.now() })
        );
      } catch (err) {
        console.warn("获取用户头像失败：", err);
        setAvatarEmoji('');
      }
    };

    fetchUserAvatar();
  }, [user]);

  // 3. 公告滚动（修复：RAF延迟读取DOM尺寸，解决SSR水合警告）
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

    // 组件卸载取消动画帧
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
      {/* 使用CSS类实现响应式网格，删除行内媒体查询 */}
      <div className={styles.bannerGrid}>
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

        {/* 中间统计卡片 */}
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
              {/* 头像：使用CSS hover动画，删除行内onMouse事件 */}
              {avatarEmoji ? (
                <div className={styles.avatarWrap}>
                  {avatarEmoji}
                </div>
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

              {/* 退出登录按钮：独立加载态 */}
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