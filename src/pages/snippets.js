import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const metadata = { ssr: false };

export default function CodeSnippets() {
  // ========== 状态扩展：新增编辑相关状态 ==========
  const [snippets, setSnippets] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [copyTip, setCopyTip] = useState('');
  // 编辑专用：当前正在编辑的片段，null = 新建模式
  const [currentSnippet, setCurrentSnippet] = useState(null);

  // 表单（统一使用字符串存储标签，避免类型冲突）
  const [newSnippet, setNewSnippet] = useState({
    title: '',
    description: '',
    code: '',
    language: 'javascript',
    tags: '',
    is_public: true
  });

  // 初始化：获取登录状态 + 加载数据
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        await fetchSnippets();
      } catch (err) {
        console.error('初始化失败：', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 加载代码片段列表
  const fetchSnippets = async () => {
    try {
      let query = supabase.from('code_snippets').select('*');

      // 权限：未登录仅看公开片段 / 登录看公开 + 自己私有片段
      if (user) {
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
      } else {
        query = query.eq('is_public', true);
      }

      // 标签筛选
      if (selectedTag) {
        query = query.contains('tags', [selectedTag]);
      }

      // 关键词搜索
      if (searchTerm.trim()) {
        const kw = searchTerm.trim();
        query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setSnippets(data || []);
    } catch (err) {
      console.error('加载片段失败：', err);
    }
  };

  // 复制代码（悬浮提示）
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyTip('✅ 代码已复制');
    } catch (err) {
      setCopyTip('❌ 复制失败');
    } finally {
      setTimeout(() => setCopyTip(''), 2000);
    }
  };

  // ========== 新增：打开【新建】弹窗 ==========
  const openCreateModal = () => {
    setCurrentSnippet(null); // 清空编辑项 = 新建模式
    setNewSnippet({
      title: '',
      description: '',
      code: '',
      language: 'javascript',
      tags: '',
      is_public: true
    });
    setShowCreateModal(true);
  };

  // ========== 新增：打开【编辑】弹窗 + 回显数据 ==========
  const openEditModal = (item) => {
    setCurrentSnippet(item); // 绑定当前编辑项
    // 数组标签 → 逗号分隔字符串
    const tagStr = Array.isArray(item.tags) ? item.tags.join(',') : '';
    setNewSnippet({
      title: item.title || '',
      description: item.description || '',
      code: item.code || '',
      language: item.language || 'javascript',
      tags: tagStr,
      is_public: item.is_public ?? true
    });
    setShowCreateModal(true);
  };

  // ========== 新增：删除片段（二次确认） ==========
  const deleteSnippet = async (id) => {
    if (!window.confirm('确定要删除该代码片段？此操作不可恢复！')) return;
    try {
      const { error } = await supabase.from('code_snippets').delete().eq('id', id);
      if (error) throw error;
      await fetchSnippets();
    } catch (err) {
      console.error('删除失败：', err);
      alert('删除失败，请检查权限');
    }
  };

  // ========== 改造：统一 新增/编辑 保存逻辑 ==========
  const saveSnippet = async () => {
    if (!user) {
      alert('请先登录后再操作');
      return;
    }

    // 表单必填校验
    const title = newSnippet.title.trim();
    const code = newSnippet.code.trim();
    if (!title) {
      alert('请填写片段标题');
      return;
    }
    if (!code) {
      alert('代码内容不能为空');
      return;
    }

    try {
      // 字符串标签 → 数据库数组格式
      const tagArr = newSnippet.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      // 组装提交数据
      const submitData = {
        title,
        description: newSnippet.description.trim() || null,
        code,
        language: newSnippet.language,
        tags: tagArr,
        is_public: newSnippet.is_public
      };

      if (currentSnippet) {
        // 编辑模式：更新已有数据
        const { error } = await supabase
          .from('code_snippets')
          .update(submitData)
          .eq('id', currentSnippet.id);
        if (error) throw error;
      } else {
        // 新建模式：插入新数据
        const { error } = await supabase
          .from('code_snippets')
          .insert([{ ...submitData, user_id: user.id }]);
        if (error) throw error;
      }

      // 关闭弹窗 + 刷新列表
      setShowCreateModal(false);
      setCurrentSnippet(null);
      await fetchSnippets();
    } catch (err) {
      console.error('保存失败：', err);
      alert('保存失败，请检查数据或权限');
    }
  };

  // 提取所有标签（去重）
  const allTags = [...new Set(snippets.flatMap(item => item.tags || []))];

  // 重置筛选条件
  const resetFilter = () => {
    setSearchTerm('');
    setSelectedTag('');
  };

  // 空状态组件（全站统一样式）
  const EmptyTip = ({ text }) => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: '#94a3b8',
      fontSize: '15px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px dashed #e2e8f0'
    }}>
      📭 {text}
    </div>
  );

  // 加载页面
  if (loading) {
    return (
      <Layout title="代码片段收藏库">
        <div style={{
          maxWidth: '1200px',
          margin: '60px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '16px'
        }}>
          正在加载代码片段...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="代码片段收藏库">
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: '#f8fafc',
        padding: '32px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 头部：标题 + 新建按钮 */}
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
              color: '#1e293b',
              margin: 0,
              fontWeight: 600
            }}>
              📝 代码片段收藏库
            </h1>

            {user && (
              <button
                onClick={openCreateModal}
                style={{
                  padding: '10px 24px',
                  fontSize: '15px',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#4caf50',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.25)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.25)';
                }}
              >
                ➕ 新建片段
              </button>
            )}
          </div>

          {/* 搜索 + 标签筛选栏 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <input
              type="text"
              placeholder="🔍 搜索标题 / 描述"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                transition: 'border 0.25s ease, box-shadow 0.25s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2196f3';
                e.target.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />

            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                minWidth: '160px',
                cursor: 'pointer'
              }}
            >
              <option value="">🏷️ 全部标签</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <button
              onClick={fetchSnippets}
              style={{
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#2196f3',
                color: '#fff',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'background 0.25s ease'
              }}
              onMouseOver={(e) => e.target.style.background = '#1976d2'}
              onMouseOut={(e) => e.target.style.background = '#2196f3'}
            >
              搜索
            </button>

            {(searchTerm || selectedTag) && (
              <button
                onClick={resetFilter}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'background 0.25s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.background = '#ffffff'}
              >
                重置
              </button>
            )}
          </div>

          {/* 复制成功/失败 悬浮提示 */}
          {copyTip && (
            <div style={{
              position: 'fixed',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              zIndex: 9999
            }}>
              {copyTip}
            </div>
          )}

          {/* 代码片段列表 */}
          {snippets.length === 0 ? (
            <EmptyTip text={searchTerm || selectedTag ? '未匹配到相关代码片段' : '暂无代码片段，快去创建第一条吧'} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '24px'
            }}>
              {snippets.map(snippet => (
                <div
                  key={snippet.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
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
                  {/* 卡片头部 */}
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                        {snippet.title}
                      </h3>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* 复制按钮 */}
                        <button
                          onClick={() => copyCode(snippet.code)}
                          style={{
                            padding: '6px 14px',
                            background: '#2196f3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#1976d2'}
                          onMouseOut={(e) => e.target.style.background = '#2196f3'}
                        >
                          📋 复制代码
                        </button>

                        {/* ========== 仅【创建者】显示 编辑/删除 按钮（权限控制） ========== */}
                        {user && user.id === snippet.user_id && (
                          <>
                            <button
                              onClick={() => openEditModal(snippet)}
                              style={{
                                padding: '6px 14px',
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
                              onClick={() => deleteSnippet(snippet.id)}
                              style={{
                                padding: '6px 14px',
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
                          </>
                        )}
                      </div>
                    </div>

                    {snippet.description && (
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        margin: '10px 0 12px 0',
                        lineHeight: '1.6'
                      }}>
                        {snippet.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#334155'
                      }}>
                        {snippet.language}
                      </span>
                      {snippet.tags?.map(tag => (
                        <span key={tag} style={{
                          padding: '4px 10px',
                          background: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          {tag}
                        </span>
                      ))}
                      {!snippet.is_public && (
                        <span style={{
                          padding: '4px 10px',
                          background: '#fff3e0',
                          color: '#f57c00',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          私有
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 代码高亮区域 */}
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <SyntaxHighlighter
                      language={snippet.language}
                      style={oneDark}
                      customStyle={{ margin: 0, borderRadius: 0, fontSize: '14px' }}
                      showLineNumbers
                    >
                      {snippet.code}
                    </SyntaxHighlighter>
                  </div>

                  {/* 底部统计栏 */}
                  <div style={{
                    padding: '12px 20px',
                    background: '#fafafa',
                    fontSize: '12px',
                    color: '#94a3b8',
                    display: 'flex',
                    gap: '20px'
                  }}>
                    <span>👁 浏览: {snippet.view_count || 0}</span>
                    <span>❤️ 点赞: {snippet.like_count || 0}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      {new Date(snippet.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== 共用弹窗：新建 / 编辑 片段 ========== */}
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
                // 点击遮罩关闭弹窗
                if (e.target === e.currentTarget) setShowCreateModal(false);
              }}
            >
              <div style={{
                width: '100%',
                maxWidth: '600px',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
              }}>
                {/* 动态标题：区分 新增 / 编辑 */}
                <h3 style={{
                  margin: '0 0 24px 0',
                  fontSize: '20px',
                  color: '#1e293b'
                }}>
                  {currentSnippet ? '✍️ 编辑代码片段' : '✍️ 新建代码片段'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    placeholder="片段标题 *"
                    value={newSnippet.title}
                    onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.25s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />

                  <input
                    placeholder="片段描述（选填）"
                    value={newSnippet.description}
                    onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.25s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />

                  <textarea
                    placeholder="代码内容 *"
                    value={newSnippet.code}
                    onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '15px',
                      minHeight: '200px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      transition: 'border 0.25s ease',
                      resize: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                      value={newSnippet.language}
                      onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value })}
                      style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
                      <option value="sql">SQL</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                    </select>

                    <input
                      placeholder="标签（多个用英文逗号分隔）"
                      value={newSnippet.tags}
                      onChange={(e) => setNewSnippet({ ...newSnippet, tags: e.target.value })}
                      style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={newSnippet.is_public}
                      onChange={(e) => setNewSnippet({ ...newSnippet, is_public: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    公开可见（关闭则仅自己可见）
                  </label>

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
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                      onMouseOut={(e) => e.target.style.background = '#ffffff'}
                    >
                      取消
                    </button>
                    <button
                      onClick={saveSnippet}
                      style={{
                        padding: '12px 24px',
                        background: '#4caf50',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#388e3c'}
                      onMouseOut={(e) => e.target.style.background = '#4caf50'}
                    >
                      {currentSnippet ? '保存修改' : '创建片段'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}