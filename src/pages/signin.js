import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { supabase } from '@site/src/supabase/supabaseClient';

export default function SignIn() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signedToday, setSignedToday] = useState(false);
    const [totalDays, setTotalDays] = useState(0);

    useEffect(() => {
        const initSignData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    const { data } = await supabase
                        .from('sign_ins')
                        .select('total_days, last_sign_date')
                        .eq('user_id', user.id)
                        .single();

                    if (data) {
                        setTotalDays(data.total_days);
                        const today = new Date().toISOString().split('T')[0];
                        setSignedToday(data.last_sign_date === today);
                    }
                }
            } catch (error) {
                console.error('初始化签到数据失败:', error);
            } finally {
                setLoading(false);
            }
        };
        initSignData();
    }, []);

    const handleSign = async () => {
        if (!user || signedToday || loading) return;
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const newTotalDays = totalDays + 1;

        try {
            const { error } = await supabase.from('sign_ins').upsert(
                {
                    user_id: user.id,
                    total_days: newTotalDays,
                    last_sign_date: today,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );
            if (!error) {
                setTotalDays(newTotalDays);
                setSignedToday(true);
            }
        } catch (error) {
            console.error('签到失败:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="每日签到">
                <div style={{
                    minHeight: '70vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--ifm-color-emphasis-100)'
                }}>
                    <p style={{ fontSize: '16px', color: 'var(--ifm-color-emphasis-600)' }}>加载中...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="每日签到" description="用户每日签到，累计云端天数">
            <div style={{
                minHeight: '70vh',
                padding: '40px 20px',
                background: 'var(--ifm-color-emphasis-100)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: '40px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                }}>
                    <h1 style={{ fontSize: '28px', color: 'var(--ifm-text-color)', margin: '0 0 10px 0' }}>
                        📅 每日签到
                    </h1>
                    <p style={{ color: 'var(--ifm-color-emphasis-600)', margin: '0 0 30px 0' }}>
                        累计签到天数 · 云端实时同步
                    </p>

                    {!user ? (
                        <div style={{ marginBottom: '25px' }}>
                            <p style={{ color: '#ff5722', fontSize: '15px' }}>
                                请登录后使用签到功能
                            </p>
                            <Link
                                to="/login"
                                style={{
                                    display: 'inline-block',
                                    padding: '10px 22px',
                                    background: '#4285f4',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    marginTop: '10px',
                                }}
                            >
                                前往登录
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                margin: '0 auto 30px',
                                borderRadius: '50%',
                                background: 'rgba(66,133,244,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4285f4' }}>
                                        {totalDays}
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)' }}>累计天数</div>
                                </div>
                            </div>

                            <button
                                onClick={handleSign}
                                disabled={signedToday || loading}
                                style={{
                                    width: '100%',
                                    padding: '14px 0',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: signedToday ? 'not-allowed' : 'pointer',
                                    background: signedToday ? 'var(--ifm-color-emphasis-300)' : '#4285f4',
                                    color: signedToday ? 'var(--ifm-color-emphasis-600)' : '#fff',
                                    transition: 'all 0.3s ease',
                                    marginBottom: '20px',
                                }}
                            >
                                {signedToday ? '✅ 今日已签到' : '📌 点击签到'}
                            </button>
                        </>
                    )}

                    <Link
                        to="/"
                        style={{
                            display: 'inline-block',
                            padding: '8px 20px',
                            color: '#4285f4',
                            textDecoration: 'none',
                            fontSize: '14px',
                        }}
                    >
                        ← 返回首页
                    </Link>
                </div>
            </div>
        </Layout>
    );
}