import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function AuthCallback() {
  const base = useBaseUrl('');
  
  useEffect(() => {
    const redirectToHome = () => {
      window.location.replace(`${window.location.origin}${base}`);
    };

    const handleCallback = async () => {
      try {
        // 解析URL中的会话信息
        const { error } = await supabase.auth.getSessionFromUrl();
        if (error) {
          console.error('会话解析错误:', error);
          alert('登录失败，请重试');
        }
      } catch (err) {
        console.error('回调处理出错:', err);
      } finally {
        // 无论成功失败，都跳回首页
        redirectToHome();
      }
    };

    // 立即执行回调处理
    handleCallback();
    // 3秒超时兜底
    const timeoutId = setTimeout(redirectToHome, 3000);

    return () => clearTimeout(timeoutId);
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