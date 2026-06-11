import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function About() {
  return (
    <Layout
      title="关于本站"
      description="一个专注于技术分享、学习成长的个人站点"
    >
      <div style={{
        minHeight: '70vh',
        padding: '40px 20px',
        background: 'var(--ifm-background-color)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        
        <div style={{
          width: '100%',
          maxWidth: '800px',
          background: 'var(--ifm-card-background-color)',
          borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          padding: '40px',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--ifm-color-emphasis-200)'
        }}>

          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '32px', 
              color: 'var(--ifm-heading-color)', 
              margin: '0 0 10px 0',
              fontWeight: 700
            }}>
              关于本站
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

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
              📌 站点介绍
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: 0 }}>
              这是一个专注于技术教程、编程知识、工具分享的个人站点。
              致力于为初学者提供清晰易懂的学习资料，为开发者提供实用的开发经验。
              本站持续更新，只为做一个有温度、有价值的技术小窝。
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
              👨‍💻 关于作者
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: 0 }}>
              一名热爱编程、持续学习的开发者，专注前端、后端、全栈开发。
              喜欢分享技术、整理笔记、帮助他人。相信技术改变生活，坚持长期主义。
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
              🛠️ 本站技术栈
            </h2>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px',
              marginTop: '10px'
            }}>
              {['Docusaurus', 'React', 'JavaScript', 'CSS3', 'HTML5', 'GitHub'].map((item) => (
                <span key={item} style={{
                  padding: '6px 14px',
                  background: 'var(--ifm-color-primary-lightest)',
                  color: 'var(--ifm-color-primary)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--ifm-color-primary)', margin: '0 0 15px 0' }}>
              📞 联系与反馈
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ifm-text-color)', lineHeight: '1.8', margin: 0 }}>
              如果你有任何问题、建议或合作意向，欢迎随时联系我！
            </p>
            <div style={{ marginTop: '15px' }}>
              <Link 
                to="/" 
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'var(--ifm-color-primary)',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ifm-color-primary-darker)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--ifm-color-primary)'}
              >
                返回首页
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}