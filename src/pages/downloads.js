import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import downloadData from '../data/Download.json';

const downloadList = downloadData.resourceList;
const categoryMap = downloadData.categoryMap;

// 每个分类对应 meshtastic 风格：左侧渐变竖条 + 大图标，右侧卡片区
const categoryStyle = {
  tutorial: { icon: '📚', from: '#22c55e', to: '#16a34a' },
  tool: { icon: '🔧', from: '#f59e0b', to: '#d97706' },
  source: { icon: '💻', from: '#8b5cf6', to: '#7c3aed' },
  asset: { icon: '🎨', from: '#ec4899', to: '#db2777' },
  hardware: { icon: '📄', from: '#06b6d4', to: '#0891b2' },
};

const groupByCategory = (list) => {
  const groups = {};
  list.forEach((item) => {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  });
  return groups;
};

const resourceGroups = groupByCategory(downloadList);

export default function DownloadPage() {
  return (
    <Layout
      title="资料下载"
      description="本站技术教程、工具、源码、素材、硬件手册免费下载"
    >
      <div className="container margin-vert--lg">
        <h1 className="margin--md">
          资料下载
        </h1>

        {Object.keys(resourceGroups).map((cateKey) => {
          const style = categoryStyle[cateKey] || { icon: '📦', from: '#22c55e', to: '#16a34a' };
          return (
            <section
              key={cateKey}
              style={{
                display: 'flex',
                width: '100%',
                overflow: 'hidden',
                borderRadius: 14,
                marginBottom: 24,
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              }}
            >
              {/* 左侧渐变竖条 + 大图标（meshtastic 风格） */}
              <div
                style={{
                  width: '20%',
                  minWidth: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
                }}
              >
                <span style={{ fontSize: 48, lineHeight: 1 }}>{style.icon}</span>
              </div>

              {/* 右侧卡片区 */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  padding: 20,
                  background: 'var(--ifm-color-emphasis-100)',
                }}
              >
                {resourceGroups[cateKey].map((item, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      flex: '1 1 240px',
                      minWidth: 240,
                      maxWidth: 300,
                      border: '2px solid var(--ifm-color-emphasis-300)',
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="card__header">
                      <h3 style={{ fontSize: 17, margin: 0, fontWeight: 600 }}>
                        {item.title}
                      </h3>
                    </div>
                    <div className="card__body" style={{ flex: 1 }}>
                      <p style={{
                        fontSize: 14,
                        color: 'var(--ifm-color-emphasis-700)',
                        lineHeight: 1.7,
                        margin: '0 0 12px 0',
                      }}>
                        {item.desc}
                      </p>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        color: 'var(--ifm-color-emphasis-600)',
                      }}>
                        <span>📦 {item.size}</span>
                        <span>📅 {item.date}</span>
                      </div>
                    </div>
                    <div className="card__footer" style={{ marginTop: 'auto' }}>
                      {item.url ? (
                        <a
                          href={item.url}
                          target={item.url.startsWith('http') ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          data-no-routing
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#22c55e',
                            color: '#fff',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'filter 0.2s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                        >
                          📥 立即下载
                        </a>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: 'var(--ifm-color-emphasis-300)',
                          color: 'var(--ifm-color-emphasis-600)',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'not-allowed',
                        }}>
                          🔒 暂无资源
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'var(--ifm-color-emphasis-100)',
              color: '#16a34a',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ifm-color-emphasis-300)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ifm-color-emphasis-100)'; }}
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </Layout>
  );
}
