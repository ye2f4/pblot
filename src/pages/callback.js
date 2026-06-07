import { useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import useBaseUrl from '@docusaurus/useBaseUrl';
import siteData from '../data/siteData.json';

// 禁用服务端渲染
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