<<<<<<< HEAD
import React from 'react';
import Link from '@docusaurus/Link';

// 404 页面内容（swizzle 默认大搜索图标）：用 404.gif 作主视觉，绿色主题贴合站点品牌色。
export default function NotFoundContent() {
  return (
    <main className="container margin-vert--xl">
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <img
          src="/img/404.gif"
          alt="404"
          width={220}
          style={{ maxWidth: '70%', marginBottom: 24 }}
        />
        <h1 style={{ color: 'hsl(152 75% 28%)', marginBottom: 12 }}>页面未找到</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginBottom: 24 }}>
          你访问的页面不存在，或已被移动。
        </p>
        <Link className="button button--primary" to="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}
=======
import React from 'react';
import Link from '@docusaurus/Link';

// 404 页面内容（swizzle 默认大搜索图标）：用 404.gif 作主视觉，绿色主题贴合站点品牌色。
export default function NotFoundContent() {
  return (
    <main className="container margin-vert--xl">
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <img
          src="/img/404.gif"
          alt="404"
          width={220}
          style={{ maxWidth: '70%', marginBottom: 24 }}
        />
        <h1 style={{ color: 'hsl(152 75% 28%)', marginBottom: 12 }}>页面未找到</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginBottom: 24 }}>
          你访问的页面不存在，或已被移动。
        </p>
        <Link className="button button--primary" to="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
