import { useEffect, useState } from 'react';
import { supabase } from './client';
import { safeGetSession } from './safe';

// 由 next-app/lib/supabase/useUser.ts 迁移（Docusaurus 纯客户端环境）。
// 暴露当前用户、profile、登录态与「是否已完善资料」。
export function useUser(options: { required?: boolean; redirectTo?: string } = {}) {
  const { required = true, redirectTo } = options;
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { user } = await safeGetSession();
      if (!active) return;
      if (!user) {
        if (required && redirectTo) window.location.href = redirectTo;
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, nickname, avatar_url, signature, email')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      setProfile(profile);
      setIsProfileComplete(!!(profile?.username && String(profile.username).trim()));
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await supabase
          .from('profiles')
          .select('username, nickname, avatar_url, signature, email')
          .eq('id', session.user.id)
          .maybeSingle();
        if (active) {
          setProfile(p);
          setIsProfileComplete(!!(p?.username && String(p?.username).trim()));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsProfileComplete(true);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [required, redirectTo]);

  return { user, profile, loading, isProfileComplete };
}
