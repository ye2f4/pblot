import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { supabase, AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE } from '@/supabase/supabaseClient';
import useIsBrowser from '@docusaurus/useIsBrowser';
import siteData from '@/data/siteData.json';

export const metadata = {
    ssr: false,
};

// 同TopBanner头像渲染逻辑：兼容网络图片/Emoji/默认兜底
const renderAvatarContent = (avatarStr, baseUrl = '') => {
    if (!avatarStr) {
        return (
            <img
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                src={`${baseUrl}avatar.png`}
                alt="默认头像"
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `${baseUrl}avatar.png`;
                }}
            />
        );
    }
    if (avatarStr.startsWith('http://') || avatarStr.startsWith('https://')) {
        return (
            <img
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                src={avatarStr}
                alt="用户头像"
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `${baseUrl}avatar.png`;
                }}
            />
        );
    }
    return (
        <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            background: 'var(--ifm-color-emphasis-100)'
        }}>
            {avatarStr}
        </div>
    );
};

export default function Profile() {
    const isBrowser = useIsBrowser();
    const targetUid = isBrowser ? new URLSearchParams(window.location.search).get('uid') : null;
    const isViewOther = !!targetUid;

    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pageReady, setPageReady] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [msg, setMsg] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // 昵称校验
    const [checkingNick, setCheckingNick] = useState(false);
    const [nickError, setNickError] = useState('');
    const [nickAvailable, setNickAvailable] = useState(false);

    // 修改密码表单
    const [showPwdForm, setShowPwdForm] = useState(false);
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');

    const EMOJI_LIST = [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '👦', '👧', '👨', '👩', '👴', '👵', '👨‍💻', '👩‍💻', '🤠', '🥳', '👻', '👽', '🤖', '👸', '🤴',
        '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸', '🐵', '🦄', '🐝'
    ];

    // 完整对齐注册页面所有字段
    const [profile, setProfile] = useState({
        username: '',
        nickname: '',
        email: '',
        signature: '',
        gender: 'unknown',
        birthday: '',
        address: '',
        avatar_url: '',
        real_name: ''
    });

    const genderMap = { unknown: '保密', male: '男', female: '女' };

    // 初始化用户信息
    useEffect(() => {
        const initUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            // 查看他人主页无需登录；仅查看/编辑自己主页时才要求登录
            if (!authUser && !isViewOther) {
                window.location.href = '/login';
                return;
            }
            setCurrentUser(authUser);
            const targetId = targetUid || authUser.id;

            // 用 maybeSingle：不存在时返回 null 而不抛错，避免误判
            let { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetId)
                .maybeSingle();

            // 查看自己且资料行缺失（如异地注册触发器未生效的历史账号）：自动补建
            if (!profileData && !isViewOther && authUser) {
                const metaUsername = authUser.user_metadata?.username;
                const defaultNick = metaUsername || '新用户';

                const newRow = {
                    id: authUser.id,
                    username: metaUsername || null,
                    nickname: defaultNick,
                    signature: '这家伙很懒~',
                    gender: 'unknown',
                    avatar_url: '😀',
                    real_name: '',
                    birthday: null,
                    address: ''
                };
                await supabase.from('profiles').upsert(newRow, { onConflict: 'id' });
                profileData = newRow;
            } else if (!profileData) {
                // 查看他人但资料不存在
                setNotFound(true);
                setPageReady(true);
                return;
            }

            setProfile({
                ...profileData,
                username: profileData.username || '',
                real_name: profileData.real_name || '',
                birthday: profileData.birthday ?? "",
                address: profileData.address || '',
                email: isViewOther ? '保密' : (authUser?.email || '')
            });
            setNickAvailable(true);
            setPageReady(true);
        };
        initUser();
    }, [targetUid, isViewOther]);

    // 头像缓存读取
    const avatarEmoji = profile.avatar_url;

    // 昵称查重（防抖独立逻辑，不干扰表单值）
    const checkNickname = async (value) => {
        if (isViewOther) return;
        if (!value || value.length < 2) {
            setNickError('❌ 昵称长度不能小于2位');
            setNickAvailable(false);
            return;
        }
        if (value === profile.nickname) {
            setNickError('✅ 当前昵称');
            setNickAvailable(true);
            return;
        }
        setCheckingNick(true);
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

    // =====【重大修复】Emoji选择：仅修改本地state，不再单独调用数据库！！=====
    const handleSelectEmoji = (emoji) => {
        if (isViewOther) return;
        setProfile(prev => ({ ...prev, avatar_url: emoji }));
        setShowEmojiPicker(false);
    };

    // 表单统一保存【唯一一处写入profiles的主函数】
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (isViewOther) return;
        setMsg('');
        if (!nickAvailable) {
            setMsg('❌ 昵称不可用，请修改');
            return;
        }

        setLoading(true);
        const submitPayload = {
            id: currentUser.id,
            nickname: profile.nickname,
            signature: profile.signature,
            gender: profile.gender,
            birthday: profile.birthday || null,
            address: profile.address,
            real_name: profile.real_name,
            avatar_url: profile.avatar_url
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(submitPayload, { onConflict: 'id' });

        if (error) {
            setMsg(`❌ 保存失败：${error.message}`);
        } else {
            setMsg('✅ 个人资料保存成功！');
            // =====【新增】保存成功触发全局刷新 =====
            const { triggerGlobalProfileRefresh } = require('@site/src/utils/globalProfileUtil');
            await triggerGlobalProfileRefresh();
        }
        setLoading(false);
        setTimeout(() => setMsg(''), 2500);
    };

    // 修改密码
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
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: oldPwd
            });
            if (signInErr) throw new Error('旧密码错误');

            const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
            if (updateErr) throw updateErr;

            setPwdSuccess('✅ 密码修改成功！');
            setOldPwd('');
            setNewPwd('');
            setConfirmPwd('');
        } catch (err) {
            setPwdError(`❌ ${err.message}`);
        }
        setLoading(false);
    };

    if (!pageReady) return null;

    if (notFound) {
        return (
            <Layout title={`用户不存在 - ${siteData.title}`}>
                <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--ifm-color-emphasis-600)' }}>
                    <div style={{ fontSize: '48px' }}>🔍</div>
                    <div style={{ fontSize: '18px' }}>该用户不存在或资料未公开</div>
                    <button
                        onClick={() => window.history.back()}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#4285f4', color: '#fff', cursor: 'pointer' }}
                    >
                        ← 返回
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={`${isViewOther ? `${profile.nickname}的个人主页` : '个人中心'} - ${siteData.title}`}>
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                padding: '40px 20px',
                background: 'var(--ifm-color-emphasis-100)',
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <button
                        onClick={() => window.history.back()}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#4285f4',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        ← 返回
                    </button>

                    <div style={{
                        background: 'var(--ifm-card-background-color)',
                        borderRadius: '16px',
                        padding: '28px',
                        marginTop: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}>
                        {/* 头像区域 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ position: 'relative' }}>
                                {renderAvatarContent(avatarEmoji, '/')}

                                {!isViewOther && (
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        style={{
                                            position: 'absolute',
                                            bottom: '0',
                                            right: '0',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: '#4285f4',
                                            color: '#fff',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        ⚙️
                                    </button>
                                )}

                                {showEmojiPicker && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '90px',
                                        left: '0',
                                        background: 'var(--ifm-card-background-color)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                                        zIndex: 99999,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        maxWidth: '320px',
                                        maxHeight: '400px',
                                        overflowY: 'auto'
                                    }}>
                                        {EMOJI_LIST.map((emoji, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectEmoji(emoji)}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    fontSize: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    background: avatarEmoji === emoji ? 'rgba(66,133,244,0.15)' : 'var(--ifm-color-emphasis-100)'
                                                }}
                                            >
                                                {emoji}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h2 style={{ margin: '0', fontSize: '24px', color: 'var(--ifm-text-color)' }}>
                                    {profile.nickname}
                                </h2>
                                <p style={{ margin: '4px 0', color: 'var(--ifm-color-emphasis-600)' }}>
                                    用户名：{profile.username || '未设置'}
                                </p>
                                <p style={{ margin: '4px 0', color: 'var(--ifm-color-emphasis-600)' }}>
                                    {profile.email}
                                </p>
                                <p style={{ margin: '4px 0', color: 'var(--ifm-color-emphasis-600)' }}>
                                    {profile.signature}
                                </p>
                            </div>
                        </div>

                        {msg && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: msg.includes('✅') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                color: msg.includes('✅') ? '#15803d' : '#dc2626',
                                marginBottom: '16px'
                            }}>
                                {msg}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 昵称 */}
                            <div>
                                <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>昵称</label>
                                <input
                                    type="text"
                                    value={profile.nickname}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setProfile(prev => ({ ...prev, nickname: val }));
                                        clearTimeout(window.nickCheckTimer);
                                        window.nickCheckTimer = setTimeout(() => checkNickname(val), 600);
                                    }}
                                    disabled={isViewOther}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--ifm-color-emphasis-300)',
                                        marginTop: '4px',
                                        backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                        color: 'var(--ifm-text-color)'
                                    }}
                                />
                                {!isViewOther && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: nickAvailable ? '#10b981' : '#ef4444' }}>
                                        {checkingNick ? '检查中...' : nickError}
                                    </div>
                                )}
                            </div>

                            {/* 真实姓名 */}
                            <div>
                                <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>真实姓名</label>
                                <input
                                    type="text"
                                    value={profile.real_name}
                                    onChange={(e) => setProfile(prev => ({ ...prev, real_name: e.target.value }))}
                                    disabled={isViewOther}
                                    placeholder="选填，可随时修改"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--ifm-color-emphasis-300)',
                                        marginTop: '4px',
                                        backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                        color: 'var(--ifm-text-color)'
                                    }}
                                />
                            </div>

                            {/* 头像链接（关键：修改后同步profile.avatar_url） */}
                            <div>
                                <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>头像图片链接（覆盖Emoji头像）</label>
                                <input
                                    type="text"
                                    value={profile.avatar_url}
                                    onChange={(e) => setProfile(prev => ({ ...prev, avatar_url: e.target.value }))}
                                    disabled={isViewOther}
                                    placeholder="输入网络图片链接，为空则使用Emoji头像"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--ifm-color-emphasis-300)',
                                        marginTop: '4px',
                                        backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                        color: 'var(--ifm-text-color)'
                                    }}
                                />
                            </div>

                            {/* 个性签名 */}
                            <div>
                                <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>个性签名</label>
                                <textarea
                                    value={profile.signature}
                                    onChange={(e) => setProfile(prev => ({ ...prev, signature: e.target.value }))}
                                    disabled={isViewOther}
                                    maxLength={80}
                                    placeholder="最多80字"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--ifm-color-emphasis-300)',
                                        minHeight: '80px',
                                        marginTop: '4px',
                                        backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                        color: 'var(--ifm-text-color)'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>性别：{genderMap[profile.gender]}</label>
                                    <select
                                        value={profile.gender}
                                        onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                                        disabled={isViewOther}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ifm-color-emphasis-300)',
                                            marginTop: '4px',
                                            backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                            color: 'var(--ifm-text-color)'
                                        }}
                                    >
                                        <option value="unknown">保密</option>
                                        <option value="male">男</option>
                                        <option value="female">女</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>生日</label>
                                    <input
                                        type="date"
                                        value={profile.birthday}
                                        onChange={(e) => setProfile(prev => ({ ...prev, birthday: e.target.value }))}
                                        disabled={isViewOther}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ifm-color-emphasis-300)',
                                            marginTop: '4px',
                                            backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                            color: 'var(--ifm-text-color)'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontWeight: '600', color: 'var(--ifm-text-color)' }}>地区</label>
                                    <input
                                        type="text"
                                        value={profile.address}
                                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                                        disabled={isViewOther}
                                        placeholder="选填"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ifm-color-emphasis-300)',
                                            marginTop: '4px',
                                            backgroundColor: isViewOther ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                                            color: 'var(--ifm-text-color)'
                                        }}
                                    />
                                </div>
                            </div>

                            {!isViewOther && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#4285f4',
                                        color: '#fff',
                                        fontSize: '16px',
                                        opacity: loading ? 0.7 : 1,
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? '保存中...' : '💾 保存个人资料'}
                                </button>
                            )}
                        </form>

                        {/* 修改密码 */}
                        {!isViewOther && (
                            <div style={{ marginTop: '32px', borderTop: '1px solid var(--ifm-color-emphasis-300)', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setShowPwdForm(!showPwdForm)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#4285f4',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        padding: 0
                                    }}
                                >
                                    {showPwdForm ? '▼ 收起密码修改' : '▶ 展开密码修改'}
                                </button>

                                {showPwdForm && (
                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {pwdError && (
                                            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                                                {pwdError}
                                            </div>
                                        )}
                                        {pwdSuccess && (
                                            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#15803d' }}>
                                                {pwdSuccess}
                                            </div>
                                        )}

                                        <input
                                            type="password"
                                            placeholder="当前密码"
                                            value={oldPwd}
                                            onChange={(e) => setOldPwd(e.target.value)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--ifm-color-emphasis-300)',
                                                background: 'var(--ifm-card-background-color)',
                                                color: 'var(--ifm-text-color)'
                                            }}
                                        />
                                        <input
                                            type="password"
                                            placeholder="新密码(≥6位)"
                                            value={newPwd}
                                            onChange={(e) => setNewPwd(e.target.value)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--ifm-color-emphasis-300)',
                                                background: 'var(--ifm-card-background-color)',
                                                color: 'var(--ifm-text-color)'
                                            }}
                                        />
                                        <input
                                            type="password"
                                            placeholder="确认新密码"
                                            value={confirmPwd}
                                            onChange={(e) => setConfirmPwd(e.target.value)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--ifm-color-emphasis-300)',
                                                background: 'var(--ifm-card-background-color)',
                                                color: 'var(--ifm-text-color)'
                                            }}
                                        />

                                        <button
                                            onClick={handleChangePassword}
                                            disabled={loading}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#dc2626',
                                                color: '#fff',
                                                opacity: loading ? 0.7 : 1,
                                                cursor: loading ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loading ? '修改中...' : '🔒 修改密码'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}