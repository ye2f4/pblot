import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';

export const metadata = { ssr: false };

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
      // 1. 留言活跃度榜（前端内存分组）
      const { data: allComments } = await supabase
        .from('comments')
        .select('user_id, username');

      const countMap = {};
      allComments.forEach(item => {
        const key = item.user_id;
        if (!countMap[key]) {
          countMap[key] = {
            user_id: item.user_id,
            username: item.username,
            count: 0
          };
        }
        countMap[key].count += 1;
      });

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
          .select('id, nickname')
          .in('id', userIds);

        const profileMap = {};
        profiles?.forEach(p => profileMap[p.id] = p.nickname);

        setSignInRanking(signInData.map(s => ({
          ...s,
          username: profileMap[s.user_id] || '匿名用户'
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
      color: '#94a3b8',
      fontSize: '15px'
    }}>
      暂无数据，敬请期待
    </div>
  );

  if (loading) {
    return (
      <Layout title="全站排行榜">
        <div style={{
          maxWidth: '1100px',
          margin: '40px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: '#64748b',
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
        background: '#f8fafc',
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
              color: '#1e293b',
              margin: '0 0 8px 0',
              fontWeight: 600
            }}>
              🏆 全站排行榜
            </h1>
            <p style={{
              color: '#64748b',
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
                  background: activeTab === tab.key ? tab.color : '#ffffff',
                  color: activeTab === tab.key ? '#ffffff' : '#334155',
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
            background: '#ffffff',
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
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          width: '120px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          flex: 1
                        }}>用户昵称</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: '#334155',
                          fontWeight: 600,
                          width: '140px'
                        }}>留言总数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commentRanking.map((item, index) => {
                        // 前三名特殊底色
                        const rowBg = index === 0 ? '#fffbeb' : index === 1 ? '#f8fafc' : index === 2 ? '#fef2f2' : '#ffffff';
                        return (
                          <tr
                            key={item.user_id}
                            style={{
                              background: rowBg,
                              transition: 'background 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.background = rowBg}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '16px'
                            }}>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && <span style={{ color: '#64748b' }}>{index + 1}</span>}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              color: '#1e293b'
                            }}>
                              {item.username}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              textAlign: 'right',
                              color: '#1e293b',
                              fontWeight: 500
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
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          width: '120px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          flex: 1
                        }}>用户昵称</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: '#334155',
                          fontWeight: 600,
                          width: '140px'
                        }}>累计签到</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signInRanking.map((item, index) => {
                        const rowBg = index === 0 ? '#fffbeb' : index === 1 ? '#f8fafc' : index === 2 ? '#fef2f2' : '#ffffff';
                        return (
                          <tr
                            key={item.user_id}
                            style={{
                              background: rowBg,
                              transition: 'background 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.background = rowBg}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '16px'
                            }}>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && <span style={{ color: '#64748b' }}>{index + 1}</span>}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              color: '#1e293b'
                            }}>
                              {item.username}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              textAlign: 'right',
                              color: '#1e293b',
                              fontWeight: 500
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
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          width: '120px'
                        }}>排名</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'left',
                          color: '#334155',
                          fontWeight: 600,
                          flex: 1
                        }}>设备名称</th>
                        <th style={{
                          padding: '18px 24px',
                          textAlign: 'right',
                          color: '#334155',
                          fontWeight: 600,
                          width: '220px'
                        }}>最后在线时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceRanking.map((item, index) => {
                        const rowBg = index === 0 ? '#fffbeb' : index === 1 ? '#f8fafc' : index === 2 ? '#fef2f2' : '#ffffff';
                        return (
                          <tr
                            key={item.device_name}
                            style={{
                              background: rowBg,
                              transition: 'background 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.background = rowBg}
                          >
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '16px'
                            }}>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && <span style={{ color: '#64748b' }}>{index + 1}</span>}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              color: '#1e293b'
                            }}>
                              {item.device_name}
                            </td>
                            <td style={{
                              padding: '16px 24px',
                              borderBottom: '1px solid #f1f5f9',
                              textAlign: 'right',
                              color: '#475569',
                              fontSize: '14px'
                            }}>
                              {new Date(item.last_heartbeat).toLocaleString()}
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