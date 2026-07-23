import React, { useEffect } from 'react';
import { useHistory } from '@docusaurus/router';
import { supabase } from '../supabase/supabaseClient';
import { showAlert } from '../utils/dialog';

// 哔哩哔哩 OAuth 回调页
// Edge Function 把 access_token/refresh_token 通过 URL fragment 传回此处，
// 浏览器端 supabase 客户端（detectSessionInUrl=true）会自动抓取 fragment 并落本地会话，
// 触发 onAuthStateChange → syncBilibiliProfile 写入 profiles.bilibili_openid。
// 本页只需等待会话落地后跳回首页即可。
export default function BilibiliCallback() {
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bili_error')) {
      showAlert(`哔哩哔哩登录失败：${params.get('bili_error')}`);
    }

    let timer;
    const goHome = () => {
      // 优先用 SPA 路由回首页，避免整页刷新
      history.replace('/');
    };

    // 登录成功后：B 站账号若缺少论坛用户名（username），
    // 整页跳转到 App 的「完善信息」页（流程同注册）；否则回首页。
    const routeByProfile = async (uid) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', uid)
          .maybeSingle();
        const hasUsername = !!(profile?.username && String(profile.username).trim());
        if (!hasUsername) {
          window.location.href = '/complete-profile';
          return;
        }
      } catch (e) {
        console.error('读取 profile 失败：', e);
      }
      goHome();
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        routeByProfile(data.session.user.id);
      } else {
        // fragment 可能尚未被客户端消化，稍候再重试
        timer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (d2.session) routeByProfile(d2.session.user.id);
            else goHome();
          });
        }, 1200);
      }
    });

    return () => clearTimeout(timer);
  }, [history]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        fontSize: 15,
        color: '#666',
      }}
    >
      <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92, marginRight: 10 }} />
      哔哩哔哩登录中，正在跳转…
    </div>
  );
}
