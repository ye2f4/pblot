import React from 'react';
import Layout from '@theme/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout title="隐私政策">
      <div style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '0 20px',
        lineHeight: '1.8'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>隐私政策</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px' }}>
          最后更新日期：{new Date().toLocaleDateString()}
        </p>

        <section style={{ marginBottom: '30px' }}>
          <h2>一、信息收集</h2>
          <p>我们仅收集您主动提供的信息，包括：</p>
          <ul>
            <li>注册账号时提供的邮箱地址、昵称</li>
            <li>您发布的评论、聊天消息、代码片段等内容</li>
            <li>您上传的设备数据（硬件监控功能）</li>
          </ul>
          <p>我们不会自动收集任何个人敏感信息，也不会将您的信息出售给第三方。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>二、信息使用</h2>
          <p>我们收集的信息仅用于：</p>
          <ul>
            <li>提供账号登录和身份验证服务</li>
            <li>展示您发布的内容</li>
            <li>改进网站功能和用户体验</li>
            <li>响应您的咨询和请求</li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>三、信息存储与保护</h2>
          <p>您的所有数据存储在 Supabase 云数据库中，采用行业标准的加密技术保护。我们会采取合理的技术和管理措施，防止您的信息被未经授权的访问、使用或泄露。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>四、Cookie 使用</h2>
          <p>本网站使用必要的 Cookie 来维持您的登录状态和会话信息。我们不会使用 Cookie 追踪您的浏览行为或收集个人信息。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>五、用户权利</h2>
          <p>您有权：</p>
          <ul>
            <li>访问、更正您的个人信息</li>
            <li>删除您的账号和所有相关数据</li>
            <li>撤回同意</li>
            <li>导出您的数据</li>
          </ul>
          <p>如需行使上述权利，请通过网站留言联系我们。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>六、第三方服务</h2>
          <p>本网站使用以下第三方服务：</p>
          <ul>
            <li>Supabase：数据库和身份验证服务</li>
            <li>GitHub Pages：网站托管服务</li>
            <li>Google Fonts：字体服务</li>
          </ul>
          <p>这些第三方服务有各自独立的隐私政策，我们不对其行为负责。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>七、未成年人保护</h2>
          <p>本网站不向未满18周岁的未成年人提供服务。如果您是未成年人，请不要使用本网站。</p>
        </section>

        <section>
          <h2>八、政策更新</h2>
          <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，自发布之日起生效。</p>
        </section>
      </div>
    </Layout>
  );
}