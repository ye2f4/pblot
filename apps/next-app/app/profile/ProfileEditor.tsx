'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type Profile = {
  username: string;
  nickname: string;
  email: string;
  signature: string;
  gender: string;
  birthday: string;
  address: string;
  avatar_url: string;
  real_name: string;
};

const EMOJI_LIST = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😍','🤩','🥰','👦','👧','👨','👩','🐶','🐱','🐼','🦁','🐯','🦄','🐝','👻','🤖','👽'];
const genderMap: Record<string, string> = { unknown: '保密', male: '男', female: '女' };

// 由 Docusaurus src/pages/profile.js 迁移（客户端编辑部分）：
// 去 @theme/Layout / useIsBrowser / ContributionHeatmap / globalProfileUtil；Supabase 改用 @supabase/ssr 单例
export default function ProfileEditor({ initialProfile, userId }: { initialProfile: Profile; userId: string }) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState({ old: '', next: '' });

  const inputStyle: React.CSSProperties = { padding: '10px 14px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, minHeight: 44, background: '#fff', color: '#1a1a1a', width: '100%' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' };
  const fieldStyle: React.CSSProperties = { marginBottom: 16 };

  const handleChange = (key: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const saveProfile = async () => {
    setSaving(true);
    setError(''); setMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: profile.nickname.trim(),
          signature: profile.signature,
          gender: profile.gender,
          birthday: profile.birthday || null,
          address: profile.address,
          avatar_url: profile.avatar_url,
          real_name: profile.real_name,
        })
        .eq('id', userId);
      if (error) throw error;
      setMessage('保存成功 ✅');
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const checkNickname = async (val: string) => {
    const v = val.trim();
    if (!v) { setError(''); return; }
    if (!/^[一-龥a-zA-Z0-9_]{1,20}$/.test(v)) { setError('昵称格式不合法'); return; }
    const { data } = await supabase.from('profiles').select('id').eq('nickname', v).neq('id', userId).maybeSingle();
    setError(data ? '昵称已被占用' : '');
  };

  const changePassword = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      if (!pwd.old || !pwd.next) throw new Error('请填写完整');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('会话缺失');
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwd.old });
      if (reauthErr) throw new Error('原密码错误');
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw error;
      setMessage('密码已修改 ✅'); setPwd({ old: '', next: '' });
    } catch (e: any) {
      setError(e.message || '修改失败');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/app/login';
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>个人中心</h1>

      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEmoji((s) => !s)} style={{ fontSize: 40, border: 'none', background: 'transparent', cursor: 'pointer' }}>{profile.avatar_url}</button>
          {showEmoji && (
            <div style={{ position: 'absolute', top: 56, left: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 8, padding: 8, zIndex: 10, maxWidth: 240 }}>
              {EMOJI_LIST.map((e) => (
                <button key={e} onClick={() => { handleChange('avatar_url', e); setShowEmoji(false); }} style={{ fontSize: 22, border: 'none', background: 'transparent', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{profile.nickname}</div>
          <div style={{ fontSize: 13, color: '#888' }}>@{profile.username} · {genderMap[profile.gender] || '保密'}</div>
        </div>
        <button onClick={logout} style={{ marginLeft: 'auto', padding: '8px 16px', border: '1px solid #dc3545', color: '#dc3545', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>退出登录</button>
      </div>

      <div style={fieldStyle}><label style={labelStyle}>昵称</label><input style={inputStyle} value={profile.nickname} onChange={(e) => { handleChange('nickname', e.target.value); checkNickname(e.target.value); }} /></div>
      <div style={fieldStyle}><label style={labelStyle}>签名</label><input style={inputStyle} value={profile.signature} onChange={(e) => handleChange('signature', e.target.value)} placeholder="这家伙很懒~" /></div>
      <div style={fieldStyle}><label style={labelStyle}>真实姓名</label><input style={inputStyle} value={profile.real_name} onChange={(e) => handleChange('real_name', e.target.value)} /></div>
      <div style={fieldStyle}><label style={labelStyle}>性别</label>
        <select style={inputStyle} value={profile.gender} onChange={(e) => handleChange('gender', e.target.value)}>
          <option value="unknown">保密</option><option value="male">男</option><option value="female">女</option>
        </select>
      </div>
      <div style={fieldStyle}><label style={labelStyle}>生日</label><input type="date" style={inputStyle} value={profile.birthday} onChange={(e) => handleChange('birthday', e.target.value)} /></div>
      <div style={fieldStyle}><label style={labelStyle}>地址</label><input style={inputStyle} value={profile.address} onChange={(e) => handleChange('address', e.target.value)} /></div>

      {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ color: '#22863a', marginBottom: 12 }}>{message}</div>}

      <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: 12, background: '#4285f4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', minHeight: 48 }}>
        {saving ? '保存中...' : '保存资料'}
      </button>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>修改密码</h2>
      <div style={fieldStyle}><label style={labelStyle}>原密码</label><input type="password" style={inputStyle} value={pwd.old} onChange={(e) => setPwd((p) => ({ ...p, old: e.target.value }))} /></div>
      <div style={fieldStyle}><label style={labelStyle}>新密码</label><input type="password" style={inputStyle} value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} /></div>
      <button onClick={changePassword} disabled={saving} style={{ width: '100%', padding: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', minHeight: 48 }}>修改密码</button>
    </main>
  );
}
