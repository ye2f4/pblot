'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// /app 区域内的统一导航外壳：让 Next.js 子应用像一个"站点内的独立区域"。
// - /app/* 内部链接用 Next <Link>（自动加 basePath）
// - 跳回主站（Docusaurus）用普通 <a href="/">（basePath 下 / 指向主站根，不走 rewrite）
export default function AppNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setLoggedIn(!!data.user);
    });
    return () => {
      active = false;
    };
  }, []);

  const navItems = [
    { href: '/app', label: 'App 首页' },
    { href: '/app/chat', label: '聊天' },
    { href: '/app/forum', label: '论坛' },
    { href: '/app/submissions', label: '投稿' },
    { href: '/app/friends', label: '好友' },
    { href: '/app/moments', label: '动态' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/app/login';
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #eaeaea',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <a
        href="/"
        title="返回主站"
        style={{ fontWeight: 700, color: '#4285f4', textDecoration: 'none', marginRight: 8 }}
      >
        Monoの小窝
      </a>
      <nav style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              color: '#333',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              fontSize: 14,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loggedIn === null ? null : loggedIn ? (
          <>
            <Link
              href="/app/profile"
              style={{ padding: '6px 12px', borderRadius: 8, color: '#4285f4', textDecoration: 'none', fontSize: 14 }}
            >
              个人中心
            </Link>
            <button
              onClick={handleLogout}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}
            >
              退出
            </button>
          </>
        ) : (
          <Link
            href="/app/login"
            style={{ padding: '6px 12px', borderRadius: 8, background: '#4285f4', color: '#fff', textDecoration: 'none', fontSize: 14 }}
          >
            登录
          </Link>
        )}
      </div>
    </header>
  );
}
