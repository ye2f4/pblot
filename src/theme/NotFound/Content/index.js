import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function NotFoundContent({ className }) {
  return (
    <main className={clsx("container margin-vert--xl", className)}>
      <div className="row">
        <div className="col col--6 col--offset-3" style={{ textAlign: 'center' }}>
          <img
            src={useBaseUrl('/design/chirpy/chirpy.png')}
            alt="Chirpy"
            style={{ maxWidth: '300px', marginBottom: '30px' }}
          />
          <Heading as="h1" className="hero__title">
            <Translate
              id="theme.NotFound.title"
              description="The title of the 404 page"
            >
              哎呀，迷路了！
            </Translate>
          </Heading>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
            你要找的页面好像不存在了，或者被小鸟叼走了~
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Link
              to="/"
              style={{
                padding: '10px 24px',
                background: '#4285f4',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              🏠 返回首页
            </Link>
            <Link
              to="/search"
              style={{
                padding: '10px 24px',
                background: '#f0f4ff',
                color: '#4285f4',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              🔍 站内搜索
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}