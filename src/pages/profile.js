import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import siteData from '@/data/siteData.json';
import useIsBrowser from '@docusaurus/useIsBrowser'; // 确保只在浏览器执行

export const metadata = {
    ssr: false,
};

export default function Profile() {
    const isBrowser = useIsBrowser();
    // 🔥 核心修复：原生JS解析URL参数，无需任何路由库
    const targetUid = isBrowser ? new URLSearchParams(window.location.search).get('uid') : null;
    const isViewOther = !!targetUid; // 标记是否查看他人资料

    const [currentUser, setCurrentUser] = useState(null);
    const [user, setUser] = useState(null); // 查看他人时存储目标用户
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // 昵称查重
    const [checkingNick, setCheckingNick] = useState(false);
    const [nickError, setNickError] = useState('');
    const [nickAvailable, setNickAvailable] = useState(false);

    // 密码修改
    const [showPwdForm, setShowPwdForm] = useState(false);
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');

    // Emoji 头像
    const EMOJI_LIST = [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '👦', '👧', '👨', '👩', '👴', '👵', '👨‍💻', '👩‍💻', '🤠', '🥳', '👻', '👽', '🤖', '👸', '🤴',
        '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸', '🐵', '🦄', '🐝'
    ];

    // 用户资料
    const [profile, setProfile] = useState({
        nickname: '',
        email: '',
        signature: '',
        gender: 'unknown',
        birthday: '',
        address: '',
        avatar_url: '😀', // 默认头像
    });

    const genderMap = { unknown: '保密', male: '男', female: '女' };

    // 获取用户信息（自己或他人）
    useEffect(() => {
        const initUser = async () => {
            // 1. 先获取当前登录用户
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                window.location.href = '/pblot/login';
                return;
            }
            setCurrentUser(authUser);

            // 2. 确定要加载的用户ID（自己或他人）
            const targetId = targetUid || authUser.id;
            
            // 3. 加载用户资料
            let { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetId)
                .single();

            if (error && !isViewOther) {
                // 自己的资料不存在时创建默认资料
                const defaultNick = authUser.email.split('@')[0];
                await supabase.from('profiles').upsert({
                    id: authUser.id, nickname: defaultNick, signature: '这家伙很懒~', 
                    gender: 'unknown', avatar_url: '😀'
                });
                profileData = { 
                    nickname: defaultNick, signature: '这家伙很懒~', 
                    gender: 'unknown', avatar_url: '😀', id: authUser.id
                };
            } else if (error) {
                setMsg('❌ 用户不存在');
                return;
            }

            // 4. 存储用户资料和信息
            setProfile({ ...profileData, email: targetUid ? '保密' : authUser.email });
            if (isViewOther) setUser(profileData);
            setNickAvailable(true);
        };
        initUser();
    }, [targetUid, isViewOther]);

    // 昵称查重（仅自己编辑时可用）
    const checkNickname = async (value) => {
        if (isViewOther) return; // 查看他人时禁用编辑功能
        
        if (value === profile.nickname) {
            setNickError('✅ 当前昵称');
            setNickAvailable(true);
            return;
        }
        if (!value || value.length < 2) {
            setNickError('❌ 昵称长度不能小于2位');
            setNickAvailable(false);
            return;
        }
        setCheckingNick(true);
        setNickError('');

        const { data } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('nickname', value)
            .neq('id', currentUser.id)
            .maybeSingle();

        if (data) {
            setNickError('❌ 昵称已被占用');
            setNickAvailable(false);
        } else {
            setNickError('✅ 昵称可用');
            setNickAvailable(true);
        }
        setCheckingNick(false);
    };

    // 修改密码（仅自己可用）
    const handleChangePassword = async () => {
        if (isViewOther) return;
        
        setPwdError('');
        setPwdSuccess('');
        if (!oldPwd || !newPwd || !confirmPwd) {
            setPwdError('请填写完整密码信息');
            return;
        }
        if (newPwd.length < 6) {
            setPwdError('新密码长度不能小于6位');
            return;
        }
        if (newPwd !== confirmPwd) {
            setPwdError('两次输入的新密码不一致');
            return;
        }

        setLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: oldPwd,
            });
            if (signInError) throw new Error('旧密码错误');

            const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
            if (updateError) throw updateError;

            setPwdSuccess('✅ 密码修改成功！');
            setOldPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err) {
            setPwdError(`❌ ${err.message}`);
        }
        setLoading(false);
    };

    // 选择头像（仅自己可用）
    const handleSelectEmoji = async (emoji) => {
        if (isViewOther) return;
        
        setProfile({ ...profile, avatar_url: emoji });
        setShowEmojiPicker(false);
        await supabase.from('profiles').update({ avatar_url: emoji }).eq('id', currentUser.id);
        setMsg('✅ 头像设置成功！');
        setTimeout(() => setMsg(''), 2000);
    };

    // 保存资料（仅自己可用）
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (isViewOther) return;
        
        setMsg('');
        if (!nickAvailable) {
            setMsg('❌ 昵称不可用，请修改');
            return;
        }

        setLoading(true);
        await supabase.from('profiles').update({
            nickname: profile.nickname,
            signature: profile.signature,
            gender: profile.gender,
            birthday: profile.birthday,
            address: profile.address,
        }).eq('id', currentUser.id);
        setMsg('✅ 个人资料保存成功！');
        setLoading(false);
        setTimeout(() => setMsg(''), 2000);
    };

    if (!currentUser) return null;

    return (
        <Layout title={`${isViewOther ? `${profile.nickname}的个人主页` : '个人中心'} - ${siteData.title}`}>
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                padding: '40px 20px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f5 100%)',
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* 返回按钮 */}
                    <button onClick={() => window.history.back()}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#4285f4', color: '#fff', cursor: 'pointer' }}>
                        ← 返回
                    </button>

                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '28px', marginTop: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}>
                        {/* 头像区域 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%', background: '#f0f7ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
                                }}>{profile.avatar_url}</div>
                                
                                {/* 只有自己可以修改头像 */}
                                {!isViewOther && (
                                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        style={{
                                            position: 'absolute', bottom: '0', right: '0', width: '28px', height: '28px',
                                            borderRadius: '50%', background: '#4285f4', color: '#fff', border: 'none', cursor: 'pointer'
                                        }}>⚙️</button>
                                )}

                                {showEmojiPicker && <div style={{
                                    position: 'absolute', top: '90px', left: '0', background: '#fff', borderRadius: '12px', padding: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', flexWrap: 'wrap', gap: '8px',
                                    maxWidth: '320px', maxHeight: '400px', overflowY: 'auto'
                                }}>
                                    {EMOJI_LIST.map((emoji, idx) => (
                                        <div key={idx} onClick={() => handleSelectEmoji(emoji)}
                                            style={{
                                                width: '36px', height: '36px', fontSize: '20px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px',
                                                background: profile.avatar_url === emoji ? '#e0f0ff' : '#f8fafc'
                                            }}>{emoji}</div>
                                    ))}
                                </div>}
                            </div>
                            <div>
                                <h2 style={{ margin: '0', fontSize: '24px' }}>{profile.nickname}</h2>
                                <p style={{ margin: '4px 0', color: '#666' }}>{profile.email}</p>
                                <p style={{ margin: '4px 0', color: '#888' }}>{profile.signature}</p>
                            </div>
                        </div>

                        {msg && <div style={{ padding: '12px', borderRadius: '8px', background: '#d4edda', color: '#155724', marginBottom: '16px' }}>{msg}</div>}

                        {/* 完整个人信息展示 */}
                        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontWeight: '600' }}>昵称</label>
                                <input
                                    type="text" value={profile.nickname}
                                    onChange={(e) => {
                                        setProfile({ ...profile, nickname: e.target.value });
                                        checkNickname(e.target.value);
                                    }}
                                    disabled={isViewOther} // 查看他人时禁用输入
                                    style={{ 
                                        width: '100%', padding: '12px', borderRadius: '8px', 
                                        border: '1px solid #ddd', marginTop: '4px',
                                        backgroundColor: isViewOther ? '#f5f5f5' : 'white'
                                    }}
                                />
                                {!isViewOther && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: nickAvailable ? '#10b981' : '#ef4444' }}>
                                        {checkingNick ? '检查中...' : nickError}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ fontWeight: '600' }}>个性签名</label>
                                <textarea value={profile.signature} onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                                    disabled={isViewOther}
                                    style={{ 
                                        width: '100%', padding: '12px', borderRadius: '8px', 
                                        border: '1px solid #ddd', minHeight: '80px',
                                        backgroundColor: isViewOther ? '#f5f5f5' : 'white'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '600' }}>性别：{genderMap[profile.gender]}</label>
                                    <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                        disabled={isViewOther}
                                        style={{ 
                                            width: '100%', padding: '12px', borderRadius: '8px', 
                                            border: '1px solid #ddd',
                                            backgroundColor: isViewOther ? '#f5f5f5' : 'white'
                                        }}>
                                        <option value="unknown">保密</option>
                                        <option value="male">男</option>
                                        <option value="female">女</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '600' }}>生日</label>
                                    <input type="date" value={profile.birthday} onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                                        disabled={isViewOther}
                                        style={{ 
                                            width: '100%', padding: '12px', borderRadius: '8px', 
                                            border: '1px solid #ddd',
                                            backgroundColor: isViewOther ? '#f5f5f5' : 'white'
                                        }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '600' }}>地区</label>
                                    <input type="text" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                        disabled={isViewOther}
                                        style={{ 
                                            width: '100%', padding: '12px', borderRadius: '8px', 
                                            border: '1px solid #ddd',
                                            backgroundColor: isViewOther ? '#f5f5f5' : 'white'
                                        }} />
                                </div>
                            </div>

                            {/* 只有自己可以保存资料 */}
                            {!isViewOther && (
                                <button type="submit" disabled={loading || isViewOther}
                                    style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#4285f4', color: '#fff', fontSize: '16px' }}>
                                    {loading ? '保存中...' : '💾 保存个人资料'}
                                </button>
                            )}
                        </form>

                        {/* 密码修改（仅自己可见） */}
                        {!isViewOther && (
                            <div style={{ marginTop: '32px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                <button onClick={() => setShowPwdForm(!showPwdForm)}
                                    style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontSize: '16px' }}>
                                    {showPwdForm ? '▼ 收起密码修改' : '▶ 展开密码修改'}
                                </button>

                                {showPwdForm && <div style={{ marginTop: '16px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
                                    {pwdError && <div style={{ padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626' }}>{pwdError}</div>}
                                    {pwdSuccess && <div style={{ padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: '#166534' }}>{pwdSuccess}</div>}

                                    <input type="password" placeholder="当前密码" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                    <input type="password" placeholder="新密码(≥6位)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                    <input type="password" placeholder="确认新密码" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />

                                    <button onClick={handleChangePassword} disabled={loading}
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff' }}>
                                        {loading ? '修改中...' : '🔒 修改密码'}
                                    </button>
                                </div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}