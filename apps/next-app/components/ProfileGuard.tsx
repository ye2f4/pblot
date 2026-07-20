'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// 白名单：这些页面本身用于登录/注册/完善信息，不能被守卫重定向，否则会死循环。
const WHITELIST = ['/login', '/register', '/complete-profile', '/bilibili-callback'];

// 全站守卫：已登录但缺少论坛 username（如哔哩哔哩首次登录的账号）时，
// 强制先跳转到 /complete-profile 完善信息（流程同注册）。
export default function ProfileGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!pathname || WHITELIST.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return;
      }
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return; // 未登录不干预（各页自行处理）

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;

      const hasUsername = !!(profile?.username && String(profile.username).trim());
      if (!hasUsername) {
        router.replace('/complete-profile');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
