import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import useBaseUrl from '@docusaurus/useBaseUrl';

// 🔥 关键：禁用服务端渲染（Docusaurus v3 标准写法）
export const metadata = {
  ssr: false,
};

export default function AuthCallback() {
  const base = useBaseUrl('');
  
  useEffect(() => {
    const redirectToHome = () => {
      window.location.replace(`${window.location.origin}${base}`);
    };

    const handleCallback = async () => {
      try {
        // 仅客户端执行
        if (supabase?.auth) {
          await supabase.auth.getSessionFromUrl();
        }
      } catch (err) {
        console.error('登录回调失败', err);
      } finally {
        redirectToHome();
      }
    };

    handleCallback();
    setTimeout(redirectToHome, 3000);
  }, [base]);

  return (
    <Layout title="登录中...">
      <div style={{
        height: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#333'
      }}>
        ✅ 登录成功，正在返回首页...
      </div>
    </Layout>
  );
}