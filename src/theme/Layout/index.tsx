import React from 'react';
import OriginalLayout from '@theme-init/Layout';
import { useLocation } from '@docusaurus/router';
import ProfileGuard from '@/components/forum/ProfileGuard';
import ForumTabs from '@/components/forum/ForumTabs';
import { isAppRoute } from '@/lib/appRoutes';

// [DIAGNOSTIC] 临时错误边界：捕获整页渲染期抛错并直接显示到页面，便于在无浏览器控制台的
// 环境下定位 navbar/footer 不加载的真实报错。定位后务必删除。
class RenderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[DIAGNOSTIC] render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            color: '#b00',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            background: '#fffbe6',
            border: '2px solid #b00',
          }}>
          <h2>⚠️ Render Error (diagnostic)</h2>
          <div>
            {String(
              this.state.error.stack ||
                this.state.error.message ||
                this.state.error,
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 全局 Layout 注入：
// - ProfileGuard：已登录但缺论坛 username 时强制去完善（自身按社区路由白名单自限，主站页无副作用）。
// - ForumTabs：仅在社区页顶部显示分区导航（全局 Docusaurus 顶栏已含入口，这里补足分区高亮）。
// 由「next-app 独立应用」回归单 Docusaurus、并去掉 /app 前缀后，用全局 Layout 替代 next-app 的 layout.tsx。
export default function Layout(props: any): JSX.Element {
  const { pathname } = useLocation();
  const isApp = isAppRoute(pathname);
  return (
    <RenderErrorBoundary>
      <ProfileGuard />
      <OriginalLayout {...props}>
        {isApp && <ForumTabs />}
        {props.children}
      </OriginalLayout>
    </RenderErrorBoundary>
  );
}
