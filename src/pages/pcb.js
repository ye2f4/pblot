import React from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import Link from '@docusaurus/Link';

export const metadata = { ssr: false };

export default class PCBPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'parts',
      parts: [],
      pcbProjects: [],
      searchTerm: '',
      loading: true,
      error: null,

      // 元器件弹窗：package 改为 pkg 规避JS保留字
      showPartModal: false,
      currentPart: null,
      partForm: {
        name: '',
        part_number: '',
        description: '',
        pkg: '',       // 前端改用 pkg，不再使用 package
        price: '',
        stock: '',
        datasheet_url: '',
        lcsc_url: ''
      },

      // PCB工程弹窗
      showPcbModal: false,
      currentPcb: null,
      pcbForm: {
        name: '',
        description: '',
        preview_image: '',
        tags: '',
        gerber_url: '',
        bom_url: '',
        schematic_url: ''
      }
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  // 切换标签页 + 清空搜索
  handleTabChange = (tab) => {
    this.setState({
      activeTab: tab,
      searchTerm: ''
    });
  };

  // 全局刷新数据
  refreshData = async () => {
    this.setState({ loading: true, searchTerm: '' }); // 刷新时清空搜索
    await this.fetchData();
  };

  // 拉取所有数据
  fetchData = async () => {
    try {
      const { data: parts, error: partsError } = await supabase
        .from('parts')
        .select('*')
        .order('name');

      if (partsError) throw partsError;

      const { data: pcbProjects, error: pcbError } = await supabase
        .from('pcb_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (pcbError) throw pcbError;

      this.setState({
        parts: parts || [],
        pcbProjects: pcbProjects || [],
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('数据加载失败：', err);
      this.setState({
        loading: false,
        error: '数据加载失败，请稍后重试'
      });
    }
  };

  // ========== 元器件 增/改/删（核心修复：pkg 映射 + 空值处理） ==========
  openAddPartModal = () => {
    this.setState({
      showPartModal: true,
      currentPart: null,
      partForm: {
        name: '',
        part_number: '',
        description: '',
        pkg: '',
        price: '',
        stock: '',
        datasheet_url: '',
        lcsc_url: ''
      }
    });
  };

  openEditPartModal = (item) => {
    this.setState({
      showPartModal: true,
      currentPart: item,
      partForm: {
        name: item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        pkg: item.package || '', // 数据库字段是 package，前端读取到 pkg
        price: item.price ?? '',
        stock: item.stock ?? '',
        datasheet_url: item.datasheet_url || '',
        lcsc_url: item.lcsc_url || ''
      }
    });
  };

  savePart = async () => {
    const { currentPart, partForm } = this.state;
    // 强化校验：过滤空格，禁止纯空内容
    const name = partForm.name.trim();
    const partNumber = partForm.part_number.trim();
    if (!name || !partNumber) {
      alert('名称和型号为必填项，不可为空/空格');
      return;
    }

    // 字段映射：前端 pkg → 数据库 package；空字符串转 null
    const submitData = {
      name: name,
      part_number: partNumber,
      description: partForm.description.trim() || null,
      package: partForm.pkg.trim() || null, // 映射回数据库原始字段 package
      price: partForm.price === '' ? null : Number(partForm.price),
      stock: partForm.stock === '' ? null : Number(partForm.stock),
      datasheet_url: partForm.datasheet_url.trim() || null,
      lcsc_url: partForm.lcsc_url.trim() || null
    };

    try {
      if (currentPart) {
        // 编辑
        const { error } = await supabase.from('parts').update(submitData).eq('id', currentPart.id);
        if (error) throw error;
      } else {
        // 新增
        const { error } = await supabase.from('parts').insert([submitData]);
        if (error) throw error;
      }
      this.setState({ showPartModal: false });
      await this.refreshData(); // 保存后强制刷新
    } catch (e) {
      console.error('保存元器件失败：', e);
      alert(`保存失败：${e.message}`);
    }
  };

  deletePart = async (id) => {
    if (!window.confirm('确定删除该元器件？')) return;
    try {
      await supabase.from('parts').delete().eq('id', id);
      this.refreshData();
    } catch (e) {
      console.error('删除失败：', e);
      alert('删除失败');
    }
  };

  // ========== PCB工程 增/改/删（修复tags冗余代码） ==========
  openAddPcbModal = () => {
    this.setState({
      showPcbModal: true,
      currentPcb: null,
      pcbForm: {
        name: '',
        description: '',
        preview_image: '',
        tags: '',
        gerber_url: '',
        bom_url: '',
        schematic_url: ''
      }
    });
  };

  openEditPcbModal = (item) => {
    this.setState({
      showPcbModal: true,
      currentPcb: item,
      pcbForm: {
        name: item.name || '',
        description: item.description || '',
        preview_image: item.preview_image || '',
        tags: Array.isArray(item.tags) ? item.tags.join(',') : '',
        gerber_url: item.gerber_url || '',
        bom_url: item.bom_url || '',
        schematic_url: item.schematic_url || ''
      }
    });
  };

  savePcb = async () => {
    const { currentPcb, pcbForm } = this.state;
    const name = pcbForm.name.trim();
    if (!name) {
      alert('工程名称为必填项，不可为空/空格');
      return;
    }

    // 标签：英文逗号分割 → 数组
    const tagArr = pcbForm.tags.split(',')
      .map(t => t.trim())
      .filter(t => t);

    const submitData = {
      name: name,
      description: pcbForm.description.trim() || null,
      preview_image: pcbForm.preview_image.trim() || null,
      tags: tagArr,
      gerber_url: pcbForm.gerber_url.trim() || null,
      bom_url: pcbForm.bom_url.trim() || null,
      schematic_url: pcbForm.schematic_url.trim() || null
    };

    try {
      if (currentPcb) {
        const { error } = await supabase.from('pcb_projects').update(submitData).eq('id', currentPcb.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pcb_projects').insert([submitData]);
        if (error) throw error;
      }
      this.setState({ showPcbModal: false });
      await this.refreshData();
    } catch (e) {
      console.error('保存PCB工程失败：', e);
      alert(`保存失败：${e.message}`);
    }
  };

  deletePcb = async (id) => {
    if (!window.confirm('确定删除该PCB工程？')) return;
    try {
      await supabase.from('pcb_projects').delete().eq('id', id);
      this.refreshData();
    } catch (e) {
      console.error('删除失败：', e);
      alert('删除失败');
    }
  };

  // 空状态组件
  renderEmptyTip = (text) => {
    return (
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
  };

  render() {
    const {
      activeTab, parts, pcbProjects, searchTerm, loading, error,
      showPartModal, partForm, showPcbModal, pcbForm
    } = this.state;

    if (loading) {
      return (
        <Layout title="PCB元器件速查">
          <div style={{
            maxWidth: '1200px',
            margin: '60px auto',
            padding: '0 20px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '16px'
          }}>
            正在加载数据...
          </div>
        </Layout>
      );
    }

    if (error) {
      return (
        <Layout title="PCB元器件速查">
          <div style={{
            maxWidth: '1200px',
            margin: '60px auto',
            padding: '0 20px',
            textAlign: 'center',
            color: '#e53935',
            fontSize: '16px'
          }}>
            ❌ {error}
            <button
              onClick={() => this.fetchData()}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
          </div>
        </Layout>
      );
    }

    // 搜索过滤
    const term = searchTerm.toLowerCase().trim();
    const filteredParts = parts.filter(p => {
      const name = (p.name || '').toLowerCase().trim();
      const partNumber = (p.part_number || '').toLowerCase().trim();
      return term === '' || name.includes(term) || partNumber.includes(term);
    });

    const filteredProjects = pcbProjects.filter(p => {
      const name = (p.name || '').toLowerCase().trim();
      const description = (p.description || '').toLowerCase().trim();
      return term === '' || name.includes(term) || description.includes(term);
    });

    return (
      <Layout title="PCB元器件速查">
        <div style={{
          minHeight: 'calc(100vh - 120px)',
          background: '#f8fafc',
          padding: '32px 20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* 头部 */}
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
                🧩 PCB元器件速查
              </h1>
              <p style={{
                color: '#64748b',
                fontSize: '14px',
                margin: '0 0 16px 0'
              }}>
                元器件型号、封装、资料 & 个人PCB工程汇总
              </p>
              <button
                onClick={this.refreshData}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  background: '#2196f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? '加载中...' : '🔄 刷新数据'}
              </button>
            </div>

            {/* 标签页 + 添加按钮 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}>
              <button
                onClick={() => this.handleTabChange('parts')}
                style={{
                  padding: '10px 24px',
                  fontSize: '15px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: activeTab === 'parts' ? '#2196f3' : '#ffffff',
                  color: activeTab === 'parts' ? '#ffffff' : '#334155',
                  boxShadow: activeTab === 'parts'
                    ? '0 4px 12px rgba(33, 150, 243, 0.35)'
                    : '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                元器件库
              </button>
              <button
                onClick={() => this.handleTabChange('pcb')}
                style={{
                  padding: '10px 24px',
                  fontSize: '15px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: activeTab === 'pcb' ? '#2196f3' : '#ffffff',
                  color: activeTab === 'pcb' ? '#ffffff' : '#334155',
                  boxShadow: activeTab === 'pcb'
                    ? '0 4px 12px rgba(33, 150, 243, 0.35)'
                    : '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                我的PCB工程
              </button>
              {activeTab === 'parts' ? (
                <button
                  onClick={this.openAddPartModal}
                  style={{
                    padding: '10px 24px',
                    fontSize: '15px',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#4caf50',
                    color: '#fff'
                  }}
                >
                  ➕ 添加元器件
                </button>
              ) : (
                <button
                  onClick={this.openAddPcbModal}
                  style={{
                    padding: '10px 24px',
                    fontSize: '15px',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#4caf50',
                    color: '#fff'
                  }}
                >
                  ➕ 添加PCB工程
                </button>
              )}
            </div>

            {/* 搜索框 */}
            <input
              type="text"
              placeholder={activeTab === 'parts' ? "🔍 搜索元器件名称 / 型号" : "🔍 搜索PCB工程名称 / 描述"}
              value={searchTerm}
              onChange={(e) => this.setState({ searchTerm: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '15px',
                marginBottom: '32px',
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

            {/* 元器件列表 */}
            {activeTab === 'parts' && (
              <>
                {filteredParts.length === 0 ? (
                  this.renderEmptyTip(term ? `未找到"${searchTerm}"相关元器件` : '元器件库暂无数据')
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '24px'
                  }}>
                    {filteredParts.map(part => (
                      <div
                        key={part.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
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
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b' }}>
                          {part.name}
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px 0' }}>
                          型号：{part.part_number}
                        </p>
                        {part.description && (
                          <p style={{ fontSize: '14px', margin: '0 0 16px 0', color: '#475569', lineHeight: '1.6' }}>
                            {part.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                          <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px' }}>
                            封装：{part.package || '无'}
                          </span>
                          {part.price && (
                            <span style={{ padding: '4px 10px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '6px', fontSize: '12px' }}>
                              ￥{part.price.toFixed(2)}
                            </span>
                          )}
                          {part.stock !== null && (
                            <span style={{
                              padding: '4px 10px',
                              background: part.stock > 0 ? '#e3f2fd' : '#ffebee',
                              color: part.stock > 0 ? '#1976d2' : '#c62828',
                              borderRadius: '6px', fontSize: '12px'
                            }}>
                              库存：{part.stock}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {part.datasheet_url && (
                            <Link to={part.datasheet_url} target="_blank" style={{
                              padding: '8px 16px', background: '#2196f3', color: '#fff',
                              borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                            }}>
                              📄 Datasheet
                            </Link>
                          )}
                          {part.lcsc_url && (
                            <Link to={part.lcsc_url} target="_blank" style={{
                              padding: '8px 16px', background: '#ff9800', color: '#fff',
                              borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                            }}>
                              🛒 立创购买
                            </Link>
                          )}
                          <button onClick={() => this.openEditPartModal(part)} style={{
                            padding: '8px 16px', background: '#9c27b0', color: '#fff',
                            border: 'none', borderRadius: '8px', fontSize: '13px'
                          }}>
                            ✏️ 编辑
                          </button>
                          <button onClick={() => this.deletePart(part.id)} style={{
                            padding: '8px 16px', background: '#dc2626', color: '#fff',
                            border: 'none', borderRadius: '8px', fontSize: '13px'
                          }}>
                            🗑️ 删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* PCB工程列表 */}
            {activeTab === 'pcb' && (
              <>
                {filteredProjects.length === 0 ? (
                  this.renderEmptyTip(term ? `未找到"${searchTerm}"相关PCB工程` : '暂无PCB工程数据')
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                    gap: '24px'
                  }}>
                    {filteredProjects.map(project => (
                      <div
                        key={project.id}
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
                        {project.preview_image && (
                          <img
                            src={project.preview_image}
                            alt={project.name}
                            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                        <div style={{ padding: '24px' }}>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b' }}>
                            {project.name}
                          </h3>
                          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                            {project.description}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            {project.tags?.map(tag => (
                              <span key={tag} style={{
                                padding: '4px 10px', background: '#e3f2fd', color: '#1976d2',
                                borderRadius: '6px', fontSize: '12px'
                              }}>
                                {tag}
                            </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {project.gerber_url && (
                              <Link to={project.gerber_url} target="_blank" style={{
                                padding: '8px 16px', background: '#4caf50', color: '#fff',
                                borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                              }}>
                                📦 Gerber
                              </Link>
                            )}
                            {project.bom_url && (
                              <Link to={project.bom_url} target="_blank" style={{
                                padding: '8px 16px', background: '#ff9800', color: '#fff',
                                borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                              }}>
                                📋 BOM
                              </Link>
                            )}
                            {project.schematic_url && (
                              <Link to={project.schematic_url} target="_blank" style={{
                                padding: '8px 16px', background: '#2196f3', color: '#fff',
                                borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                              }}>
                                📐 原理图
                              </Link>
                            )}
                            <button onClick={() => this.openEditPcbModal(project)} style={{
                              padding: '8px 16px', background: '#9c27b0', color: '#fff',
                              border: 'none', borderRadius: '8px', fontSize: '13px'
                            }}>
                              ✏️ 编辑
                            </button>
                            <button onClick={() => this.deletePcb(project.id)} style={{
                              padding: '8px 16px', background: '#dc2626', color: '#fff',
                              border: 'none', borderRadius: '8px', fontSize: '13px'
                            }}>
                              🗑️ 删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 元器件表单弹窗 */}
            {showPartModal && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '20px', boxSizing: 'border-box'
              }} onClick={(e) => e.target === e.currentTarget && this.setState({ showPartModal: false })}>
                <div style={{
                  width: '100%', maxWidth: '520px', background: '#fff',
                  borderRadius: '16px', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}>
                  <h3 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>
                    {this.state.currentPart ? '编辑元器件' : '新增元器件'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input placeholder="名称 *" value={partForm.name} onChange={e => this.setState({ partForm: { ...partForm, name: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="型号/料号 *" value={partForm.part_number} onChange={e => this.setState({ partForm: { ...partForm, part_number: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    {/* 前端字段改为 pkg */}
                    <input placeholder="封装" value={partForm.pkg} onChange={e => this.setState({ partForm: { ...partForm, pkg: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="单价" type="number" value={partForm.price} onChange={e => this.setState({ partForm: { ...partForm, price: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="库存" type="number" value={partForm.stock} onChange={e => this.setState({ partForm: { ...partForm, stock: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <textarea placeholder="描述" value={partForm.description} onChange={e => this.setState({ partForm: { ...partForm, description: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }} />
                    <input placeholder="Datasheet 链接" value={partForm.datasheet_url} onChange={e => this.setState({ partForm: { ...partForm, datasheet_url: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="立创商城链接" value={partForm.lcsc_url} onChange={e => this.setState({ partForm: { ...partForm, lcsc_url: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button onClick={() => this.setState({ showPartModal: false })} style={{
                        padding: '10px 20px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff'
                      }}>取消</button>
                      <button onClick={this.savePart} style={{
                        padding: '10px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px'
                      }}>保存</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PCB工程表单弹窗 */}
            {showPcbModal && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '20px', boxSizing: 'border-box'
              }} onClick={(e) => e.target === e.currentTarget && this.setState({ showPcbModal: false })}>
                <div style={{
                  width: '100%', maxWidth: '520px', background: '#fff',
                  borderRadius: '16px', padding: '28px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}>
                  <h3 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>
                    {this.state.currentPcb ? '编辑PCB工程' : '新增PCB工程'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input placeholder="工程名称 *" value={pcbForm.name} onChange={e => this.setState({ pcbForm: { ...pcbForm, name: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <textarea placeholder="工程描述" value={pcbForm.description} onChange={e => this.setState({ pcbForm: { ...pcbForm, description: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }} />
                    <input placeholder="预览图URL" value={pcbForm.preview_image} onChange={e => this.setState({ pcbForm: { ...pcbForm, preview_image: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="标签（多个用英文逗号分隔）" value={pcbForm.tags} onChange={e => this.setState({ pcbForm: { ...pcbForm, tags: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="Gerber 文件链接" value={pcbForm.gerber_url} onChange={e => this.setState({ pcbForm: { ...pcbForm, gerber_url: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="BOM 清单链接" value={pcbForm.bom_url} onChange={e => this.setState({ pcbForm: { ...pcbForm, bom_url: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <input placeholder="原理图链接" value={pcbForm.schematic_url} onChange={e => this.setState({ pcbForm: { ...pcbForm, schematic_url: e.target.value } })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button onClick={() => this.setState({ showPcbModal: false })} style={{
                        padding: '10px 20px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff'
                      }}>取消</button>
                      <button onClick={this.savePcb} style={{
                        padding: '10px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px'
                      }}>保存</button>
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
}