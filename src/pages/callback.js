// src/pages/callback.js
import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    // 处理 Supabase 登录回调
    const handleCallback = async () => {
      // 解析 URL 中的 token
      await supabase.auth.getSessionFromUrl();
      // 解析完成后，跳转到干净的首页
      window.location.replace('https://ye2f4.github.io/pblot/');
    };

    handleCallback();
  }, []);

  return (
    <Layout title="登录中...">
      <div style={{
        height: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18
      }}>
        ✅ 登录成功，正在返回首页...
      </div>
    </Layout>
  );
}