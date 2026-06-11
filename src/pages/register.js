import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { supabase } from '../supabase/supabaseClient';

export const metadata = {
    ssr: false,
};

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert('注册成功！请查收邮箱验证，随后登录');
            window.location.href = '/login';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Monoの小窝 - 注册">
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: "var(--ifm-color-emphasis-100)"
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
                            background: 'none',
                            border: 'none',
                            color: 'var(--ifm-color-emphasis-600)',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                            fontSize: '14px',
                        }}
                    >
                        ← 返回首页
                    </Link>

                    <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '24px', color: "var(--ifm-text-color)" }}>注册 Monoの小窝</h1>

                    {error && (
                        <div style={{ color: '#dc3545', textAlign: 'center', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="email"
                            placeholder="邮箱"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                padding: '12px 16px',
                                border: '1px solid var(--ifm-color-emphasis-300)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                minHeight: 48,
                                background: "var(--ifm-card-background-color)",
                                color: "var(--ifm-text-color)"
                            }}
                            aria-label="输入邮箱地址"
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
                                border: '1px solid var(--ifm-color-emphasis-300)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                minHeight: 48,
                                background: "var(--ifm-card-background-color)",
                                color: "var(--ifm-text-color)"
                            }}
                            aria-label="设置密码"
                        />
                        <input
                            type="password"
                            placeholder="确认密码"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                padding: '12px 16px',
                                border: '1px solid var(--ifm-color-emphasis-300)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                minHeight: 48,
                                background: "var(--ifm-card-background-color)",
                                color: "var(--ifm-text-color)"
                            }}
                            aria-label="再次输入密码确认"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px',
                                background: '#34a853',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                minHeight: 48,
                            }}
                            aria-label="完成注册"
                        >
                            {loading ? '注册中...' : '立即注册'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: "var(--ifm-color-emphasis-600)" }}>
                        已有账号？
                        <Link
                            to="/login"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4285f4',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                marginLeft: 4
                            }}
                        >
                            立即登录
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}