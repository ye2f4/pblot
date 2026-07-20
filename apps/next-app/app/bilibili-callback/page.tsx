'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// 哔哩哔哩 OAuth 回调页（App 侧）
// Edge Function 通过 URL fragment 传回 access_token / refresh_token，
// 本页显式解析 fragment 并 setSession 落会话（比依赖 detectSessionInUrl 更稳）。
// 落会话后判断 profiles.username 是否已填：
//   - 缺失（B 站首次登录，无论坛用户名）→ 跳转 /complete-profile 完善信息（流程同注册）
//   - 已存在 → 跳转 /profile 个人中心
export default function BilibiliCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState('哔哩哔哩登录中，正在跳转…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1) 错误参数处理
      const search = new URLSearchParams(window.location.search);
      const biliError = search.get('bili_error');
      if (biliError) {
        setMsg(`哔哩哔哩登录失败：${biliError}`);
        setTimeout(() => router.replace('/login'), 1800);
        return;
      }

      // 2) 从 fragment 解析 token 并落会话
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const frag = new URLSearchParams(hash);
      const access_token = frag.get('access_token');
      const refresh_token = frag.get('refresh_token');

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setMsg(`登录会话建立失败：${error.message}`);
          setTimeout(() => router.replace('/login'), 1800);
          return;
        }
        // 清掉地址栏 fragment，避免刷新重复处理
        window.history.replaceState(null, '', window.location.pathname);
      }

      // 3) 读取当前会话
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        // fragment 可能尚未消化，稍候重试一次
        setTimeout(async () => {
          if (cancelled) return;
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            router.replace('/login');
          } else {
            await routeByProfile(data.session.user.id);
          }
        }, 1200);
        return;
      }

      await routeByProfile(user.id);
    };

    const routeByProfile = async (uid: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', uid)
        .maybeSingle();
      if (cancelled) return;
      const hasUsername = !!(profile?.username && String(profile.username).trim());
      router.replace(hasUsername ? '/profile' : '/complete-profile');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%)',
      }}
    >
      <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
      <div style={{ fontSize: 15, color: '#666' }}>{msg}</div>
    </main>
  );
}
