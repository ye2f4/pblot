import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '../supabase/supabaseClient';
import siteData from '../data/siteData.json';

// 禁用SSR，避免水合错误
export const metadata = {
    ssr: false,
};

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');

    // 获取用户信息
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/pblot/login';
                return;
            }
            setUser(user);
            setNickname(user.user_metadata?.full_name || user.email.split('@')[0]);
            setEmail(user.email);
        };
        getUser();
    }, []);

    // 保存修改
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');
        try {
            const { error } = await supabase.auth.updateUser({
                email,
                data: { full_name: nickname }
            });
            if (error) throw error;
            setMsg(siteData.texts.profile.success);
            setTimeout(() => window.location.href = '/pblot/', 1500);
        } catch (err) {
            setMsg(`${siteData.texts.profile.error}${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Layout title={siteData.siteTitle}>
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
                    {/* 返回首页 */}
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

                    <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '24px' }}>
                        {siteData.texts.profile.title}
                    </h1>

                    {msg && (
                        <div style={{
                            color: msg.includes('成功') ? '#34a853' : '#dc3545',
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}>
                            {msg}
                        </div>
                    )}

                    {/* 修改表单 */}
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            placeholder={siteData.texts.profile.nickname}
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
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
                            type="email"
                            placeholder={siteData.texts.profile.email}
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
                            {loading ? '保存中...' : siteData.texts.profile.save}
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}