import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    // 定义跳转函数（防止解析失败也能回到首页）
    const redirectToHome = () => {
      window.location.replace('https://ye2f4.github.io/pblot/');
    };

    // 处理登录回调
    const handleCallback = async () => {
      try {
        // 解析 URL 中的 token
        await supabase.auth.getSessionFromUrl();
      } catch (err) {
        console.error('授权解析出错，直接跳转首页', err);
      } finally {
        // 无论解析成功/失败，都强制跳转首页
        redirectToHome();
      }
    };

    // 1. 立即执行解析
    handleCallback();
    // 2. 兜底：3秒后强制跳转，防止卡死
    const timeoutId = setTimeout(redirectToHome, 3000);

    // 清理定时器
    return () => clearTimeout(timeoutId);
  }, []);

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