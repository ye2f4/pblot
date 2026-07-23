import { useEffect } from 'react';
import { useLocation, useHistory } from '@docusaurus/router';
import { supabase } from '@/lib/supabase/client';
import { safeGetSession } from '@/lib/supabase/safe';
import { isAppRoute } from '@/lib/appRoutes';

// 白名单：这些页面本身用于登录/注册/完善信息，不能被守卫重定向，否则会死循环。
const WHITELIST = ['/login', '/register', '/complete-profile', '/bilibili-callback'];

// 全站守卫：已登录但缺少论坛 username（如哔哩哔哩首次登录的账号）时，
// 强制先跳转到 /complete-profile 完善信息（流程同注册）。
// 由 next-app ProfileGuard 迁移到 Docusaurus 路由（@docusaurus/router）。
export default function ProfileGuard() {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const pathname = location.pathname;
      // 仅守护社区页；主站页面（博客/文档等）即使用户缺论坛 username 也不干预。
      if (!isAppRoute(pathname)) {
        return;
      }
      if (
        WHITELIST.some((p) => pathname === p || pathname.startsWith(p + '/'))
      ) {
        return;
      }
      const { session } = await safeGetSession();
      const user = session?.user;
      if (!user) return; // 未登录不干预（各页自行处理）

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;

      const hasUsername = !!(profile?.username && String(profile.username).trim());
      if (!hasUsername) {
        history.replace('/complete-profile');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, history]);

  return null;
}
