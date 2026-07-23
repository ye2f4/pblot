import React from 'react';
import OriginalLayout from '@theme-init/Layout';
import { useLocation } from '@docusaurus/router';
import ProfileGuard from '@/components/forum/ProfileGuard';
import ForumTabs from '@/components/forum/ForumTabs';
import { isAppRoute } from '@/lib/appRoutes';

// 全局 Layout 注入：
// - ProfileGuard：已登录但缺论坛 username 时强制去完善（自身按社区路由白名单自限，主站页无副作用）。
// - ForumTabs：仅在社区页顶部显示分区导航（全局 Docusaurus 顶栏已含入口，这里补足分区高亮）。
// 由「next-app 独立应用」回归单 Docusaurus、并去掉 /app 前缀后，用全局 Layout 替代 next-app 的 layout.tsx。
export default function Layout(props: any): JSX.Element {
  const { pathname } = useLocation();
  const isApp = isAppRoute(pathname);
  return (
    <>
      <ProfileGuard />
      <OriginalLayout {...props}>
        {isApp && <ForumTabs />}
        {props.children}
      </OriginalLayout>
    </>
  );
}
