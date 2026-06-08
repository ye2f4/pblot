import React from 'react';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

// 工具函数
const getAvatarUrl = (user = null, base = '') => {
  if (!user) return `${base}avatar.webp`;
  const avatar = user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url;
  return avatar && avatar.startsWith('http') ? avatar : `${base}avatar.webp`;
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

// 统计项配色配置
const statColors = [
  { bg: 'linear-gradient(135deg, #4285f4 0%, #1976d2 100%)', text: '#4285f4' },
  { bg: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', text: '#9c27b0' },
  { bg: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', text: '#4caf50' },
  { bg: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', text: '#ff9800' },
  { bg: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', text: '#f44336' },
];

// ✅ 核心修复：给 siteData 设默认空对象，防止 undefined
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
  // ✅ 核心修复：可选链 ?. 防止空值报错
  const weekJp = siteData?.texts?.weekJp?.[now.getDay()] || '';
  const weekEn = siteData?.texts?.weekEn?.[now.getDay()] || '';

  return (
    <section
      className={styles.topBannerWrap}
      style={{
        backgroundImage: `url(${base}img/bg_big.webp)`,
      }}
    >
      <div className={styles.topRow}>
        {/* 左侧欢迎卡片 */}
        <div className={styles.topCol} style={{ animationDelay: '0.1s' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: '100%',
            padding: '10px 15px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderLeft: '4px solid #4285f4',
            animation: 'breathe 3s infinite ease-in-out'
          }}>
            <span style={{ fontSize: 28, animation: 'pixelBounce 2s infinite' }}>🏠</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>
                {/* ✅ 兜底文字，构建永不报错 */}
                {siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.4 }}>
                {siteData?.texts?.announcement || '本站持续更新中~'}
              </p>
            </div>
          </div>
        </div>

        {/* 中间统计 + 时钟 */}
        <div className={styles.topCol} style={{ flex: 2, minWidth: 400, animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: 20 }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', minHeight: '60px', alignItems: 'center' }}>
              {isSessionChecked ? (
                // ✅ 空值保护
                (siteData?.stats || []).map((item, i) => {
                  let showValue = item.value;
                  if (item.label === "会") showValue = `会员:${userCount}`;
                  if (item.label === "新") showValue = `最新:${latestUser}`;
                  const color = statColors[i] || statColors[0];

                  return (
                    <div key={i} style={{ textAlign: 'center', minWidth: 48, transition: 'all 0.3s ease', animation: `fadeIn 0.6s ease-out ${0.3 + i * 0.1}s` }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>{item.label}</span>
                      </div>
                      <p style={{ color: color.text, fontSize: 11, margin: 0, textAlign: 'center', fontWeight: 500 }}>{showValue}</p>
                    </div>
                  );
                })
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 48, opacity: 0.5 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', margin: '0 auto 6px' }} />
                    <div style={{ width: 48, height: 12, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 }} />
                  </div>
                ))
              )}
            </div>

            {/* 时钟 */}
            <div className={styles.bannerRight} style={{ padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRadius: '12px', textAlign: 'right', minWidth: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>📅</span>
                <div className={`pixel-font ${styles.clockText}`} style={{ fontSize: 24, color: '#333', textShadow: 'none', animation: 'digitPulse 1s infinite' }}>
                  {now.toLocaleTimeString()}
                </div>
              </div>
              <div className={styles.dateText} style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{weekJp}曜日 ({weekEn})</div>
              <div className={`pixel-font ${styles.dateText}`} style={{ fontSize: 16, color: '#333', textShadow: 'none' }}>
                {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧用户栏 */}
        <div className={styles.topCol} style={{ animationDelay: '0.3s' }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', justifyContent: 'center' }}>
              <img
                src={getAvatarUrl(user, base)}
                alt={getUserName(user)}
                width="50" height="50" loading="lazy"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.webp`; }}
                style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{getUserName(user)}</span>
              <Link to="/pblot/profile" className="btn-hover" style={{ width: '100%', padding: '6px 12px', backgroundColor: '#4285f4', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {siteData?.texts?.buttons?.profile || '个人中心'}
              </Link>
              <button onClick={handleSignOut} className="btn-hover" style={{ width: '100%', padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, minWidth: 48, minHeight: 48 }}>
                {siteData?.texts?.buttons?.logout || '退出登录'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', justifyContent: 'center' }}>
              <img src={`${base}avatar.webp`} alt="默认头像" width="50" height="50" loading="lazy"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${base}avatar.webp`; }}
                style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', transition: 'all 0.5s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; }}
              />
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <Link to="/pblot/login" className="btn-hover" style={{ flex: 1, padding: '6px 12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {siteData?.texts?.buttons?.login || '登录'}
                </Link>
                <Link to="/pblot/register" className="btn-hover" style={{ flex: 1, padding: '6px 12px', background: '#999', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, minWidth: 48, minHeight: 48, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {siteData?.texts?.buttons?.register || '注册'}
                </Link>
              </div>
              <button onClick={handleGitHubLogin} disabled={loading} className="btn-hover" style={{ width: '100%', padding: '6px 12px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, opacity: loading ? 0.7 : 1, minWidth: 48, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                {loading ? (siteData?.texts?.buttons?.logging || '登录中...') : (siteData?.texts?.buttons?.githubLogin || 'GitHub登录')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}