import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const groups = [
  {
    title: '资源',
    emoji: '📦',
    items: [
      { label: '资料下载', to: '/downloads/' },
      { label: '开源项目', to: '/projects/' },
      { label: '开发工具', to: '/tools/' },
    ],
  },
  {
    title: '工具箱',
    emoji: '🧰',
    items: [
      { label: '硬件监控', to: '/hardware/' },
      { label: '共享地震台网', to: '/shake-network/' },
      { label: '代码片段', to: '/snippets/' },
      { label: 'PCB元器件', to: '/pcb/' },
      { label: '时光胶囊', to: '/capsule/' },
      { label: '排行榜', to: '/leaderboard/' },
      { label: '网易云下载', to: '/music-downloader/' },
    ],
  },
  {
    title: '社区与更多',
    emoji: '✨',
    items: [
      { label: '说说', to: '/moments/' },
      { label: '友情链接', to: '/friends/' },
      { label: '投稿广场', to: '/submissions/' },
      { label: '更新日志', to: '/changelog/' },
      { label: '隐私政策', to: '/privacy/' },
      { label: '用户协议', to: '/terms/' },
      { label: 'RSS订阅', to: '/rss' },
    ],
  },
];

export default function MorePage() {
  return (
    <Layout
      title="更多"
      description="Monoの小窝全站导航——社区、工具箱、资源与条款入口"
    >
      <div style={{
        minHeight: '70vh',
        padding: '56px 20px 70px',
        background: 'var(--ifm-background-color)',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{
              fontSize: 32, margin: '0 0 10px', color: 'var(--ifm-heading-color)', fontWeight: 700,
            }}>
              🧭 全站导航
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
              这里收录了网站的全部板块（博客与文章请在导航栏「博客」中查看）
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {groups.map((g) => (
              <section
                key={g.title}
                style={{
                  background: 'var(--ifm-card-background-color)',
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  borderRadius: 18,
                  padding: '24px 26px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                }}
              >
                <h2 style={{
                  fontSize: 19, margin: '0 0 16px', color: 'var(--ifm-heading-color)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 22 }}>{g.emoji}</span>
                  {g.title}
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}>
                  {g.items.map((it) => (
                    <Link
                      key={it.to}
                      to={it.to}
                      style={{
                        display: 'block', padding: '12px 14px', borderRadius: 10,
                        background: 'var(--ifm-color-emphasis-100)',
                        color: 'var(--ifm-color-emphasis-800)', textDecoration: 'none',
                        fontSize: 14, fontWeight: 500, textAlign: 'center',
                        transition: 'background 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(ev) => {
                        ev.currentTarget.style.background = 'var(--ifm-color-primary)';
                        ev.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(ev) => {
                        ev.currentTarget.style.background = 'var(--ifm-color-emphasis-100)';
                        ev.currentTarget.style.color = 'var(--ifm-color-emphasis-800)';
                      }}
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
