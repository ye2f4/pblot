// 论坛/社区相关路由集合。
// 由「/app/* 单前缀」改为「根目录多页面」后，用这里的列表判断某个路径是否属于社区页，
// 供全局 Layout（是否渲染 ForumTabs）与 ProfileGuard（是否执行完善资料守卫）复用。
export const APP_ROUTES = [
  '/forum',
  '/chat',
  '/friends',
  '/moments',
  '/submissions',
  '/leaderboard',
  '/capsule',
  '/profile',
  '/community',
  '/login',
  '/register',
  '/complete-profile',
  '/bilibili-callback',
];

export function isAppRoute(pathname: string | undefined | null): boolean {
  if (!pathname) return false;
  return APP_ROUTES.some(
    (r) => pathname === r || pathname === r + '/' || pathname.startsWith(r + '/'),
  );
}
