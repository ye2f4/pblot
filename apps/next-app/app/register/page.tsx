'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

function getPasswordStrength(pwd: string) {
  let score = 0;
  if (!pwd) return { label: '', color: 'transparent' };
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: '弱', color: '#dc3545' };
  if (score <= 3) return { label: '中', color: '#ffc107' };
  return { label: '强', color: '#34a853' };
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  fontSize: '14px',
  minHeight: 48,
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '12px',
  background: '#34a853',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  minHeight: 48,
  width: '100%',
};

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (!nickname || nickname.length < 2) {
      setNicknameError('');
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .limit(1);
      setNicknameError(data && data.length > 0 ? '该昵称已被占用' : '');
    }, 500);
    return () => clearTimeout(t);
  }, [nickname]);

  const validateStep1 = () => {
    if (!username.trim()) { setError('请输入用户名'); return false; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setError('用户名需 3-20 位，仅支持字母、数字、下划线'); return false; }
    if (!nickname.trim()) { setError('请输入昵称'); return false; }
    if (nicknameError) { setError(nicknameError); return false; }
    if (!email.trim()) { setError('请填写电子邮箱'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('邮箱格式不正确'); return false; }
    if (password.length < 6) { setError('密码至少 6 位'); return false; }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return false; }
    return true;
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || loading) return;
    setLoading(true);
    setError('');
    try {
      const lowerName = username.toLowerCase();
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: lowerName } },
      });
      if (signErr) throw signErr;
      if (!data?.user) throw new Error('注册失败');
      setCurrentUser(data.user);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (skip = false) => {
    if (loading || !currentUser) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        id: currentUser.id,
        username: username.toLowerCase(),
        nickname,
        avatar_url: '😀',
        signature: skip ? '这家伙很懒~' : '',
        gender: 'unknown',
        email,
      };
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: step === 3 ? 720 : 420, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <a href="/" style={{ color: '#666', fontSize: 14, textDecoration: 'none' }}>← 返回首页</a>
        <h1 style={{ textAlign: 'center', marginTop: 16, fontSize: 24 }}>注册 Monoの小窝</h1>

        {error && <div style={{ color: '#dc3545', textAlign: 'center', margin: '12px 0' }}>{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <input style={inputStyle} placeholder="用户名（3-20位 字母/数字/下划线）" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} />
            <input style={inputStyle} placeholder="昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} required disabled={loading} />
            <input style={inputStyle} type="email" placeholder="电子邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            <div>
              <input style={inputStyle} type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 2, background: '#eee', overflow: 'hidden', display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((i) => (
                      <span key={i} style={{ flex: 1, background: strength.label && strength.color }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: strength.color }}>密码强度：{strength.label}</div>
                </div>
              )}
            </div>
            <input style={inputStyle} type="password" placeholder="确认密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
            <button type="submit" disabled={loading} style={btnPrimary}>下一步</button>
          </form>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: '#666', textAlign: 'center', margin: 0 }}>以下步骤可选，可稍后在个人中心补充</p>
            <button onClick={() => handleFinish(false)} disabled={loading} style={btnPrimary}>{loading ? '保存中...' : '完成注册'}</button>
            <button onClick={() => handleFinish(true)} disabled={loading} style={{ ...btnPrimary, background: 'transparent', color: '#666', border: '1px solid #ccc' }}>跳过，先去逛逛</button>
          </div>
        )}

        {step === 3 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2>注册成功！</h2>
            <p style={{ color: '#666' }}>欢迎加入 Monoの小窝，现在可以去登录啦～</p>
            <div style={{ marginTop: 16 }}>
              <Link href="/login" style={{ display: 'inline-block', padding: '12px 32px', background: '#4285f4', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>立即登录</Link>
            </div>
          </div>
        )}

        {step < 3 && (
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
            已有账号？<a href="/app/login" style={{ color: '#4285f4', textDecoration: 'none', marginLeft: 4 }}>立即登录</a>
          </div>
        )}
      </div>
    </main>
  );
}
