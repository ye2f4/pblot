import React, { useState } from 'react';
import { useHistory } from '@docusaurus/router';
import { supabase } from '@/lib/supabase/client';
import { SUPABASE_URL } from '@/lib/supabase/config';

// 哔哩哔哩品牌 Logo（小电视）
const BilibiliLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.751h1.166L5.775 4.854a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zM18.25 8.496H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.198 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-9.5 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm6.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z" />
  </svg>
);

// GitHub 品牌 Logo（Octocat mark）
const GitHubLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);


// 由 Docusaurus src/pages/login.js 迁移而来（再经 next-app 中转，现回归 Docusaurus）：
// 去掉 next/navigation，改用 @docusaurus/router；Supabase 复用主站浏览器单例，会话与主站共享。
export default function Login() {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const userNameTrim = username.trim();
      if (!userNameTrim || !password) {
        setError('用户名和密码不能为空');
        setLoading(false);
        return;
      }
      const { data: profile, error: findErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', userNameTrim.toLowerCase())
        .single();
      if (findErr || !profile?.email) throw new Error('');
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      if (error) throw error;
      history.push('/profile');
    } catch {
      setError('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${window.location.origin}/profile`, scopes: 'user:email,read:user' },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(`GitHub 登录失败：${err.message}`);
      setLoading(false);
    }
  };

  // 哔哩哔哩登录（自定义 OAuth，整页跳转 Edge Function，回调页落会话）
  const handleBilibiliLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const feRedirect = `${window.location.origin}/bilibili-callback`;
      const authorizeUrl =
        `${SUPABASE_URL}/functions/v1/bilibili-oauth/authorize?redirect_uri=${encodeURIComponent(feRedirect)}`;
      window.location.href = authorizeUrl;
    } catch (err: any) {
      setError(`哔哩哔哩登录失败：${err.message}`);
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px 16px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14,
    minHeight: 48, background: '#fff', color: '#1a1a1a', width: '100%',
  };

  return (
    <main style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <a href="/" style={{ color: '#666', fontSize: 14 }}>← 返回首页</a>
        <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: 24 }}>登录 Monoの小窝</h1>
        {error && <div role="alert" style={{ color: '#dc3545', textAlign: 'center', marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleUsernameLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input type="text" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} style={inputStyle} autoComplete="username" />
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} style={inputStyle} autoComplete="current-password" />
          <button type="submit" disabled={loading} style={{ padding: 12, background: '#4285f4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, minHeight: 48 }}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>或</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleBilibiliLogin} disabled={loading} style={{ width: '100%', padding: 12, background: '#fa78a0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <BilibiliLogo />
            哔哩哔哩登录
          </button>
          <button onClick={handleGithubLogin} disabled={loading} style={{ width: '100%', padding: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <GitHubLogo />
            GitHub 登录
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
          还没有账号？<a href="/register" style={{ color: '#4285f4' }}>立即注册</a>
        </div>
      </div>
    </main>
  );
}
