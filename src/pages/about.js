import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const techStack = [
  { name: 'Docusaurus', desc: '静态站点框架', icon: '📦' },
  { name: 'React 19', desc: '前端UI框架', icon: '⚛️' },
  { name: 'Rspack', desc: '极速构建工具', icon: '⚡' },
  { name: 'Tailwind CSS', desc: '原子化样式', icon: '🎨' },
  { name: 'TypeScript', desc: '类型安全', icon: '📘' },
  { name: 'Supabase', desc: 'BaaS 后端服务', icon: '🗄️' },
  { name: 'PostgreSQL', desc: '关系型数据库', icon: '🐘' },
  { name: 'Edge Functions', desc: 'Deno 边缘函数', icon: '🌐' },
  { name: 'Vercel', desc: '部署与边缘网络', icon: '🚀' },
  { name: 'PWA', desc: '离线应用支持', icon: '📱' },
  { name: 'Mermaid', desc: '图表渲染', icon: '📊' },
  { name: 'Algolia', desc: '全文搜索', icon: '🔍' },
];

const frontendPages = [
  { name: '首页', desc: '统计卡片、轮播、最新用户' },
  { name: '博客系统', desc: 'Docusaurus 内置，支持 RSS' },
  { name: '文档系统', desc: '技术文章、教程文档' },
  { name: '用户系统', desc: '注册 / 登录 / 个人中心' },
  { name: '社区功能', desc: '聊天室、排行榜、评论' },
  { name: '工具箱', desc: '硬件监控、代码片段、PCB' },
  { name: '资源中心', desc: '下载、项目、开发工具' },
  { name: '其他功能', desc: '时光胶囊、日历、绘图' },
];

const coreComponents = [
  'TopBanner 顶部横幅',
  'MiddleStatsCard 统计卡片',
  'PixelClock 像素时钟',
  'WeatherWidget 天气组件',
  'Comments 评论系统',
  'CarouselSection 轮播',
  'RankList 排行榜',
  'TagCloud 标签云',
  'VisitorCount 访客统计',
];

export default function About() {
  return (
    <Layout
      title="关于本站"
      description="Monoの小窝 - 一个专注于技术分享、学习成长的个人站点，基于 Docusaurus + Supabase 全栈架构"
    >
      <div style={{
        minHeight: '70vh',
        padding: '40px 20px 60px',
        background: 'var(--ifm-background-color)',
      }}>

        <div style={{
          maxWidth: '960px',
          margin: '0 auto',
        }}>

          {/* 头部介绍 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '24px',
            border: '1px solid var(--ifm-color-emphasis-200)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{
                fontSize: '32px',
                color: 'var(--ifm-heading-color)',
                margin: '0 0 10px 0',
                fontWeight: 700
              }}>
                关于 Monoの小窝
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
                专注分享 · 持续学习 · 共同成长
              </p>
            </div>

            <hr style={{
              border: 'none',
              height: '1px',
              background: 'var(--ifm-color-emphasis-200)',
              margin: '30px 0'
            }} />

            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
                📌 站点介绍
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: 0 }}>
                这是一个专注于技术教程、编程知识、工具分享的个人技术站点。
                涵盖 ESP32P4 智能手表开发、LVGL 图形库、Meshtastic Mesh 网络、开源硬件、全栈开发等内容。
                致力于为初学者提供清晰易懂的学习资料，为开发者提供实用的开发经验。
                本站持续更新，只为做一个有温度、有价值的技术小窝。
              </p>
            </div>

            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
                👨‍💻 关于作者
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: 0 }}>
                一名热爱编程、持续学习的全栈开发者，专注前端、后端、硬件开发。
                喜欢分享技术、整理笔记、帮助他人。相信技术改变生活，坚持长期主义。
              </p>
            </div>
          </div>

          {/* 技术栈 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '24px',
            border: '1px solid var(--ifm-color-emphasis-200)'
          }}>
            <h2 style={{ fontSize: '22px', color: 'var(--ifm-heading-color)', margin: '0 0 8px 0' }}>
              🛠️ 技术栈
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 24px 0' }}>
              本站采用现代化全栈技术架构，追求极致性能与开发体验
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
              {techStack.map((item) => (
                <div key={item.name} style={{
                  padding: '16px',
                  background: 'var(--ifm-color-emphasis-100)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ifm-text-color)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ifm-color-emphasis-600)', marginTop: '4px' }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 系统架构总览 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '24px',
            border: '1px solid var(--ifm-color-emphasis-200)'
          }}>
            <h2 style={{ fontSize: '22px', color: 'var(--ifm-heading-color)', margin: '0 0 8px 0' }}>
              🏗️ 系统架构总览
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 24px 0' }}>
              前后端分离的 BaaS 架构，基于 Supabase 提供后端能力
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* 客户端层 */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                borderRadius: '12px',
                border: '1px solid #90caf9',
              }}>
                <div style={{ fontWeight: 600, color: '#1565c0', marginBottom: '4px' }}>🌐 客户端层</div>
                <div style={{ fontSize: '14px', color: '#1976d2' }}>
                  浏览器 / PWA 离线支持 / SSR 服务端渲染
                </div>
              </div>

              {/* 前端层 */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                borderRadius: '12px',
                border: '1px solid #a5d6a7',
                marginLeft: '24px',
              }}>
                <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: '4px' }}>🎨 前端应用层</div>
                <div style={{ fontSize: '14px', color: '#388e3c' }}>
                  React 19 + Docusaurus 3.10 + Rspack 构建 + Tailwind CSS
                </div>
              </div>

              {/* 内容层 */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '12px',
                border: '1px solid #ffb74d',
                marginLeft: '48px',
              }}>
                <div style={{ fontWeight: 600, color: '#e65100', marginBottom: '4px' }}>📝 内容层</div>
                <div style={{ fontSize: '14px', color: '#ef6c00' }}>
                  博客系统 / 文档系统 / Markdown MDX / 国际化
                </div>
              </div>

              {/* BaaS层 */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                borderRadius: '12px',
                border: '1px solid #ce93d8',
                marginLeft: '24px',
              }}>
                <div style={{ fontWeight: 600, color: '#6a1b9a', marginBottom: '4px' }}>☁️ Supabase BaaS 后端</div>
                <div style={{ fontSize: '14px', color: '#7b1fa2' }}>
                  Edge Functions (Deno) / Auth 认证 / PostgreSQL 数据库 / RLS 行级安全
                </div>
              </div>

              {/* 部署层 */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
                borderRadius: '12px',
                border: '1px solid #80deea',
              }}>
                <div style={{ fontWeight: 600, color: '#00695c', marginBottom: '4px' }}>🚀 部署与运维</div>
                <div style={{ fontSize: '14px', color: '#00838f' }}>
                  Vercel 边缘部署 / Vercel Analytics / GitHub Actions CI/CD / Playwright E2E
                </div>
              </div>
            </div>
          </div>

          {/* 前端架构 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '24px',
            border: '1px solid var(--ifm-color-emphasis-200)'
          }}>
            <h2 style={{ fontSize: '22px', color: 'var(--ifm-heading-color)', margin: '0 0 8px 0' }}>
              🖥️ 前端架构
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 24px 0' }}>
              组件化开发，模块化管理，共 25+ 页面、30+ 组件
            </p>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--ifm-color-primary)', margin: '0 0 12px 0' }}>
                📄 主要页面模块
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px',
              }}>
                {frontendPages.map((item) => (
                  <div key={item.name} style={{
                    padding: '12px 14px',
                    background: 'var(--ifm-color-emphasis-100)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ifm-text-color)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ifm-color-emphasis-600)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--ifm-color-primary)', margin: '0 0 12px 0' }}>
                🧩 核心组件
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                {coreComponents.map((item) => (
                  <span key={item} style={{
                    padding: '6px 12px',
                    background: 'var(--ifm-color-primary-lightest)',
                    color: 'var(--ifm-color-primary)',
                    borderRadius: '20px',
                    fontSize: '13px',
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 数据库与认证 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* 数据库 */}
            <div style={{
              background: 'var(--ifm-card-background-color)',
              borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              padding: '32px',
              border: '1px solid var(--ifm-color-emphasis-200)'
            }}>
              <h2 style={{ fontSize: '20px', color: 'var(--ifm-heading-color)', margin: '0 0 16px 0' }}>
                🗄️ 数据库设计
              </h2>
              <div style={{ fontSize: '14px', color: 'var(--ifm-text-color)', lineHeight: '1.8' }}>
                <p style={{ margin: '0 0 12px 0' }}>
                  基于 PostgreSQL，主要数据表：
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>profiles</strong> - 用户资料表（用户名、昵称、头像、签名等）</li>
                  <li><strong>auth.users</strong> - Supabase 内置认证用户表</li>
                  <li><strong>visit_stats</strong> - 访问统计表</li>
                </ul>
                <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'var(--ifm-color-emphasis-600)' }}>
                  启用 RLS 行级安全策略，确保数据安全
                </p>
              </div>
            </div>

            {/* 认证体系 */}
            <div style={{
              background: 'var(--ifm-card-background-color)',
              borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              padding: '32px',
              border: '1px solid var(--ifm-color-emphasis-200)'
            }}>
              <h2 style={{ fontSize: '20px', color: 'var(--ifm-heading-color)', margin: '0 0 16px 0' }}>
                🔐 认证体系
              </h2>
              <div style={{ fontSize: '14px', color: 'var(--ifm-text-color)', lineHeight: '1.8' }}>
                <p style={{ margin: '0 0 12px 0' }}>
                  支持两种登录方式：
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>用户名注册登录</strong> - Edge Function 后端创建账号，UUID 虚拟邮箱防冲突</li>
                  <li><strong>GitHub OAuth</strong> - 第三方快捷登录，自动同步用户资料</li>
                </ul>
                <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'var(--ifm-color-emphasis-600)' }}>
                  注册接口带 IP 限流（60秒3次），防止恶意刷注册
                </p>
              </div>
            </div>
          </div>

          {/* Edge Functions */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '24px',
            border: '1px solid var(--ifm-color-emphasis-200)'
          }}>
            <h2 style={{ fontSize: '22px', color: 'var(--ifm-heading-color)', margin: '0 0 8px 0' }}>
              ⚡ Edge Functions 边缘函数
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 24px 0' }}>
              基于 Deno 运行时的 Serverless 边缘函数
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}>
              <div style={{
                padding: '20px',
                background: 'var(--ifm-color-emphasis-100)',
                borderRadius: '12px',
                borderLeft: '4px solid #22c55e',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--ifm-text-color)', marginBottom: '6px' }}>
                  user-register
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', lineHeight: '1.6' }}>
                  用户注册接口，service_role 权限，带 IP 限流防刷，UUID 虚拟邮箱彻底解决重名冲突
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--ifm-color-emphasis-100)',
                borderRadius: '12px',
                borderLeft: '4px solid #3b82f6',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--ifm-text-color)', marginBottom: '6px' }}>
                  get-email-by-username
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', lineHeight: '1.6' }}>
                  登录时根据用户名查询内部邮箱，前端无感知，兼容原生 auth 登录流程
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--ifm-color-emphasis-100)',
                borderRadius: '12px',
                borderLeft: '4px solid #f59e0b',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--ifm-text-color)', marginBottom: '6px' }}>
                  getWeather
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', lineHeight: '1.6' }}>
                  天气数据代理，转发 Open-Meteo API 请求，统一处理跨域与缓存
                </div>
              </div>
            </div>
          </div>

          {/* 联系与反馈 */}
          <div style={{
            background: 'var(--ifm-card-background-color)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px',
            border: '1px solid var(--ifm-color-emphasis-200)',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
              📞 联系与反馈
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: '0 0 20px 0' }}>
              如果你有任何问题、建议或合作意向，欢迎随时联系我！<br />
              📮 邮箱：a5b4c3d2e1-114514@outlook.com 、 mcpianpian118@outlook.com
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/chat/"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: 'var(--ifm-color-primary)',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: '0.2s'
                }}
              >
                💬 留言板
              </a>
              <a
                href="https://github.com/ye2f4"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: '#333',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: '0.2s'
                }}
              >
                ⭐ GitHub
              </a>
              <Link
                to="/"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: 'var(--ifm-color-emphasis-100)',
                  color: 'var(--ifm-color-primary)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: '0.2s'
                }}
              >
                🏠 返回首页
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
