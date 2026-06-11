import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';

export const metadata = { ssr: false };

// 全站通用空状态组件
const EmptyTip = ({ text }) => (
  <div style={{
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--ifm-color-emphasis-600)',
    fontSize: '15px',
    background: 'var(--ifm-card-background-color)',
    borderRadius: '12px',
    border: '1px dashed var(--ifm-color-emphasis-300)'
  }}>
    📭 {text}
  </div>
);

// 标签样式映射
const typeMap = {
  feature: { label: '新功能', color: '#4caf50' },
  fix: { label: '问题修复', color: '#f44336' },
  improvement: { label: '体验优化', color: '#ff9800' }
};

export default function Changelog() {
  // 基础数据状态
  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 弹窗 & 编辑状态
  const [showModal, setShowModal] = useState(false);
  const [currentEditLog, setCurrentEditLog] = useState(null); // 编辑项：null=新建
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // 表单数据
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    type: 'feature',
    description: '',
    release_date: new Date().toISOString().split('T')[0] // 默认今天
  });

  // 初始化：获取登录用户 + 加载日志列表
  useEffect(() => {
    const init = async () => {
      try {
        // 获取当前登录用户
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        // 加载日志
        await fetchLogs();
      } catch (err) {
        console.error('初始化失败：', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 筛选变化时重新加载日志
  useEffect(() => {
    if (!loading) fetchLogs();
  }, [filterType, loading]);

  // 加载日志列表
  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('update_logs')
        .select('*')
        .order('release_date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('加载日志失败：', err);
    }
  };

  // 打开【新建日志】弹窗
  const openCreateModal = () => {
    setCurrentEditLog(null);
    setFormError('');
    setFormData({
      version: '',
      title: '',
      type: 'feature',
      description: '',
      release_date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  // 打开【编辑日志】弹窗
  const openEditModal = (item) => {
    setCurrentEditLog(item);
    setFormError('');
    setFormData({
      version: item.version || '',
      title: item.title || '',
      type: item.type || 'feature',
      description: item.description || '',
      release_date: item.release_date ? new Date(item.release_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  // 提交表单（新增 / 编辑 共用）
  const submitForm = async () => {
    // 基础表单校验
    const ver = formData.version.trim();
    const title = formData.title.trim();
    const desc = formData.description.trim();
    const date = formData.release_date;

    if (!ver) {
      setFormError('请填写版本号');
      return;
    }
    if (!title) {
      setFormError('请填写日志标题');
      return;
    }
    if (!date) {
      setFormError('请选择发布日期');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const submitPayload = {
        version: ver,
        title,
        type: formData.type,
        description: desc || null,
        release_date: date,
        owner_id: user?.id || null
      };

      if (currentEditLog) {
        // 编辑：更新已有日志
        const { error } = await supabase
          .from('update_logs')
          .update(submitPayload)
          .eq('id', currentEditLog.id);
        if (error) throw error;
      } else {
        // 新建：插入新日志
        const { error } = await supabase
          .from('update_logs')
          .insert([submitPayload]);
        if (error) throw error;
      }

      // 关闭弹窗 + 刷新列表
      setShowModal(false);
      await fetchLogs();
    } catch (err) {
      console.error('提交失败：', err);
      setFormError('操作失败，请重试');
    } finally {
      setFormLoading(false);
    }
  };

  // 删除日志（二次确认）
  const deleteLog = async (id) => {
    if (!window.confirm('确定要删除该条更新日志？此操作不可恢复！')) return;
    try {
      const { error } = await supabase
        .from('update_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchLogs();
    } catch (err) {
      console.error('删除失败：', err);
      alert('删除失败，请重试');
    }
  };

  // 全局加载页
  if (loading) {
    return (
      <Layout title="站点更新日志">
        <div style={{
          maxWidth: '900px',
          margin: '60px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: 'var(--ifm-color-emphasis-600)',
          fontSize: '16px'
        }}>
          正在加载更新日志...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="站点更新日志">
      {/* 页面外层容器（全站统一底色） */}
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--ifm-color-emphasis-100)',
        padding: '40px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* 页面头部 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '36px'
          }}>
            <h1 style={{
              fontSize: '32px',
              color: 'var(--ifm-text-color)',
              margin: 0,
              fontWeight: 600,
              textAlign: 'center',
              flex: 1
            }}>
              📝 站点更新日志
            </h1>

            {/* 仅登录用户显示【添加日志】按钮 */}
            {user && (
              <button
                onClick={openCreateModal}
                style={{
                  padding: '10px 24px',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.25s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#388e3c'}
                onMouseOut={(e) => e.target.style.background = '#4caf50'}
              >
                ➕ 添加日志
              </button>
            )}
          </div>

          {/* 类型筛选栏 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'feature', label: '新功能' },
              { key: 'fix', label: '问题修复' },
              { key: 'improvement', label: '体验优化' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterType(item.key)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: filterType === item.key 
                    ? '#2196f3' 
                    : 'var(--ifm-card-background-color)',
                  color: filterType === item.key 
                    ? '#ffffff' 
                    : 'var(--ifm-text-color)',
                  boxShadow: filterType === item.key 
                    ? '0 4px 12px rgba(33, 150, 243, 0.2)' 
                    : '0 2px 8px rgba(0,0,0,0.06)'
                }}
                onMouseOver={(e) => {
                  if (filterType !== item.key) {
                    e.target.style.background = 'var(--ifm-color-emphasis-100)';
                  }
                }}
                onMouseOut={(e) => {
                  if (filterType !== item.key) {
                    e.target.style.background = 'var(--ifm-card-background-color)';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 日志列表 */}
          {logs.length === 0 ? (
            <EmptyTip text="暂无更新日志" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '16px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
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
                  {/* 头部：版本标题 + 标签 + 操作按钮 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ifm-text-color)' }}>
                        {log.version} - {log.title}
                      </h3>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: typeMap[log.type].color,
                        color: '#fff',
                        fontSize: '12px'
                      }}>
                        {typeMap[log.type].label}
                      </span>
                    </div>

                    {/* 登录用户可见 编辑/删除 按钮 */}
                    {user && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(log)}
                          style={{
                            padding: '6px 12px',
                            background: '#9c27b0',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#8814a0'}
                          onMouseOut={(e) => e.target.style.background = '#9c27b0'}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => deleteLog(log.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                          onMouseOut={(e) => e.target.style.background = '#dc2626'}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 日志描述 */}
                  <p style={{
                    color: 'var(--ifm-color-emphasis-600)',
                    margin: '0',
                    lineHeight: '1.7',
                    fontSize: '15px'
                  }}>
                    {log.description || '无详细描述'}
                  </p>

                  {/* 发布日期 */}
                  <div style={{
                    marginTop: '16px',
                    fontSize: '12px',
                    color: 'var(--ifm-color-emphasis-600)',
                    textAlign: 'right'
                  }}>
                    发布时间：{new Date(log.release_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑 共用弹窗 */}
      {showModal && (
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
            // 点击遮罩关闭弹窗
            if (e.target === e.currentTarget) setShowModal(false);
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
              margin: '0 0 24px 0',
              fontSize: '20px',
              color: 'var(--ifm-text-color)'
            }}>
              {currentEditLog ? '✏️ 编辑更新日志' : '➕ 新增更新日志'}
            </h3>

            {/* 表单错误提示 */}
            {formError && (
              <div style={{
                padding: '12px',
                background: '#ffebee',
                color: '#d32f2f',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 版本号 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  版本号 *
                </label>
                <input
                  placeholder="例如：v1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border 0.25s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                />
              </div>

              {/* 日志标题 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  日志标题 *
                </label>
                <input
                  placeholder="简短概括本次更新"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border 0.25s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                />
              </div>

              {/* 类型选择 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  更新类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer',
                    background: 'var(--ifm-card-background-color)',
                    color: 'var(--ifm-text-color)'
                  }}
                >
                  <option value="feature">新功能</option>
                  <option value="fix">问题修复</option>
                  <option value="improvement">体验优化</option>
                </select>
              </div>

              {/* 详细描述 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  详细描述（选填）
                </label>
                <textarea
                  placeholder="详细说明更新内容、改动点"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    minHeight: '120px',
                    outline: 'none',
                    transition: 'border 0.25s ease',
                    resize: 'none',
                    background: 'var(--ifm-card-background-color)',
                    color: 'var(--ifm-text-color)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                />
              </div>

              {/* 发布日期 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: 'var(--ifm-color-emphasis-600)'
                }}>
                  发布日期 *
                </label>
                <input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer',
                    background: 'var(--ifm-card-background-color)',
                    color: 'var(--ifm-text-color)'
                  }}
                />
              </div>

              {/* 操作按钮 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '8px'
              }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    borderRadius: '10px',
                    background: 'var(--ifm-card-background-color)',
                    color: 'var(--ifm-color-emphasis-600)',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'background 0.25s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'var(--ifm-color-emphasis-100)'}
                  onMouseOut={(e) => e.target.style.background = 'var(--ifm-card-background-color)'}
                >
                  取消
                </button>
                <button
                  onClick={submitForm}
                  disabled={formLoading}
                  style={{
                    padding: '12px 24px',
                    background: '#4caf50',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.6 : 1,
                    transition: 'background 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!formLoading) e.target.style.background = '#388e3c';
                  }}
                  onMouseOut={(e) => {
                    if (!formLoading) e.target.style.background = '#4caf50';
                  }}
                >
                  {formLoading ? '提交中...' : currentEditLog ? '保存修改' : '创建日志'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}