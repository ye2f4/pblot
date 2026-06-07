import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import siteData from '../data/siteData.json';

// 禁用服务端渲染（构建必需，保留）
export const metadata = {
  ssr: false,
};

export default function AuthCallback() {
  useEffect(() => {
    // 跳转至站点首页
    const redirectToHome = () => {
      // 安全取值 + 兜底
      const rootUrl = siteData.siteUrl || "https://ye2f4.github.io";
      const homePath = siteData.basePath || "/pblot/";
      const homeFullUrl = rootUrl + homePath;
      
      window.location.replace(homeFullUrl);
    };

    // 处理授权令牌
    const handleCallback = async () => {
      try {
        if (supabase?.auth) {
          await supabase.auth.getSessionFromUrl();
        }
      } catch (err) {
        console.error('登录回调失败', err);
      } finally {
        // 解析完成立即跳转
        redirectToHome();
      }
    };

    handleCallback();
    // 3秒兜底跳转（防止页面卡死）
    const timer = setTimeout(redirectToHome, 3000);

    // 组件销毁清除定时器
    return () => clearTimeout(timer);
  }, []); // 依赖项清空，只执行一次

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