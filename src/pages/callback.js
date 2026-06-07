import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import useBaseUrl from '@docusaurus/useBaseUrl';
import siteData from '../data/siteData.json';

// 禁用服务端渲染（必须保留，构建不报错）
export const metadata = {
  ssr: false,
};

export default function AuthCallback() {
  const base = useBaseUrl('');

  useEffect(() => {
    // ✅ 核心修复：100%跳转到你的子站点首页，绝不跳根域名
    const redirectToHome = () => {
      // 拼接结果：https://ye2f4.github.io/pblot/
      const homeUrl = `${siteData.siteUrl}${siteData.basePath}`;
      window.location.replace(homeUrl);
    };

    const handleCallback = async () => {
      try {
        // 处理GitHub登录的令牌
        if (supabase?.auth) {
          await supabase.auth.getSessionFromUrl();
        }
      } catch (err) {
        console.error('登录授权失败', err);
      } finally {
        // 授权完成立即跳转
        redirectToHome();
      }
    };

    // 执行登录回调逻辑
    handleCallback();

    // 安全兜底：3秒后强制跳转（防止页面卡死）
    const timer = setTimeout(redirectToHome, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout title={siteData.texts.callback.title}>
      <div style={{
        height: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#333'
      }}>
        {siteData.texts.callback.message}
      </div>
    </Layout>
  );
}