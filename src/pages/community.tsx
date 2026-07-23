import React from 'react';
import { useHistory } from '@docusaurus/router';

// /community 着陆页：论坛社区入口总览（原 /app 首页，去前缀后移到根目录）。
const CARDS = [
  { icon: '💬', title: '论坛', desc: '和大家一起聊技术、日常与脑洞', to: '/forum', color: '#4285f4' },
  { icon: '🌐', title: '聊天室', desc: '实时在线聊天，支持表情与图片', to: '/chat', color: '#34a853' },
  { icon: '🔗', title: '友链', desc: '发现并添加有趣的朋友', to: '/friends', color: '#fa78a0' },
  { icon: '🌙', title: '朋友圈', desc: '记录此刻，看看别人的碎碎念', to: '/moments', color: '#9c27b0' },
  { icon: '📝', title: '投稿广场', desc: '用 Markdown 写下你的教程与故事', to: '/submissions', color: '#ff9800' },
  { icon: '🏆', title: '排行榜', desc: '看看谁是社区最活跃的人', to: '/leaderboard', color: '#f44336' },
  { icon: '⏳', title: '时光胶囊', desc: '写给未来的信，定时解锁', to: '/capsule', color: '#00bcd4' },
  { icon: '👤', title: '个人中心', desc: '管理你的资料与账户', to: '/profile', color: '#607d8b' },
];

export default function AppHome() {
  const history = useHistory();
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 28, margin: 0 }}>Monoの小窝 · 社区</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginTop: 8 }}>
          记录 · 分享 · 折腾 · 交朋友
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {CARDS.map((c) => (
          <button
            key={c.to}
            type="button"
            onClick={() => history.push(c.to)}
            style={{
              textAlign: 'left',
              background: 'var(--ifm-card-background-color)',
              border: '1px solid var(--ifm-color-emphasis-200)',
              borderRadius: 14,
              padding: 20,
              cursor: 'pointer',
              transition: 'transform .15s, box-shadow .15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.10)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)', marginTop: 4, lineHeight: 1.5 }}>
              {c.desc}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
