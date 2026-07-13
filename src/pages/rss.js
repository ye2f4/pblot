import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function RSSPage() {
  const [feedUrls, setFeedUrls] = useState({
    rss: '/blog/rss.xml',
    atom: '/blog/atom.xml',
    json: '/blog/feed.json',
  });

  useEffect(() => {
    // 尝试预检测哪个 feed 存在
    const checkFeed = async (path) => {
      try {
        const resp = await fetch(path, { method: 'HEAD' });
        return resp.ok;
      } catch { return false; }
    };

    const detectFeeds = async () => {
      const results = {};
      for (const [type, path] of Object.entries(feedUrls)) {
        results[type] = await checkFeed(path) ? path : null;
      }
      // 如果有可用的，更新 URL
      if (results.rss || results.atom || results.json) {
        setFeedUrls(prev => ({
          ...prev,
          rss: results.rss || prev.rss,
          atom: results.atom || prev.atom,
          json: results.json || prev.json,
        }));
        // 自动跳转到第一个可用 feed
        const firstAvailable = results.rss || results.atom || results.json;
        if (firstAvailable) {
          window.location.replace(firstAvailable);
        }
      }
    };

    detectFeeds();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout title="RSS订阅">
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        maxWidth: 600,
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          RSS 订阅
        </h1>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          订阅本站内容更新，随时随地获取最新博客文章。
        </p>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          background: '#f8f9fa', borderRadius: 12, padding: 20,
          marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#fff', borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📰</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>RSS 2.0</div>
                <div style={{ fontSize: 11, color: '#999', wordBreak: 'break-all' }}>
                  https://monoblog.cc.cd{feedUrls.rss}
                </div>
              </div>
            </div>
            <Link to={feedUrls.rss} style={{
              padding: '6px 14px', background: '#4285f4', color: '#fff',
              borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              订阅
            </Link>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#fff', borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚛️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Atom Feed</div>
                <div style={{ fontSize: 11, color: '#999', wordBreak: 'break-all' }}>
                  https://monoblog.cc.cd{feedUrls.atom}
                </div>
              </div>
            </div>
            <Link to={feedUrls.atom} style={{
              padding: '6px 14px', background: '#34a853', color: '#fff',
              borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              订阅
            </Link>
          </div>
        </div>

        <div style={{
          background: '#e8f0fe', borderRadius: 10, padding: '14px 18px',
          fontSize: 13, color: '#1a73e8', lineHeight: 1.6,
        }}>
          <strong>💡 提示：</strong>将以上任一链接添加到您常用的 RSS 阅读器（如 Feedly、Inoreader、Reeder 等）中即可订阅。
          正在为您自动跳转到 RSS Feed...
        </div>
      </div>
    </Layout>
  );
}
