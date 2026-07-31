import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const entries = [
  {
    icon: '📝',
    title: '博客',
    desc: '个人随笔、技术分享、开源教程与生活记录',
    to: '/blog/',
    color: '#4285f4',
    tags: ['随笔', '教程', '动态'],
  },
  {
    icon: '📚',
    title: '文章',
    desc: '系统整理的文档、系列教程与专题合集',
    to: '/docs/introduction/',
    color: '#8b5cf6',
    tags: ['文档', '教程', '专题'],
  },
];

export default function ArticlesEntry() {
  return (
    <Layout
      title="博客 / 文章"
      description="Monoの小窝内容导航——前往博客或技术文章文档"
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
              📂 内容导航
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
              选择你想浏览的内容板块
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {entries.map((e) => (
              <Link
                key={e.to}
                to={e.to}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  background: 'var(--ifm-card-background-color)',
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.transform = 'translateY(-4px)';
                  ev.currentTarget.style.boxShadow = '0 14px 32px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = 'none';
                  ev.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, color: '#fff', background: e.color,
                  }}>
                    {e.icon}
                  </div>
                  <h2 style={{ fontSize: 22, margin: 0, color: 'var(--ifm-heading-color)' }}>
                    {e.title}
                  </h2>
                </div>
                <p style={{
                  fontSize: 14, color: 'var(--ifm-color-emphasis-600)',
                  lineHeight: 1.7, margin: '0 0 16px',
                }}>
                  {e.desc}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {e.tags.map((t) => (
                    <span key={t} style={{
                      fontSize: 12, padding: '3px 10px', borderRadius: 20,
                      background: 'var(--ifm-color-emphasis-100)', color: 'var(--ifm-color-emphasis-700)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link
              to="/"
              style={{
                display: 'inline-block', padding: '10px 24px', borderRadius: 10,
                background: 'var(--ifm-color-primary)', color: '#fff', textDecoration: 'none', fontSize: 14,
              }}
            >
              🏠 返回首页
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
