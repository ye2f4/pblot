import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
// 直接导入你已创建好的 supabase 客户端（核心修改）
import { supabase } from '@site/src/supabase/supabaseClient';

export default function SignIn() {
    // 状态管理
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signedToday, setSignedToday] = useState(false);
    const [totalDays, setTotalDays] = useState(0);

    // 初始化：获取当前登录用户 + 签到数据
    useEffect(() => {
        const initSignData = async () => {
            try {
                // 1. 获取当前登录用户
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                // 2. 用户已登录 → 查询云端签到记录
                if (user) {
                    const { data } = await supabase
                        .from('sign_ins')
                        .select('total_days, last_sign_date')
                        .eq('user_id', user.id)
                        .single();

                    if (data) {
                        setTotalDays(data.total_days);
                        // 判断今日是否已签到
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

    // 核心：云端签到逻辑
    const handleSign = async () => {
        if (!user || signedToday || loading) return;

        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const newTotalDays = totalDays + 1;

        try {
            //  Upsert 更新/插入签到数据（用户唯一）
            const { error } = await supabase.from('sign_ins').upsert(
                {
                    user_id: user.id,
                    total_days: newTotalDays,
                    last_sign_date: today,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' } // 按用户ID冲突更新
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

    // 加载状态
    if (loading) {
        return (
            <Layout title="每日签到">
                <div style={{
                    minHeight: '70vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8f9fa'
                }}>
                    <p style={{ fontSize: '16px', color: '#666' }}>加载中...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="每日签到" description="用户每日签到，累计云端天数">
            <div style={{
                minHeight: '70vh',
                padding: '40px 20px',
                background: '#f8f9fa',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: '40px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                }}>
                    <h1 style={{ fontSize: '28px', color: '#1a1a1a', margin: '0 0 10px 0' }}>
                        📅 每日签到
                    </h1>
                    <p style={{ color: '#666', margin: '0 0 30px 0' }}>
                        累计签到天数 · 云端实时同步
                    </p>

                    {/* 未登录提示 */}
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
                            {/* 累计天数展示 */}
                            <div style={{
                                width: '120px',
                                height: '120px',
                                margin: '0 auto 30px',
                                borderRadius: '50%',
                                background: '#f0f7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4285f4' }}>
                                        {totalDays}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>累计天数</div>
                                </div>
                            </div>

                            {/* 签到按钮 */}
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
                                    background: signedToday ? '#e0e0e0' : '#4285f4',
                                    color: '#fff',
                                    transition: 'all 0.3s ease',
                                    marginBottom: '20px',
                                }}
                            >
                                {signedToday ? '✅ 今日已签到' : '📌 点击签到'}
                            </button>
                        </>
                    )}

                    {/* 返回首页 */}
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