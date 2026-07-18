import React from 'react';
import Layout from '@theme/Layout';

const sectionStyle = { marginBottom: '28px' };
const h2Style = { fontSize: 18, color: '#1a1a1a', marginBottom: 10, borderLeft: '4px solid #4285f4', paddingLeft: 12 };
const pStyle = { color: '#555', lineHeight: 1.9, margin: '0 0 8px' };
const ulStyle = { color: '#555', lineHeight: 1.9, paddingLeft: 22, margin: '4px 0' };

export default function TermsOfService() {
  return (
    <Layout title="用户服务协议">
      <div style={{
        maxWidth: '860px',
        margin: '40px auto',
        padding: '0 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h1 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          用户服务协议
        </h1>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 40, fontSize: 13 }}>
          最后更新日期：2026-07-13&nbsp;&nbsp;|&nbsp;&nbsp;版本 2.0
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>一、前言与协议接受</h2>
          <p style={pStyle}>
            欢迎使用 Monoの小窝（以下简称"本站"）。本站是个人运营的技术分享与交流平台。
            当您访问、浏览或使用本站提供的任何服务时，即表示您已阅读、理解并同意接受本协议的全部条款。
            如果您不同意本协议的任何内容，请立即停止使用本站。
          </p>
          <p style={pStyle}>
            本站保留在任何时候无需另行通知而修改本协议条款的权利。修改后的协议一经发布即刻生效，
            您继续使用本站服务即视为接受修改后的协议。建议您定期查阅本页面以了解最新条款。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>二、账号注册与管理</h2>
          <ul style={ulStyle}>
            <li>您可通过 <strong>GitHub OAuth</strong> 或邮箱方式注册本站账号。您承诺提供的注册信息真实、准确。</li>
            <li>您应对您的账号安全负责，妥善保管登录凭证，不得将账号出借、转让或出售给第三方。</li>
            <li>因账号被盗用或不当使用造成的损失，由您自行承担；但本站发现异常登录后将尽力协助您恢复账号。</li>
            <li>您可随时在"个人中心"页面修改昵称、头像等个人信息。</li>
            <li>本站保留在不违反法律前提下，拒绝为任何人提供服务的权利。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>三、用户行为规范</h2>
          <p style={pStyle}>您在使用本站时，不得从事以下行为：</p>
          <ul style={ulStyle}>
            <li>发布违反中华人民共和国法律法规的内容，包括但不限于：危害国家安全、煽动颠覆国家政权、破坏国家统一的言论。</li>
            <li>发布淫秽、色情、赌博、暴力、凶杀、恐怖或教唆犯罪的内容。</li>
            <li>发布侮辱或诽谤他人、侵害他人合法权益的内容。</li>
            <li>发布垃圾广告、恶意刷屏、重复无意义内容。</li>
            <li>侵犯他人知识产权（包括著作权、商标权、专利权等）。</li>
            <li>利用技术手段干扰或破坏本站的正常运行，包括但不限于：DDoS攻击、SQL注入、XSS攻击、爬虫恶意抓取等。</li>
            <li>发布虚假信息、诈骗信息或恶意链接。</li>
            <li>试图未经授权访问他人账号、私人数据或本站后台系统。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>四、内容发布与管理</h2>
          <ul style={ulStyle}>
            <li>您通过本站发布的帖子、评论、聊天消息等内容，其著作权归您所有。</li>
            <li>您授予本站一项全球范围内、免费、非独家的使用许可，允许本站为提供服务之目的展示、存储您的内容。</li>
            <li>您应确保您发布的内容不侵犯任何第三方的合法权益。</li>
            <li>本站有权（但无义务）对用户发布的内容进行审核，并有权在不通知的情况下删除违反本协议或法律法规的内容。</li>
            <li>如果您发现任何侵犯您权益的内容，请联系站长处理。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>五、开源项目相关内容</h2>
          <p style={pStyle}>
            本站发布的代码片段、教程和开源项目，在无特殊声明的情况下采用
            <strong> MIT License </strong> 协议授权。您可以自由使用、修改和分发，但须保留原始版权声明。
          </p>
          <p style={pStyle}>
            本站引用的第三方开源代码和资源，其版权归原作者所有，使用时请遵循相应许可证条款。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>六、免责声明</h2>
          <ul style={ulStyle}>
            <li>本站按"原样"提供服务，不对服务的持续性、及时性、安全性、准确性做任何明示或默示的担保。</li>
            <li>本站不对用户之间因交流产生的任何纠纷承担责任。</li>
            <li>您理解并同意，使用本站服务可能受到网络、设备、第三方服务等各种不可抗力因素的影响，本站不对由此造成的服务中断或数据丢失承担责任。</li>
            <li>本站不对因您的使用行为而导致的任何直接、间接、附带、特殊或后果性损失承担责任。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>七、第三方服务</h2>
          <p style={pStyle}>
            本站使用了以下第三方服务，使用这些服务时需同时遵守其各自的条款：
          </p>
          <ul style={ulStyle}>
            <li><strong>Supabase</strong>：提供数据库和身份认证服务</li>
            <li><strong>Vercel</strong>：提供网站托管服务</li>
            <li><strong>GitHub</strong>：提供 OAuth 第三方登录</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>八、账号终止</h2>
          <ul style={ulStyle}>
            <li>您可随时停止使用本站，如需删除账号及所有数据，请联系站长。</li>
            <li>如发现您严重违反本协议，本站有权立即终止您的账号使用权限，并删除相关违规内容。</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>九、法律适用与争议解决</h2>
          <p style={pStyle}>
            本协议的订立、执行和解释及争议的解决均适用中华人民共和国法律。
            如双方就本协议内容或其执行发生任何争议，应首先友好协商解决；协商不成的，
            任何一方均可向本站运营者所在地有管辖权的人民法院提起诉讼。
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>十、联系方式</h2>
          <p style={pStyle}>
            如您对本协议有任何疑问、意见或建议，欢迎通过以下方式联系：<br />
            📧 在站点留言区留言 ｜ 💬 通过聊天页面发送消息给站长<br />
            📮 邮箱：a5b4c3d2e1-114514@outlook.com 、 mcpianpian118@outlook.com
          </p>
        </section>
      </div>
    </Layout>
  );
}
