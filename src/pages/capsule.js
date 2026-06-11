import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import { solarToLunar } from '../lib/calendar';

export const metadata = { ssr: false };

export default function TimeCapsule() {
  const [user, setUser] = useState(null);
  const [myCapsules, setMyCapsules] = useState([]);
  const [publicCapsules, setPublicCapsules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCapsule, setNewCapsule] = useState({
    title: '',
    content: '',
    unlockDate: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        await fetchCapsules();
        await checkAutoUnlock();
      } catch (err) {
        console.error('初始化失败：', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const checkAutoUnlock = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('time_capsules')
        .update({ is_unlocked: true })
        .eq('is_unlocked', false)
        .lte('unlock_date', today);
    } catch (err) {
      console.error('自动解锁检测失败：', err);
    }
  };

  const fetchCapsules = async () => {
    try {
      const { data: publicData } = await supabase
        .from('time_capsules')
        .select('*')
        .eq('is_unlocked', true)
        .order('unlock_date', { ascending: false });
      setPublicCapsules(publicData || []);

      if (user) {
        const { data: myData } = await supabase
          .from('time_capsules')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setMyCapsules(myData || []);
      }
    } catch (err) {
      console.error('加载胶囊数据失败：', err);
    }
  };

  const createCapsule = async () => {
    if (!user) {
      alert('请先登录后再创建时光胶囊');
      return;
    }
    if (!newCapsule.title.trim() || !newCapsule.content.trim() || !newCapsule.unlockDate) {
      alert('请完整填写标题、内容和解锁日期');
      return;
    }

    try {
      await supabase.from('time_capsules').insert([{
        title: newCapsule.title.trim(),
        content: newCapsule.content.trim(),
        unlock_date: newCapsule.unlockDate,
        user_id: user.id,
        is_unlocked: false
      }]);

      setShowCreateModal(false);
      setNewCapsule({ title: '', content: '', unlockDate: '' });
      await fetchCapsules();
    } catch (err) {
      console.error('创建胶囊失败：', err);
      alert('创建失败，请稍后重试');
    }
  };

  const EmptyPlaceholder = ({ text }) => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: 'var(--ifm-color-emphasis-500)',
      fontSize: '15px',
      background: 'var(--ifm-card-background-color)',
      borderRadius: '12px',
      border: '1px dashed var(--ifm-color-emphasis-300)'
    }}>
      📭 {text}
    </div>
  );

  if (loading) {
    return (
      <Layout title="时光胶囊">
        <div style={{
          maxWidth: '1100px',
          margin: '60px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: 'var(--ifm-color-emphasis-500)',
          fontSize: '16px'
        }}>
          正在加载时光胶囊...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="时光胶囊">
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--ifm-background-color)',
        padding: '32px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '48px'
          }}>
            <h1 style={{
              fontSize: '34px',
              color: 'var(--ifm-heading-color)',
              margin: '0 0 12px 0',
              fontWeight: 600
            }}>
              🕰️ 时光胶囊
            </h1>
            <p style={{
              color: 'var(--ifm-color-emphasis-600)',
              fontSize: '15px',
              margin: '0 0 28px 0',
              lineHeight: 1.6
            }}>
              写下给未来的留言，设定解锁日期，到期自动公开分享
            </p>

            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '14px 32px',
                  background: '#9c27b0',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(156, 39, 176, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.3)';
                }}
              >
                ✨ 写下时光胶囊
              </button>
            ) : (
              <div style={{
                padding: '14px 24px',
                background: 'var(--ifm-card-background-color)',
                border: '1px solid var(--ifm-color-emphasis-300)',
                borderRadius: '999px',
                display: 'inline-block',
                color: 'var(--ifm-color-emphasis-600)',
                fontSize: '15px'
              }}>
                🔒 请先登录，即可创建专属时光胶囊
              </div>
            )}
          </div>

          {user && (
            <div style={{ marginBottom: '48px' }}>
              <h2 style={{
                fontSize: '20px',
                color: 'var(--ifm-heading-color)',
                margin: '0 0 20px 0',
                paddingLeft: '12px',
                borderLeft: '4px solid #9c27b0'
              }}>
                我的时光胶囊
              </h2>

              {myCapsules.length === 0 ? (
                <EmptyPlaceholder text="你还没有创建时光胶囊，快去写下第一条吧～" />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '24px'
                }}>
                  {myCapsules.map(capsule => {
                    const unlockDate = new Date(capsule.unlock_date);
                    const today = new Date();
                    const daysLeft = Math.ceil((unlockDate - today) / (1000 * 60 * 60 * 24));
                    const lunar = solarToLunar(unlockDate);

                    return (
                      <div
                        key={capsule.id}
                        style={{
                          background: capsule.is_unlocked ? 'var(--ifm-card-background-color)' : 'var(--ifm-color-secondary-lightest)',
                          borderRadius: '16px',
                          border: '1px solid var(--ifm-color-emphasis-200)',
                          padding: '24px',
                          transition: 'all 0.25s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-4px)';
                          e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '16px'
                        }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '18px',
                            color: 'var(--ifm-heading-color)',
                            flex: 1
                          }}>
                            {capsule.title}
                          </h3>
                          {!capsule.is_unlocked && (
                            <span style={{
                              padding: '4px 8px',
                              background: 'rgba(156,39,176,0.1)',
                              color: '#9c27b0',
                              fontSize: '12px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              marginLeft: '8px'
                            }}>
                              未解锁
                            </span>
                          )}
                        </div>

                        {capsule.is_unlocked ? (
                          <div style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.7',
                            color: 'var(--ifm-text-color)',
                            fontSize: '14px',
                            minHeight: '60px'
                          }}>
                            {capsule.content}
                          </div>
                        ) : (
                          <div style={{
                            color: 'var(--ifm-color-emphasis-600)',
                            fontSize: '14px',
                            padding: '12px 0',
                            borderTop: '1px dashed var(--ifm-color-emphasis-300)',
                            borderBottom: '1px dashed var(--ifm-color-emphasis-300)',
                            margin: '8px 0'
                          }}>
                            🔒 距离解锁还有
                            <strong style={{
                              color: '#9c27b0',
                              fontSize: '16px',
                              margin: '0 4px'
                            }}>
                              {daysLeft}
                            </strong>
                            天
                          </div>
                        )}

                        <div style={{ marginTop: '16px' }}>
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--ifm-color-emphasis-600)',
                            marginBottom: '6px'
                          }}>
                            📅 解锁日期：{unlockDate.toLocaleDateString()}
                            <span style={{ marginLeft: '8px' }}>
                              农历 {lunar.lunarMonth}月{lunar.lunarDay}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--ifm-color-emphasis-500)'
                          }}>
                            创建时间：{new Date(capsule.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <h2 style={{
              fontSize: '20px',
              color: 'var(--ifm-heading-color)',
              margin: '0 0 20px 0',
              paddingLeft: '12px',
              borderLeft: '4px solid #9c27b0'
            }}>
              已解锁的公开胶囊
            </h2>

            {publicCapsules.length === 0 ? (
              <EmptyPlaceholder text="暂时还没有已解锁的时光胶囊，敬请期待～" />
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px'
              }}>
                {publicCapsules.map(capsule => {
                  const unlockDate = new Date(capsule.unlock_date);
                  const lunar = solarToLunar(unlockDate);

                  return (
                    <div
                      key={capsule.id}
                      style={{
                        background: 'var(--ifm-card-background-color)',
                        borderRadius: '16px',
                        border: '1px solid var(--ifm-color-emphasis-200)',
                        padding: '24px',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-4px)';
                        e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                    >
                      <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        color: 'var(--ifm-heading-color)'
                      }}>
                        {capsule.title}
                      </h3>
                      <div style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.7',
                        color: 'var(--ifm-text-color)',
                        fontSize: '14px',
                        minHeight: '60px'
                      }}>
                        {capsule.content}
                      </div>
                      <div style={{
                        marginTop: '20px',
                        fontSize: '14px',
                        color: 'var(--ifm-color-emphasis-600)',
                        borderTop: '1px dashed var(--ifm-color-emphasis-300)',
                        paddingTop: '12px'
                      }}>
                        📅 解锁日期：{unlockDate.toLocaleDateString()}
                        <span style={{ marginLeft: '8px' }}>
                          农历 {lunar.lunarMonth}月{lunar.lunarDay}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--ifm-card-background-color)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{
              fontSize: '20px',
              color: 'var(--ifm-heading-color)',
              margin: '0 0 24px 0'
            }}>
              ✍️ 写下你的时光胶囊
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input
                placeholder="请输入胶囊标题"
                value={newCapsule.title}
                onChange={(e) => setNewCapsule({ ...newCapsule, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--ifm-color-emphasis-300)',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border 0.2s ease',
                  boxSizing: 'border-box',
                  background: 'var(--ifm-background-color)',
                  color: 'var(--ifm-text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = '#9c27b0'}
                onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
              />

              <textarea
                placeholder="写下你想留给未来的话..."
                value={newCapsule.content}
                onChange={(e) => setNewCapsule({ ...newCapsule, content: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--ifm-color-emphasis-300)',
                  fontSize: '15px',
                  minHeight: '220px',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border 0.2s ease',
                  boxSizing: 'border-box',
                  lineHeight: '1.7',
                  background: 'var(--ifm-background-color)',
                  color: 'var(--ifm-text-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = '#9c27b0'}
                onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
              />

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  选择解锁日期（不可选择过去日期）
                </label>
                <input
                  type="date"
                  value={newCapsule.unlockDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewCapsule({ ...newCapsule, unlockDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border 0.2s ease',
                    boxSizing: 'border-box',
                    background: 'var(--ifm-background-color)',
                    color: 'var(--ifm-text-color)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#9c27b0'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '8px'
              }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    borderRadius: '10px',
                    background: 'var(--ifm-card-background-color)',
                    color: 'var(--ifm-color-emphasis-600)',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'var(--ifm-color-emphasis-100)'}
                  onMouseOut={(e) => e.target.style.background = 'var(--ifm-card-background-color)'}
                >
                  取消
                </button>
                <button
                  onClick={createCapsule}
                  style={{
                    padding: '12px 24px',
                    background: '#9c27b0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#8814a0'}
                  onMouseOut={(e) => e.target.style.background = '#9c27b0'}
                >
                  封存时光
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}