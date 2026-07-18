import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { supabase } from '@/supabase/supabaseClient';
import siteData from '@/data/siteData.json';

export const metadata = {
    ssr: false,
    title: '登录 | Monoの小窝',
    description: '登录 Monoの小窝，参与评论、聊天与社区互动。',
};

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUsernameLogin = async (e) => {
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

            // 前端直接查询 profiles 通过用户名拿到邮箱（不再调用Edge）
            const { data: profile, error: findErr } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', userNameTrim.toLowerCase())
                .single();

            if (findErr || !profile?.email) {
                throw new Error('');
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password,
            });
            if (error) throw error;

            window.location.assign(`${siteData.siteUrl}/`);
        } catch (err) {
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
                options: {
                    redirectTo: window.location.origin,
                    scopes: 'user:email,read:user',
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(`GitHub 登录失败：${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        padding: '12px 16px',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: '8px',
        fontSize: '14px',
        minHeight: 48,
        background: 'var(--ifm-card-background-color)',
        color: 'var(--ifm-text-color)',
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <Layout title="登录 - Monoの小窝" description="登录 Monoの小窝，使用用户名或 GitHub 账号登录">
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%)',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                }}>
                    <Link
                        to="/"
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--ifm-color-emphasis-600)',
                            cursor: 'pointer', marginBottom: '20px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            textDecoration: 'none', fontSize: '14px',
                        }}
                    >
                        ← 返回首页
                    </Link>

                    <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '24px', color: 'var(--ifm-text-color)' }}>
                        登录 Monoの小窝
                    </h1>

                    {error && (
                        <div role="alert" style={{ color: '#dc3545', textAlign: 'center', marginBottom: '16px' }}>{error}</div>
                    )}

                    <form onSubmit={handleUsernameLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            placeholder="用户名"
                            aria-label="用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                            style={inputStyle}
                            autoComplete="username"
                        />
                        <input
                            type="password"
                            placeholder="密码"
                            aria-label="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            style={inputStyle}
                            autoComplete="current-password"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px', background: '#4285f4', color: '#fff',
                                border: 'none', borderRadius: '8px', fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1, minHeight: 48,
                            }}
                        >
                            {loading ? '登录中...' : '登录'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--ifm-color-emphasis-600)' }}>或</div>

                    <button
                        onClick={handleGithubLogin}
                        disabled={loading}
                        aria-label="使用 GitHub 账号登录"
                        style={{
                            width: '100%', padding: '12px', background: '#333', color: '#fff',
                            border: 'none', borderRadius: '8px', fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', opacity: loading ? 0.7 : 1, minHeight: 48,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub 登录
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--ifm-color-emphasis-600)' }}>
                        还没有账号？
                        <Link to="/register" style={{ color: '#4285f4', textDecoration: 'none' }}>立即注册</Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}