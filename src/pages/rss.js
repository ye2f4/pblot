import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function RSSPage() {
  useEffect(() => {
    // 自动跳转到RSS feed
    window.location.href = '/rss.xml';
  }, []);

  return (
    <Layout title="RSS订阅">
      <div style={{
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <h1>📡 RSS订阅</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          正在跳转到RSS订阅源...
        </p>
        <p>
          如果没有自动跳转，请
          <Link to="/rss.xml" style={{ color: '#2196f3' }}>点击这里</Link>
        </p>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
          订阅地址：https://monoblog.cc.cd/rss.xml
        </p>
      </div>
    </Layout>
  );
}