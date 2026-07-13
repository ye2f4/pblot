import React from 'react';
import Layout from '@theme/Layout';

const sectionStyle = { marginBottom: '28px' };
const h2Style = { fontSize: 18, color: '#1a1a1a', marginBottom: 10, borderLeft: '4px solid #34a853', paddingLeft: 12 };
const pStyle = { color: '#555', lineHeight: 1.9, margin: '0 0 8px' };
const ulStyle = { color: '#555', lineHeight: 1.9, paddingLeft: 22, margin: '4px 0' };

export default function PrivacyPolicy() {
  return (
    <Layout title="隐私政策">
      <div style={{
        maxWidth: '860px',
        margin: '40px auto',
        padding: '0 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h1 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          隐私政策
        </h1>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 40, fontSize: 13 }}>
          最后更新日期：2026-07-13&nbsp;&nbsp;|&nbsp;&nbsp;版本 2.0
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>一、信息收集说明</h2>
          <p style={pStyle}>
            本站重视您的隐私保护。我们仅收集提供服务所必需的最少量信息：
          </p>
          <ul style={ulStyle}>
            <li><strong>账号信息</strong>：通过 GitHub OAuth 登录时获取您的 GitHub 公开信息（用户名、头像），以及您主动填写的邮箱和昵称。</li>
            <li><strong>发布内容</strong>：您在论坛发布的帖子、评论、聊天消息、代码片段等内容。</li>
            <li><strong>访问日志</strong>：为保障服务安全和统计访问情况，我们会记录匿名的访问信息（IP地址、浏览器类型、访问页面等）。</li>
            <li><strong>设备信息</strong>：仅在使用硬件监控相关功能时收集您主动上传的设备数据。</li>
          </ul>
          <p style={pStyle}>
            <strong>我们不收集：</strong>个人身份敏感信息（身份证号、银行卡号、精确家庭住址等）、通讯录、相册等隐私数据。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>二、信息使用目的</h2>
          <p style={pStyle}>我们收集的信息仅用于以下合法目的：</p>
          <ul style={ulStyle}>
            <li>提供账号注册、登录和身份认证服务</li>
            <li>展示您的个人主页和发布的内容</li>
            <li>生成访问统计数据以改进网站体验</li>
            <li>预防和检测欺诈、滥用等违规行为</li>
            <li>响应您的请求、反馈和咨询</li>
          </ul>
          <p style={pStyle}>
            我们<strong>不会</strong>将您的信息出售、分享或提供给任何第三方用于营销目的。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>三、信息存储与安全</h2>
          <ul style={ulStyle}>
            <li>您的数据存储在 <strong>Supabase</strong> 云端数据库中，数据在传输和存储过程中均采用加密措施保护。</li>
            <li>账号密码通过 Supabase Auth 进行安全哈希存储，本站不直接接触您的明文密码。</li>
            <li>我们采取合理的技术和管理安全措施以防止未经授权的访问、修改、披露或销毁数据。</li>
            <li>尽管如此，请理解任何网络传输方法或电子存储都无法做到 100% 安全。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>四、Cookie 与追踪技术</h2>
          <p style={pStyle}>
            本站使用必要的 Cookie 来维持您的登录会话和用户偏好设置。
            这些 Cookie 不会用于追踪您的跨站点浏览行为，也不会向第三方透露您的个人身份信息。
          </p>
          <ul style={ulStyle}>
            <li><strong>会话 Cookie</strong>：用于保持登录状态，关闭浏览器后失效。</li>
            <li><strong>本地存储</strong>：存储您的个性化设置（如天气城市、时间偏移等），仅保存在您的设备上。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>五、数据分析与访问统计</h2>
          <p style={pStyle}>
            本站使用自建访问统计系统和 Vercel Analytics 进行匿名化访问分析。
            统计数据仅包含以下非个人身份信息：
          </p>
          <ul style={ulStyle}>
            <li>页面浏览量（PV）和独立访客数（UV）</li>
            <li>浏览器类型和操作系统版本</li>
            <li>大致地理位置（城市级别，不包含精确 GPS 坐标）</li>
            <li>访问来源和停留时间</li>
          </ul>
          <p style={pStyle}>
            您可以通过浏览器设置拒绝 Cookie 或使用隐私模式访问本站，这不会影响基本功能的正常使用。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>六、用户权利</h2>
          <p style={pStyle}>根据相关法律法规，您对您的个人数据享有以下权利：</p>
          <ul style={ulStyle}>
            <li><strong>访问权</strong>：查看我们持有您的哪些信息（个人中心页面可查看基本信息）。</li>
            <li><strong>更正权</strong>：修正您账户中的不准确信息。</li>
            <li><strong>删除权</strong>：请求删除您的账号及所有相关数据。</li>
            <li><strong>数据可携权</strong>：请求导出您的数据副本。</li>
            <li><strong>撤回同意权</strong>：随时撤回数据处理同意（不影响撤回前已进行的合法处理）。</li>
          </ul>
          <p style={pStyle}>
            如需行使上述权利，请在站点留言区留言或通过聊天功能联系站长，我们将在合理时间内响应您的请求。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>七、第三方服务提供商</h2>
          <p style={pStyle}>
            本站使用以下第三方服务，它们各自有独立的隐私政策：
          </p>
          <ul style={ulStyle}>
            <li><strong>Supabase</strong>（数据库/认证）— <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a></li>
            <li><strong>Vercel</strong>（网站托管）— <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">隐私政策</a></li>
            <li><strong>GitHub</strong>（OAuth登录）— <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">隐私政策</a></li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>八、未成年人保护</h2>
          <p style={pStyle}>
            本站主要面向成年技术爱好者群体。我们不会故意收集未满14周岁儿童的个人信息。
            如果您是未成年人的监护人，发现被监护人未经同意向我们提供了个人信息，请立即联系我们，
            我们将及时删除相关数据。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>九、政策更新</h2>
          <p style={pStyle}>
            我们可能会不时调整本隐私政策以反映实践变化或法律法规要求。更改后的政策将在本页面发布，
            并在页面顶部注明更新日期。对于实质性变更，我们会通过站点公告通知您。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>十、联系方式</h2>
          <p style={pStyle}>
            如果您对本隐私政策有任何疑问、担忧或要求行使您的数据权利，请联系：<br />
            📧 通过站点留言区留言 ｜ 💬 通过聊天页面联系站长
          </p>
        </section>
      </div>
    </Layout>
  );
}
