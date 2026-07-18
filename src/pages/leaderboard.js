import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';

export const metadata = {
  ssr: false,
  title: '排行榜 | Monoの小窝',
  description: '社区活跃用户与热门主题排行榜，发现优质内容与开发者。',
};

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('comments');
  const [commentRanking, setCommentRanking] = useState([]);
  const [signInRanking, setSignInRanking] = useState([]);
  const [deviceRanking, setDeviceRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
    // 每5分钟自动刷新
    const interval = setInterval(fetchRankings, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchRankings = async () => {
    try {
      // 1. 留言活跃度榜（拉取 profiles 关联 nickname）
      const { data: allComments } = await supabase
        .from('comments')
        .select('user_id');

      const countMap = {};
      const allUserIds = [];
      (allComments || []).forEach(item => {
        const key = item.user_id;
        if (!countMap[key]) {
          countMap[key] = { user_id: item.user_id, count: 0 };
          allUserIds.push(key);
        }
        countMap[key].count += 1;
      });

      // 批量拉取 profiles 获取昵称
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', allUserIds);

        const profileMap = {};
        profiles?.forEach(p => { profileMap[p.id] = p; });

        Object.keys(countMap).forEach(uid => {
          countMap[uid].username = profileMap[uid]?.nickname || '匿名用户';
          countMap[uid].avatar_url = profileMap[uid]?.avatar_url || '';
        });
      } else {
        Object.keys(countMap).forEach(uid => {
          countMap[uid].username = '匿名用户';
          countMap[uid].avatar_url = '';
        });
      }

      const commentList = Object.values(countMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setCommentRanking(commentList);

      // 2. 签到累计榜
      const { data: signInData } = await supabase
        .from('sign_ins')
        .select('user_id, total_days')
        .order('total_days', { ascending: false })
        .limit(10);

      const userIds = signInData?.map(s => s.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', userIds);

        const profileMap = {};
        profiles?.forEach(p => { profileMap[p.id] = p; });

        setSignInRanking(signInData.map(s => ({
          ...s,
          username: profileMap[s.user_id]?.nickname || '匿名用户',
          avatar_url: profileMap[s.user_id]?.avatar_url || ''
        })));
      }

      // 3. 设备在线榜
      const { data: deviceData } = await supabase
        .from('devices')
        .select('device_name, last_heartbeat, created_at')
        .order('last_heartbeat', { ascending: false })
        .limit(10);

      setDeviceRanking(deviceData || []);

    } catch (err) {
      console.error('排行榜数据加载失败：', err);
    } finally {
      setLoading(false);
    }
  };

  // 通用空状态组件
  const EmptyTip = () => (
    <div style={{
      textAlign: 'center',
      padding: '48px 20px',
      color: 'var(--ifm-color-emphasis-600)',
      fontSize: '15px'
    }}>
      🏜️ 暂无数据，快去参与互动吧~
    </div>
  );

  // 头像渲染
  const renderAvatar = (avatarUrl, username) => {
    if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
      return (
        <img src={avatarUrl} alt={username}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginRight: 12 }}
          onError={(e) => { e.target.style.display = 'none'; }} />
      );
    }
    const emoji = avatarUrl || '👤';
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--ifm-color-emphasis-100)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginRight: 12, fontSize: 18, flexShrink: 0
      }}>{emoji}</div>
    );
  };

  // 排名徽章
  const getRankBadge = (index) => {
    if (index === 0) return { emoji: '🥇', color: '#f59e0b', bg: '#fffbeb' };
    if (index === 1) return { emoji: '🥈', color: '#94a3b8', bg: '#f8fafc' };
    if (index === 2) return { emoji: '🥉', color: '#d97706', bg: '#fef2f2' };
    return { emoji: `#${index + 1}`, color: 'var(--ifm-color-emphasis-600)', bg: 'transparent' };
  };

  if (loading) {
    return (
      <Layout title="全站排行榜">
        <div style={{
          maxWidth: '1100px',
          margin: '40px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: 'var(--ifm-color-emphasis-600)',
          fontSize: '16px'
        }}>
          正在加载排行榜数据...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="全站排行榜">
      {/* 页面外层容器：统一背景、最大宽度、整体比例 */}
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--ifm-color-emphasis-100)',
        padding: '32px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
          {/* 页面标题区域 */}
          <div style={{
            textAlign: 'center',
            marginBottom: '36px'
          }}>
            <h1 style={{
              fontSize: '32px',
              color: 'var(--ifm-text-color)',
              margin: '0 0 8px 0',
              fontWeight: 600
            }}>
              🏆 全站排行榜
            </h1>
            <p style={{
              color: 'var(--ifm-color-emphasis-600)',
              fontSize: '14px',
              margin: 0
            }}>
              数据每 5 分钟自动更新
            </p>
          </div>

          {/* 分类标签栏：优化样式、过渡、响应式 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}>
            {[
              { key: 'comments', label: '留言活跃度', color: '#f97316' },
              { key: 'signin', label: '签到累计榜', color: '#10b981' },
              { key: 'devices', label: '设备在线榜', color: '#3b82f6' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 24px',
                  fontSize: '15px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  // 选中/未选中样式区分
                  background: activeTab === tab.key ? tab.color : 'var(--ifm-card-background-color)',
                  color: activeTab === tab.key ? '#ffffff' : 'var(--ifm-text-color)',
                  boxShadow: activeTab === tab.key
                    ? `0 4px 12px ${tab.color}40`
                    : '0 2px 6px rgba(0,0,0,0.06)',
                }}
                // 鼠标悬浮效果
                onMouseOver={(e) => {
                  if (activeTab !== tab.key) {
                    e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.key) {
                    e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 排行榜卡片主体：圆角、阴影、比例优化 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            {/* 留言活跃度榜 */}
            {activeTab === 'comments' && (
              <>
                {commentRanking.length === 0 ? <EmptyTip /> : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '15px'
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'center',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '80px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600
                        }}>用户</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '140px'
                        }}>留言总数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commentRanking.map((item, index) => {
                        const badge = getRankBadge(index);
                        return (
                          <tr
                            key={item.user_id}
                            style={{
                              background: badge.bg,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--ifm-color-emphasis-100)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = badge.bg; e.currentTarget.style.transform = 'translateX(0)'; }}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'center',
                              fontSize: index < 3 ? '24px' : '16px'
                            }}>
                              {badge.emoji}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              color: 'var(--ifm-text-color)',
                              display: 'flex', alignItems: 'center'
                            }}>
                              {renderAvatar(item.avatar_url, item.username)}
                              <span style={{ fontWeight: index < 3 ? 600 : 400 }}>{item.username}</span>
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'right',
                              color: badge.color,
                              fontWeight: 700,
                              fontSize: '16px'
                            }}>
                              {item.count} 条
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* 签到累计榜 */}
            {activeTab === 'signin' && (
              <>
                {signInRanking.length === 0 ? <EmptyTip /> : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '15px'
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'center',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '80px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600
                        }}>用户</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '140px'
                        }}>累计签到</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signInRanking.map((item, index) => {
                        const badge = getRankBadge(index);
                        return (
                          <tr
                            key={item.user_id}
                            style={{
                              background: badge.bg,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--ifm-color-emphasis-100)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = badge.bg; e.currentTarget.style.transform = 'translateX(0)'; }}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'center',
                              fontSize: index < 3 ? '24px' : '16px'
                            }}>
                              {badge.emoji}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              color: 'var(--ifm-text-color)',
                              display: 'flex', alignItems: 'center'
                            }}>
                              {renderAvatar(item.avatar_url, item.username)}
                              <span style={{ fontWeight: index < 3 ? 600 : 400 }}>{item.username}</span>
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'right',
                              color: badge.color,
                              fontWeight: 700,
                              fontSize: '16px'
                            }}>
                              {item.total_days} 天
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* 设备在线榜 */}
            {activeTab === 'devices' && (
              <>
                {deviceRanking.length === 0 ? <EmptyTip /> : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '15px'
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'center',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '80px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600
                        }}>设备名称</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: 'var(--ifm-text-color)',
                          fontWeight: 600,
                          width: '220px'
                        }}>最后在线时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceRanking.map((item, index) => {
                        const badge = getRankBadge(index);
                        return (
                          <tr
                            key={item.device_name || index}
                            style={{
                              background: badge.bg,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--ifm-color-emphasis-100)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = badge.bg; e.currentTarget.style.transform = 'translateX(0)'; }}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'center',
                              fontSize: index < 3 ? '24px' : '16px'
                            }}>
                              {badge.emoji}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              color: 'var(--ifm-text-color)',
                              display: 'flex', alignItems: 'center', gap: 10
                            }}>
                              <span style={{ fontSize: 20 }}>🖥️</span>
                              <span style={{ fontWeight: index < 3 ? 600 : 400 }}>{item.device_name}</span>
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                              textAlign: 'right',
                              color: 'var(--ifm-color-emphasis-600)',
                              fontSize: '13px'
                            }}>
                              {new Date(item.last_heartbeat).toLocaleString('zh-CN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}