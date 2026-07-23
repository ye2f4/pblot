import React, { useEffect, useState } from 'react';
import { useHistory } from '@docusaurus/router';
import { safeGetUser } from '@/lib/supabase/safe';
import { supabase } from '@/lib/supabase/client';
import ProfileEditor from '@/components/forum/ProfileEditor';

type Profile = {
  username: string;
  nickname: string;
  email: string;
  signature: string;
  gender: string;
  birthday: string;
  address: string;
  avatar_url: string;
  real_name: string;
};

// 由 next-app/profile（SSR）迁移为 Docusaurus 客户端页面：
// 去掉 next/headers cookies()、@/lib/supabase/server createClient；
// 使用 safeGetUser（带超时兜底）+ 浏览器客户端查询 profiles。
export default function ProfilePage() {
  const history = useHistory();
  const [state, setState] = useState<'loading' | 'anon' | 'ready'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      if (active && state === 'loading') setState('anon');
    }, 4000);

    (async () => {
      const { user } = await safeGetUser();
      if (!active) return;
      clearTimeout(t);
      if (!user) {
        setState('anon');
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (!data) {
        history.replace('/complete-profile');
        return;
      }
      setProfile({
        username: data.username || '',
        nickname: data.nickname || '',
        email: data.email || user.email || '',
        signature: data.signature || '',
        gender: data.gender || 'unknown',
        birthday: data.birthday || '',
        address: data.address || '',
        avatar_url: data.avatar_url || '😀',
        real_name: data.real_name || '',
      });
      setState('ready');
    })();

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [history, state]);

  if (state === 'loading') {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--ifm-font-color-base)' }}>加载中…</div>;
  }
  if (state === 'anon') {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--ifm-font-color-base)' }}>
        请先 <a href="/login">登录</a>
      </div>
    );
  }
  if (!profile) return null;
  return <ProfileEditor initialProfile={profile} userId={userId} />;
}
