import React, { useState } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { supabase } from '../supabase/supabaseClient';

// 禁用SSR，根治水合错误
export const metadata = {
    ssr: false,
};

export default function Login() {
    const base = useBaseUrl('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 邮箱密码登录
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.href = '/pblot/';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // GitHub登录
    const handleGithubLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: { redirectTo: 'https://ye2f4.github.io/pblot/' }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <Layout title="Monoの小窝">
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%)'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    animation: 'fadeIn 0.6s ease-out'
                }}>
                    {/* 返回首页按钮 */}
                    <button
                        onClick={() => window.location.href = '/pblot/'}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        ← 返回首页
                    </button>

                    <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '24px' }}>登录 Monoの小窝</h1>

                    {error && <div style={{ color: '#dc3545', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}

                    {/* 登录表单 */}
                    <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="email"
                            placeholder="邮箱"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                padding: '12px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                        />
                        <input
                            type="password"
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                padding: '12px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px',
                                background: '#4285f4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? '登录中...' : '邮箱登录'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', margin: '20px 0', color: '#999' }}>或</div>

                    {/* GitHub登录 */}
                    <button
                        onClick={handleGithubLogin}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#333',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub 登录
                    </button>

                    {/* 跳转到注册 */}
                    <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#666' }}>
                        还没有账号？<button
                            onClick={() => window.location.href = '/register'}
                            style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer' }}
                        >立即注册</button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}