import React from 'react';
import Layout from '@theme/Layout';

export default function TermsOfService() {
  return (
    <Layout title="用户协议">
      <div style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '0 20px',
        lineHeight: '1.8'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>用户服务协议</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px' }}>
          最后更新日期：{new Date().toLocaleDateString()}
        </p>

        <section style={{ marginBottom: '30px' }}>
          <h2>一、协议接受</h2>
          <p>通过访问和使用本网站，您同意遵守本用户协议的所有条款和条件。如果您不同意这些条款，请不要使用本网站。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>二、账号注册与使用</h2>
          <ul>
            <li>您需要提供真实、准确、完整的注册信息</li>
            <li>您对您的账号和密码安全负责</li>
            <li>您不得将账号转让或出售给他人</li>
            <li>我们有权在未经通知的情况下删除违反本协议的账号</li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>三、用户行为规范</h2>
          <p>您同意在使用本网站时不从事以下行为：</p>
          <ul>
            <li>发布违法、淫秽、暴力、诽谤或其他有害内容</li>
            <li>侵犯他人的知识产权或其他合法权利</li>
            <li>发送垃圾信息、广告或其他未经请求的内容</li>
            <li>干扰或破坏网站的正常运行</li>
            <li>未经授权访问他人账号或数据</li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>四、内容所有权</h2>
          <p>您对您发布的内容保留所有权。但您授予我们永久、免费、不可撤销的使用权，允许我们在本网站上展示、复制、分发和修改您的内容。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>五、免责声明</h2>
          <p>本网站按"原样"提供，不提供任何明示或暗示的保证。我们不对网站的可用性、准确性、可靠性或安全性承担任何责任。</p>
          <p>在法律允许的最大范围内，我们不对任何直接、间接、附带、特殊或后果性损害承担责任。</p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2>六、协议修改</h2>
          <p>我们保留随时修改本协议的权利。修改后的协议将在本页面发布，自发布之日起生效。继续使用本网站即表示您接受修改后的协议。</p>
        </section>

        <section>
          <h2>七、法律适用</h2>
          <p>本协议受中华人民共和国法律管辖。因本协议引起的任何争议，应提交至本网站运营者所在地有管辖权的人民法院诉讼解决。</p>
        </section>
      </div>
    </Layout>
  );
}