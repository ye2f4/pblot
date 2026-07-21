<<<<<<< HEAD
'use client';

import { useEffect, useState } from 'react';
import { supabase } from './client';

// 客户端鉴权 hook：替代 Docusaurus 的 useAuth，供需要"当前用户"的客户端页面使用。
// 服务端页面（profile）改用 @/lib/supabase/server 的 getUser。
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
=======
'use client';

import { useEffect, useState } from 'react';
import { supabase } from './client';

// 客户端鉴权 hook：替代 Docusaurus 的 useAuth，供需要"当前用户"的客户端页面使用。
// 服务端页面（profile）改用 @/lib/supabase/server 的 getUser。
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
