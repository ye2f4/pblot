'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const TABS = [
  { key: 'latest', label: '最新主题', icon: '📝', color: '#4285f4', desc: '按发布时间倒序排列的最新帖子' },
  { key: 'replies', label: '最新回复', icon: '💬', color: '#ea4335', desc: '最近有回复的热门讨论' },
  { key: 'hot', label: '热门主题', icon: '🔥', color: '#fbbc05', desc: '浏览量最高的帖子' },
  { key: 'featured', label: '精华推荐', icon: '⭐', color: '#34a853', desc: '站长推荐 & 精选内容' },
  { key: 'random', label: '抽贴', icon: '🎲', color: '#ff9800', desc: '随机抽取一篇帖子发现新内容' },
];

const FORUM_CATEGORIES = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'tech', label: '技术', icon: '💻' },
  { key: 'life', label: '生活', icon: '🌈' },
  { key: 'game', label: '游戏', icon: '🎮' },
  { key: 'general', label: '综合', icon: '💡' },
];

interface ForumPost {
  id: string | number;
  title?: string;
  content?: string;
  category?: string;
  author_name?: string;
  author_avatar?: string;
  view_count?: number;
  reply_count?: number;
  like_count?: number;
  created_at?: string;
  last_reply_at?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  tags?: string[];
}

interface Stats {
  totalPosts: number;
  totalReplies: number;
  todayPosts: number;
}

export default function ForumTopics() {
  // 从 URL 参数读取初始 tab
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && TABS.some((t) => t.key === tabParam)) return tabParam;
    }
    return 'latest';
  };

  // 从 URL 参数读取初始 tag（技术标签点击跳转而来）
  const getInitialTag = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tag') || '';
    }
    return '';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [activeTag, setActiveTag] = useState<string>(getInitialTag);
  const [activeCategory, setActiveCategory] = useState('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [randomPost, setRandomPost] = useState<ForumPost | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, totalReplies: 0, todayPosts: 0 });

  // 抽贴功能
  const drawRandomPost = useCallback(async () => {
    setRandomLoading(true);
    setRandomPost(null);
    try {
      const { count } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true });

      if (!count || count === 0) {
        setRandomPost({ id: 'empty', title: '暂无帖子', content: '还没有任何帖子，快去发布第一篇吧！' });
        setRandomLoading(false);
        return;
      }

      const randomOffset = Math.floor(Math.random() * count);

      const { data } = await supabase
        .from('forum_posts')
        .select('*')
        .range(randomOffset, randomOffset)
        .single();

      if (data) {
        await supabase
          .from('forum_posts')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);
        setRandomPost(data as ForumPost);
      }
    } catch (e) {
      console.error('抽贴失败', e);
      setRandomPost({ id: 'error', title: '出错了', content: (e as Error).message });
    } finally {
      setRandomLoading(false);
    }
  }, []);

  // 如果 URL 参数是 random，自动触发抽贴
  useEffect(() => {
    if (getInitialTab() === 'random') {
      drawRandomPost();
    }
  }, [drawRandomPost]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const { count: totalPosts } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true });

      const { count: totalReplies } = await supabase
        .from('forum_replies')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: todayPosts } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        totalPosts: totalPosts || 0,
        totalReplies: totalReplies || 0,
        todayPosts: todayPosts || 0,
      });
    } catch (e) {
      console.log('统计加载跳过', (e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 加载帖子列表
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'random') {
        setLoading(false);
        return;
      }

      let query = supabase.from('forum_posts').select('*');

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      switch (activeTab) {
        case 'latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'replies':
          query = query.order('last_reply_at', { ascending: false, nullsFirst: false });
          break;
        case 'hot':
          query = query.order('view_count', { ascending: false });
          break;
        case 'featured':
          query = query.eq('is_featured', true).order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      query = query.limit(50);

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      let result = (data || []) as ForumPost[];
      if (activeTag) {
        result = result.filter((p) => Array.isArray(p.tags) && p.tags.includes(activeTag));
      }

      setPosts(result);
    } catch (e) {
      const err = e as Error;
      console.error('加载帖子失败', err);
      if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('forum_posts 表未创建，请在 Supabase 控制台运行迁移 SQL');
      } else {
        setError('加载数据失败: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeCategory, activeTag]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // 查看帖子（增加浏览量）
  const viewPost = async (postId: string | number) => {
    try {
      await supabase.rpc('increment_post_view', { post_id: postId });
    } catch {
      try {
        const { data } = await supabase
          .from('forum_posts')
          .select('view_count')
          .eq('id', postId)
          .single();
        await supabase
          .from('forum_posts')
          .update({ view_count: (data?.view_count || 0) + 1 })
          .eq('id', postId);
      } catch (e2) {
        console.warn('浏览量更新失败', (e2 as Error).message);
      }
    }
  };

  // 时间格式化
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div>
      <style>{`
        @keyframes diceRoll {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.2); }
          50% { transform: rotate(180deg) scale(0.9); }
          75% { transform: rotate(270deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        {/* 页面标题 & 统计 */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
            📋 论坛中心
          </h2>
          <p style={{ margin: 0, color: '#999', fontSize: 13 }}>
            帖子 {stats.totalPosts} · 回复 {stats.totalReplies} · 今日新增 {stats.todayPosts}
          </p>
        </div>

        {/* Tab 切换 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: 16,
            padding: '4px',
            background: 'rgba(0,0,0,0.03)',
            borderRadius: '14px',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'random') drawRandomPost();
              }}
              style={{
                flex: '1 1 auto',
                minWidth: 80,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '11px',
                background: activeTab === tab.key ? tab.color : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#555',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title={tab.desc}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 分类过滤（抽贴模式也显示） */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: 16, flexWrap: 'wrap' }}>
          {FORUM_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                if (activeTab === 'random') drawRandomPost();
              }}
              style={{
                padding: '5px 12px',
                border: `1px solid ${activeCategory === cat.key ? '#4285f4' : '#e5e7eb'}`,
                borderRadius: '16px',
                background: activeCategory === cat.key ? '#e8f0fe' : '#fff',
                color: activeCategory === cat.key ? '#4285f4' : '#666',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* 技术标签筛选提示（从首页标签云跳转而来） */}
        {activeTag && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              marginBottom: 16,
              background: '#e8f0fe',
              borderRadius: '16px',
              fontSize: 13,
              color: '#1a73e8',
            }}
          >
            <span>🏷️ 标签：{activeTag}</span>
            <button
              onClick={() => {
                setActiveTag('');
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/forum');
                }
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#1a73e8',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="清除标签筛选"
            >
              ✕
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              padding: '20px',
              background: '#fff3cd',
              borderRadius: '12px',
              color: '#856404',
              border: '1px solid #ffc107',
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <strong>⚠️ {error}</strong>
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>
              请在 Supabase SQL Editor 中运行
              <code
                style={{ background: '#ffeeba', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}
              >
                supabase/migrations/20260713_visitor_system.sql
              </code>
            </p>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}><img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} /></div>
        )}

        {/* === 抽贴模式 === */}
        {activeTab === 'random' && !loading && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
                borderRadius: '16px',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 12,
                  animation: randomLoading ? 'diceRoll 0.8s ease infinite' : 'none',
                  display: 'inline-block',
                }}
              >
                🎲
              </div>
              <p style={{ color: '#666', fontSize: 13, margin: '0 0 12px' }}>
                随机发现一篇帖子，或许会有意外收获
              </p>
              <button
                onClick={drawRandomPost}
                disabled={randomLoading}
                style={{
                  padding: '10px 28px',
                  background: '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: randomLoading ? 'not-allowed' : 'pointer',
                  opacity: randomLoading ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(255,152,0,0.3)',
                }}
              >
                {randomLoading ? '🎰 抽贴中...' : '🎰 再来一贴'}
              </button>
            </div>

            {randomPost && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  border: '1px solid #f0f0f0',
                  animation: 'fadeInUp 0.4s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff9800, #f57c00)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {randomPost.author_avatar || '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: '0 0 6px',
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}
                    >
                      {randomPost.title || '无标题'}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: 12,
                        color: '#999',
                        marginBottom: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>👤 {randomPost.author_name || '匿名'}</span>
                      <span>🕐 {formatTime(randomPost.created_at)}</span>
                      <span>👁 {randomPost.view_count || 0} 浏览</span>
                      <span>💬 {randomPost.reply_count || 0} 回复</span>
                      <span>❤ {randomPost.like_count || 0} 赞</span>
                      {randomPost.is_featured && <span style={{ color: '#f59e0b' }}>⭐ 精华</span>}
                    </div>
                    {randomPost.content && (
                      <p
                        style={{
                          margin: '8px 0 0',
                          color: '#555',
                          fontSize: 14,
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {randomPost.content}
                      </p>
                    )}
                    {randomPost.tags && randomPost.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: 10, flexWrap: 'wrap' }}>
                        {randomPost.tags.map((tag, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '2px 8px',
                              background: '#f0f4ff',
                              borderRadius: '10px',
                              fontSize: 11,
                              color: '#4285f4',
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 列表模式 === */}
        {activeTab !== 'random' && !loading && !error && (
          <>
            {posts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#999',
                  background: '#fafafa',
                  borderRadius: '16px',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p style={{ fontSize: 15, fontWeight: 500 }}>暂无帖子</p>
                <p style={{ fontSize: 13 }}>还没有任何帖子，快来发布第一篇吧！</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                      animation: `fadeInUp 0.3s ease ${index * 0.05}s both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.04)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => viewPost(post.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* 排名序号（热门/最新模式） */}
                      {(activeTab === 'hot' || activeTab === 'latest') && (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background:
                              index < 3 ? ['#ea4335', '#fbbc05', '#34a853'][index] : '#e5e7eb',
                            color: index < 3 ? '#fff' : '#999',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </div>
                      )}

                      {/* 头像 */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e8f0fe, #d2e3fc)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {post.author_avatar || '👤'}
                      </div>

                      {/* 内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginBottom: 4,
                          }}
                        >
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                            {post.title}
                          </h4>
                          {post.is_featured && (
                            <span
                              style={{
                                padding: '1px 6px',
                                background: '#fef3c7',
                                borderRadius: '4px',
                                fontSize: 10,
                                color: '#d97706',
                                fontWeight: 600,
                              }}
                            >
                              精华
                            </span>
                          )}
                          {post.is_pinned && (
                            <span
                              style={{
                                padding: '1px 6px',
                                background: '#e8f0fe',
                                borderRadius: '4px',
                                fontSize: 10,
                                color: '#4285f4',
                                fontWeight: 600,
                              }}
                            >
                              置顶
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '14px',
                            fontSize: 12,
                            color: '#999',
                            flexWrap: 'wrap',
                            marginBottom: 4,
                          }}
                        >
                          <span>👤 {post.author_name || '匿名'}</span>
                          <span>🕐 {formatTime(post.created_at)}</span>
                          <span>👁 {post.view_count || 0} 浏览</span>
                          <span>💬 {post.reply_count || 0} 回复</span>
                          <span>❤ {post.like_count || 0} 赞</span>
                          {post.last_reply_at && (
                            <span style={{ color: '#34a853' }}>↩ {formatTime(post.last_reply_at)}</span>
                          )}
                        </div>

                        {post.tags && post.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {post.tags.map((tag, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '1px 7px',
                                  background: '#f5f5f5',
                                  borderRadius: '8px',
                                  fontSize: 10,
                                  color: '#888',
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 右侧热度指标（热门模式） */}
                      {activeTab === 'hot' && (
                        <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 50 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#ea4335' }}>
                            {post.view_count || 0}
                          </div>
                          <div style={{ fontSize: 10, color: '#999' }}>热度</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 列表底部提示 */}
            <div style={{ textAlign: 'center', padding: '20px', color: '#bbb', fontSize: 12, marginTop: 8 }}>
              — 已加载 {posts.length} 篇帖子 —
            </div>
          </>
        )}
      </div>
    </div>
  );
}
