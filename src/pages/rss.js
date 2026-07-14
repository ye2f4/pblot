import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function RSSPage() {
  const feedUrls = {
    rss: '/blog/rss.xml',
    atom: '/blog/atom.xml',
    json: '/blog/feed.json',
  };

  // 用当前站点 origin 动态拼接 feed 绝对地址，避免写死旧域名
  const feedDomain = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Layout title="RSS订阅">
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        maxWidth: 640,
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          RSS 订阅
        </h1>
        <p style={{ color: '#666', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
          订阅本站内容更新，随时随地获取最新博客文章。
        </p>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          background: '#f8f9fa', borderRadius: 14, padding: 24,
          marginBottom: 24,
        }}>
          <FeedRow
            icon="📰"
            label="RSS 2.0"
            feedUrl={`${feedDomain}${feedUrls.rss}`}
            linkTo={feedUrls.rss}
            desc="最通用的订阅格式，兼容几乎所有 RSS 阅读器"
          />
          <FeedRow
            icon="⚛️"
            label="Atom Feed"
            feedUrl={`${feedDomain}${feedUrls.atom}`}
            linkTo={feedUrls.atom}
            desc="基于 Atom 标准的订阅格式，结构化信息更丰富"
          />
          <FeedRow
            icon="📋"
            label="JSON Feed"
            feedUrl={`${feedDomain}${feedUrls.json}`}
            linkTo={feedUrls.json}
            desc="JSON 格式订阅，适合开发者二次处理"
          />
        </div>

        <div style={{
          background: '#e8f0fe', borderRadius: 12, padding: '16px 20px',
          fontSize: 13, color: '#1a73e8', lineHeight: 1.7,
        }}>
          <strong>💡 使用提示：</strong><br/>
          将以上任意链接添加到您常用的 RSS 阅读器（如 Feedly、Inoreader、Reeder、NetNewsWire 等）中即可订阅。<br />
          点击对应按钮可预览/下载 Feed 文件。
        </div>
      </div>
    </Layout>
  );
}

function FeedRow({ icon, label, feedUrl, linkTo, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', background: '#fff', borderRadius: 10,
      border: '1px solid #e5e7eb', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#999', wordBreak: 'break-all' }}>
            {feedUrl}
          </div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <Link
        to={linkTo}
        style={{
          padding: '8px 18px', background: '#4285f4', color: '#fff',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        打开
      </Link>
    </div>
  );
}
