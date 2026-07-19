'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// /app 区域内的统一导航外壳：让 Next.js 子应用像"站点内的独立区域"，并与主站(Docusaurus)风格保持一致。
//
// 关键：next.config 里 basePath='/app'，Next <Link> 会自动补上 /app 前缀。
// 所以内部链接的 href 必须【不带】/app（写 '/chat'，实际渲染为 '/app/chat'）。
// 之前写成 '/app/chat' 会被再次加前缀 → '/app/app/chat' 套娃 404。
//
// 跳回主站(Docusaurus)用普通 <a href="/">（不走 basePath / 不走 rewrite）。
export default function AppNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const pathname = usePathname(); // 已含 basePath，如 /app/chat

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setLoggedIn(!!data.user);
    });
    return () => {
      active = false;
    };
  }, []);

  // href 不带 /app 前缀（Next 自动补）；active 判定用带前缀的完整路径
  const navItems = [
    { href: '/', full: '/app', label: '首页' },
    { href: '/forum', full: '/app/forum', label: '论坛' },
    { href: '/submissions', full: '/app/submissions', label: '投稿' },
    { href: '/moments', full: '/app/moments', label: '说说' },
    { href: '/friends', full: '/app/friends', label: '友链' },
    { href: '/leaderboard', full: '/app/leaderboard', label: '排行榜' },
    { href: '/capsule', full: '/app/capsule', label: '时光胶囊' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // 原生跳转不经过 Next <Link>，basePath 不会自动补，需手写 /app
    window.location.href = '/app/login';
  };

  const isActive = (full: string) =>
    full === '/app' ? pathname === '/app' : pathname === full || pathname.startsWith(full + '/');

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 500,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '90rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0.7rem 1.5rem',
          minHeight: 56,
        }}
      >
        {/* 品牌：返回主站 */}
        <a
          href="/"
          title="返回主站"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: '#2E7D9E',
            textDecoration: 'none',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Monoの小窝
        </a>

        {/* 主导航 */}
        <nav
          style={{
            display: 'flex',
            gap: 4,
            flex: 1,
            overflowX: 'auto',
            alignItems: 'center',
            scrollbarWidth: 'none',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.full);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  color: active ? '#2E7D9E' : '#555',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(46,125,158,0.08)' : 'transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: 15,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右侧：聊天(绿色药丸) + 登录态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link
            href="/chat"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: '#22c55e',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            聊天
          </Link>

          {loggedIn === null ? null : loggedIn ? (
            <>
              <Link
                href="/profile"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  color: '#2E7D9E',
                  textDecoration: 'none',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                个人中心
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                退出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: '#2E7D9E',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
