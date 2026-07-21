'use client';

import { useEffect, useState } from 'react';
import { supabase } from './client';
import { safeGetUser } from './safe';

// 客户端鉴权 hook：替代 Docusaurus 的 useAuth，供需要"当前用户"的客户端页面使用。
// 服务端页面（profile）改用 @/lib/supabase/server 的 getUser。
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    safeGetUser()
      .then(({ user: u }) => {
        if (active) {
          setUser(u ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
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
