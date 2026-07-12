import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { supabase, AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE } from '@/supabase/supabaseClient';

export const metadata = {
    ssr: false,
};

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

const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '👦', '👧', '👨', '👩', '👴', '👵', '👨‍💻', '👩‍💻', '🤠', '🥳', '👻', '👽', '🤖', '👸', '🤴',
    '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸', '🐵', '🦄', '🐝'
];

function getPasswordStrength(pwd) {
    let score = 0;
    if (!pwd) return { level: 0, label: '', color: 'transparent' };
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: '弱', color: '#dc3545' };
    if (score <= 3) return { level: 2, label: '中', color: '#ffc107' };
    return { level: 3, label: '强', color: '#34a853' };
}

// 替换成你 user-register 的线上链接
const EDGE_REGISTER_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co/functions/v1/user-register";
const QR_IMAGE_URL = '';

export default function Register() {
    const [step, setStep] = useState(1);
    const [animKey, setAnimKey] = useState(1);

    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nicknameChecking, setNicknameChecking] = useState(false);
    const [nicknameError, setNicknameError] = useState('');

    const [avatar_url, setAvatarUrl] = useState('😀');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [signature, setSignature] = useState('');
    const [gender, setGender] = useState('unknown');
    const [birthday, setBirthday] = useState('');
    const [real_name, setRealName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isSubmitting = useRef(false);

    const strength = getPasswordStrength(password);

    useEffect(() => {
        if (!nickname || nickname.length < 2) {
            setNicknameError('');
            return;
        }
        const timer = setTimeout(async () => {
            setNicknameChecking(true);
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('nickname')
                    .eq('nickname', nickname)
                    .limit(1);
                if (data && data.length > 0) {
                    setNicknameError('该昵称已被占用');
                } else {
                    setNicknameError('');
                }
            } catch (e) {
                setNicknameError('');
            } finally {
                setNicknameChecking(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [nickname]);

    const goStep = (n) => {
        setStep(n);
        setAnimKey(Date.now());
        setError('');
    };

    const validateStep1 = () => {
        if (!username.trim()) { setError('请输入用户名'); return false; }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setError('用户名需 3-20 位，仅支持字母、数字、下划线'); return false; }
        if (!nickname.trim()) { setError('请输入昵称'); return false; }
        if (nicknameError) { setError(nicknameError); return false; }
        if (password.length < 6) { setError('密码至少 6 位'); return false; }
        if (password !== confirmPassword) { setError('两次输入的密码不一致'); return false; }
        return true;
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!validateStep1()) return;
        goStep(2);
    };

    const handleSelectEmoji = (emoji) => {
        setAvatarUrl(emoji);
        setShowEmojiPicker(false);
    };

    const handleRegister = async (skipFillInfo = false) => {
        if (loading || isSubmitting.current) return;

        setLoading(true);
        isSubmitting.current = true;
        setError('');

        try {
            const payload = {
                username: username.toLowerCase(),
                password,
                nickname,
                avatar_url: skipFillInfo ? '😀' : avatar_url,
                signature: skipFillInfo ? '这家伙很懒~' : signature,
                gender: skipFillInfo ? 'unknown' : gender,
                birthday: skipFillInfo ? null : birthday || null,
                real_name: skipFillInfo ? '' : real_name
            };

            const res = await fetch(EDGE_REGISTER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "注册失败");
            }

            goStep(3);

        } catch (err) {
            console.error("完整注册错误：", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setTimeout(() => {
                isSubmitting.current = false;
            }, 1200);
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

    const btnPrimary = {
        padding: '12px',
        background: '#34a853',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        minHeight: 48,
        width: '100%',
    };

    const btnGhost = {
        padding: '12px',
        background: 'transparent',
        color: 'var(--ifm-color-emphasis-600)',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: '8px',
        fontSize: '14px',
        cursor: 'pointer',
        minHeight: 48,
        width: '100%',
    };

    return (
        <Layout title="Monoの小窝 - 注册">
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .step-panel { animation: fadeSlideUp 0.45s ease both; }
                .strength-bar {
                    height: 4px; border-radius: 2px;
                    background: var(--ifm-color-emphasis-200);
                    overflow: hidden; display: flex; gap: 4px;
                }
                .strength-bar span {
                    flex: 1; height: 100%; border-radius: 2px;
                    background: var(--ifm-color-emphasis-200);
                    transition: background .2s;
                }
            `}</style>

            <div style={{
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'var(--ifm-color-emphasis-100)',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: step === 3 ? '720px' : '420px',
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
                        注册 Monoの小窝
                    </h1>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                        {[1, 2, 3].map((s) => (
                            <div key={s} style={{
                                width: s === step ? '28px' : '12px',
                                height: '6px', borderRadius: '3px',
                                background: s <= step ? '#34a853' : 'var(--ifm-color-emphasis-200)',
                                transition: 'all .3s',
                            }} />
                        ))}
                    </div>

                    {error && (
                        <div style={{ color: '#dc3545', textAlign: 'center', marginBottom: '16px' }}>{error}</div>
                    )}

                    {step === 1 && (
                        <form key={animKey} className="step-panel" onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="用户名（3-20位 字母/数字/下划线）"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                style={inputStyle}
                            />
                            <div>
                                <input
                                    type="text"
                                    placeholder="昵称"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    required
                                    disabled={loading}
                                    style={{
                                        ...inputStyle,
                                        borderColor: nicknameError ? '#dc3545' : undefined,
                                    }}
                                />
                                <div style={{ minHeight: '18px', fontSize: '12px', marginTop: '4px' }}>
                                    {nicknameChecking && <span style={{ color: 'var(--ifm-color-emphasis-500)' }}>校验中…</span>}
                                    {nicknameError && <span style={{ color: '#dc3545' }}>{nicknameError}</span>}
                                </div>
                            </div>
                            <div>
                                <input
                                    type="password"
                                    placeholder="密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    style={inputStyle}
                                />
                                {password && (
                                    <div style={{ marginTop: '8px' }}>
                                        <div className="strength-bar">
                                            <span style={{ background: strength.level >= 1 ? strength.color : undefined }} />
                                            <span style={{ background: strength.level >= 2 ? strength.color : undefined }} />
                                            <span style={{ background: strength.level >= 3 ? strength.color : undefined }} />
                                        </div>
                                        <div style={{ fontSize: '12px', marginTop: '4px', color: strength.color }}>
                                            密码强度：{strength.label}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                type="password"
                                placeholder="确认密码"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                style={inputStyle}
                            />
                            <button type="submit" disabled={loading || !!nicknameError} style={btnPrimary}>
                                下一步
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div key={animKey} className="step-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                fontSize: '13px', color: 'var(--ifm-color-emphasis-600)',
                                textAlign: 'center', marginBottom: '4px',
                            }}>
                                以下信息均为非必填，后续可随时在个人中心修改
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    {renderAvatarContent(avatar_url, '/')}
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
                                                        background: avatar_url === emoji ? 'rgba(66,133,244,0.15)' : 'var(--ifm-color-emphasis-100)'
                                                    }}
                                                >
                                                    {emoji}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="头像图片链接（覆盖Emoji头像，可选）"
                                    value={avatar_url}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <input
                                type="text"
                                placeholder="个性签名（可选）"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                style={inputStyle}
                                maxLength={80}
                            />

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                >
                                    <option value="unknown">性别（可选）</option>
                                    <option value="male">男</option>
                                    <option value="female">女</option>
                                </select>
                                <input
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                            </div>

                            <input
                                type="text"
                                placeholder="真实姓名（可选）"
                                value={real_name}
                                onChange={(e) => setRealName(e.target.value)}
                                style={inputStyle}
                            />

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => goStep(1)} style={btnGhost} disabled={loading}>
                                    上一步
                                </button>
                                <button onClick={() => handleRegister(false)} style={btnPrimary} disabled={loading}>
                                    {loading ? '注册中...' : '完成注册'}
                                </button>
                            </div>
                            <button onClick={() => handleRegister(true)} style={{ ...btnGhost, border: 'none', color: 'var(--ifm-color-emphasis-500)' }} disabled={loading}>
                                跳过，先去逛逛
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div key={animKey} className="step-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                                <h2 style={{ margin: '0 0 8px', color: 'var(--ifm-text-color)' }}>注册成功！</h2>
                                <p style={{ color: 'var(--ifm-color-emphasis-600)', margin: '0 0 24px' }}>
                                    欢迎加入 Monoの小窝，现在可以去登录啦～
                                </p>
                                <Link to="/login" style={{
                                    display: 'inline-block', padding: '12px 32px',
                                    background: '#4285f4', color: '#fff',
                                    borderRadius: '8px', textDecoration: 'none',
                                    minHeight: 48, lineHeight: '24px',
                                }}>
                                    立即登录
                                </Link>
                            </div>
                            <div style={{
                                width: '160px', height: '160px',
                                borderRadius: '12px',
                                border: QR_IMAGE_URL ? 'none' : '2px dashed var(--ifm-color-emphasis-300)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--ifm-color-emphasis-500)',
                                fontSize: '12px', textAlign: 'center',
                                flexShrink: 0,
                                overflow: 'hidden'
                            }}>
                                {QR_IMAGE_URL ? (
                                    <img src={QR_IMAGE_URL} alt="二维码" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>二维码<br />预留位</>
                                )}
                            </div>
                        </div>
                    )}

                    {step < 3 && (
                        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--ifm-color-emphasis-600)' }}>
                            已有账号？
                            <Link to="/login" style={{ color: '#4285f4', textDecoration: 'none', marginLeft: 4 }}>
                                立即登录
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}