'use client';

import Link from 'next/link';

// 与主站(Docusaurus)底栏风格一致的深色页脚。
// - app 区域内部页面用 Next <Link>（href 不带 /app，自动补前缀）
// - 主站页面 / 外链用普通 <a>（不走 basePath）
type FooterLink = { label: string; to?: string; href?: string };
type FooterCol = { title: string; items: FooterLink[] };

const columns: FooterCol[] = [
  {
    title: '导航',
    items: [
      { label: '博客', href: '/blog/' },
      { label: '文章', href: '/docs/introduction/' },
      { label: '论坛', to: '/forum' },
      { label: '聊天', to: '/chat' },
    ],
  },
  {
    title: '功能',
    items: [
      { label: '说说', to: '/moments' },
      { label: '投稿广场', to: '/submissions' },
      { label: '排行榜', to: '/leaderboard' },
      { label: '时光胶囊', to: '/capsule' },
    ],
  },
  {
    title: '关于',
    items: [
      { label: '关于本站', href: '/about/' },
      { label: '用户协议', href: '/terms/' },
      { label: '隐私政策', href: '/privacy/' },
      { label: '更新日志', href: '/changelog/' },
    ],
  },
  {
    title: '外部',
    items: [
      { label: 'GitHub', href: 'https://github.com/ye2f4' },
      { label: 'Vercel', href: 'https://vercel.com' },
      { label: 'Supabase', href: 'https://supabase.com' },
    ],
  },
];

const linkStyle: React.CSSProperties = {
  color: '#aaa',
  textDecoration: 'none',
  fontSize: 14,
  lineHeight: 2,
  transition: 'color 0.2s ease',
};

function FooterItem({ item }: { item: FooterLink }) {
  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#67ea94';
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#aaa';
  };
  if (item.to) {
    return (
      <Link href={item.to} style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {item.label}
      </Link>
    );
  }
  const external = item.href?.startsWith('http');
  return (
    <a
      href={item.href}
      style={linkStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {item.label}
    </a>
  );
}

export default function AppFooter() {
  return (
    <footer style={{ background: '#1a1a1a', color: '#aaa', marginTop: 'auto' }}>
      <div style={{ maxWidth: '90rem', margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 24,
          }}
        >
          {columns.map((col) => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#e0e0e0', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
                {col.title}
              </div>
              {col.items.map((item) => (
                <FooterItem key={item.label} item={item} />
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: '#888',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} Monoの小窝 · Built with Next.js
        </div>
      </div>
    </footer>
  );
}
