import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { supabase } from '@/lib/supabase/client';
import { safeGetUser } from '@/lib/supabase/safe';

// 论坛分区导航条（次级 tab）。全局 Docusaurus 顶部导航已含论坛入口，
// 这里提供分区内的高亮与登录态，保持与 Next 版本一致的使用体验。
const TABS = [
  { to: '/forum', label: '论坛' },
  { to: '/chat', label: '聊天' },
  { to: '/friends', label: '友链' },
  { to: '/moments', label: '朋友圈' },
  { to: '/submissions', label: '投稿广场' },
  { to: '/leaderboard', label: '排行榜' },
  { to: '/capsule', label: '时光胶囊' },
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: active ? 700 : 500,
  fontSize: 14,
  color: active ? '#fff' : 'var(--ifm-font-color-base)',
  background: active ? 'var(--ifm-color-primary)' : 'transparent',
});

export default function ForumTabs() {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    safeGetUser()
      .then(({ user }) => {
        if (active) setLoggedIn(!!user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const path = location.pathname;

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '10px 16px',
        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
        background: 'var(--ifm-navbar-background-color)',
        position: 'sticky',
        top: 'var(--ifm-navbar-height, 60px)',
        zIndex: 100,
      }}
    >
      {TABS.map((t) => {
        const active = path === t.to || path.startsWith(t.to + '/');
        return (
          <Link key={t.to} to={t.to} style={tabStyle(active)}>
            {t.label}
          </Link>
        );
      })}

      <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        {loggedIn ? (
          <>
            <Link to="/profile" style={tabStyle(false)}>
              个人中心
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--ifm-color-emphasis-200)',
                color: 'var(--ifm-font-color-base)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              退出登录
            </button>
          </>
        ) : (
          <Link to="/login" style={tabStyle(false)}>
            登录
          </Link>
        )}
      </span>
    </div>
  );
}
