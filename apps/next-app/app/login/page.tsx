'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// 由 Docusaurus src/pages/login.js 迁移而来：
// 去除 @theme/Layout / @docusaurus/Link，改用 next 的布局与 next/navigation；
// Supabase 客户端改用 @supabase/ssr 的浏览器单例（会话写入 cookie，可被 SSR 识别）。
export default function Login() {
  const router = useRouter();
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
      router.push('/profile');
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
        options: { redirectTo: `${window.location.origin}/app/profile`, scopes: 'user:email,read:user' },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(`GitHub 登录失败：${err.message}`);
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
        <button onClick={handleGithubLogin} disabled={loading} style={{ width: '100%', padding: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, minHeight: 48 }}>
          GitHub 登录
        </button>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
          还没有账号？<a href="/app/register" style={{ color: '#4285f4' }}>立即注册</a>
        </div>
      </div>
    </main>
  );
}
