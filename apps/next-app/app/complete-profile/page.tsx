<<<<<<< HEAD
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

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

// B 站（或其它第三方）登录后完善信息页 —— 流程与注册第二步一致：
// 必填论坛用户名（username），预填第三方昵称/头像，可选签名/性别。
export default function CompleteProfile() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('😀');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [signature, setSignature] = useState('');
  const [gender, setGender] = useState('unknown');
  const [usernameError, setUsernameError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 载入当前会话与第三方资料
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace('/login');
        return;
      }
      // 已有 username 则无需完善，直接进个人中心
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, nickname, avatar_url, signature, gender')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.username && String(profile.username).trim()) {
        router.replace('/profile');
        return;
      }
      const meta = user.user_metadata || {};
      setUid(user.id);
      setEmail(user.email || '');
      setNickname(profile?.nickname || meta.nickname || meta.name || '');
      setAvatarUrl(profile?.avatar_url || meta.avatar_url || '😀');
      setSignature(profile?.signature || '');
      setGender(profile?.gender || 'unknown');
      setChecking(false);
    };
    init();
  }, [router]);

  // 用户名查重
  useEffect(() => {
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameError('');
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', uid)
        .limit(1);
      setUsernameError(data && data.length > 0 ? '该用户名已被占用' : '');
    }, 500);
    return () => clearTimeout(t);
  }, [username, uid]);

  // 昵称查重
  useEffect(() => {
    if (!nickname || nickname.length < 2) {
      setNicknameError('');
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname)
        .neq('id', uid)
        .limit(1);
      setNicknameError(data && data.length > 0 ? '该昵称已被占用' : '');
    }, 500);
    return () => clearTimeout(t);
  }, [nickname, uid]);

  const validate = () => {
    if (!username.trim()) { setError('请设置用户名'); return false; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setError('用户名需 3-20 位，仅支持字母、数字、下划线'); return false; }
    if (usernameError) { setError(usernameError); return false; }
    if (!nickname.trim()) { setError('请填写昵称'); return false; }
    if (nicknameError) { setError(nicknameError); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setError('');
    try {
      const lowerName = username.toLowerCase();
      // 同步到 auth user_metadata，便于其它端读取
      await supabase.auth.updateUser({ data: { username: lowerName } });
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          {
            id: uid,
            username: lowerName,
            nickname: nickname.trim(),
            avatar_url: avatarUrl || '😀',
            signature: signature.trim() || '这家伙很懒~',
            gender,
            email,
          },
          { onConflict: 'id' },
        );
      if (upsertErr) throw upsertErr;
      router.replace('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isImageAvatar = typeof avatarUrl === 'string' && /^https?:\/\//.test(avatarUrl);

  if (checking) {
    return (
      <main style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f5f5f5' }}>
        <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
        <div style={{ fontSize: 14, color: '#666' }}>正在读取账号信息…</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', fontSize: 24, margin: 0 }}>完善个人信息</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 8 }}>
          哔哩哔哩登录成功！还差一步——设置你的论坛用户名即可开始使用。
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          {isImageAvatar ? (
            <img src={avatarUrl} alt="头像" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{avatarUrl || '😀'}</div>
          )}
        </div>

        {error && <div style={{ color: '#dc3545', textAlign: 'center', margin: '12px 0' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div>
            <input style={inputStyle} placeholder="用户名（3-20位 字母/数字/下划线，必填）" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} />
            {usernameError && <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>{usernameError}</div>}
          </div>
          <div>
            <input style={inputStyle} placeholder="昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} required disabled={loading} />
            {nicknameError && <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>{nicknameError}</div>}
          </div>
          <input style={inputStyle} placeholder="个性签名（选填）" value={signature} onChange={(e) => setSignature(e.target.value)} disabled={loading} />
          <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)} disabled={loading}>
            <option value="unknown">保密</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <button type="submit" disabled={loading} style={btnPrimary}>{loading ? '保存中...' : '完成并进入'}</button>
        </form>
      </div>
    </main>
  );
}
=======
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

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

// B 站（或其它第三方）登录后完善信息页 —— 流程与注册第二步一致：
// 必填论坛用户名（username），预填第三方昵称/头像，可选签名/性别。
export default function CompleteProfile() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('😀');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [signature, setSignature] = useState('');
  const [gender, setGender] = useState('unknown');
  const [usernameError, setUsernameError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 载入当前会话与第三方资料
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace('/login');
        return;
      }
      // 已有 username 则无需完善，直接进个人中心
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, nickname, avatar_url, signature, gender')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.username && String(profile.username).trim()) {
        router.replace('/profile');
        return;
      }
      const meta = user.user_metadata || {};
      setUid(user.id);
      setEmail(user.email || '');
      setNickname(profile?.nickname || meta.nickname || meta.name || '');
      setAvatarUrl(profile?.avatar_url || meta.avatar_url || '😀');
      setSignature(profile?.signature || '');
      setGender(profile?.gender || 'unknown');
      setChecking(false);
    };
    init();
  }, [router]);

  // 用户名查重
  useEffect(() => {
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameError('');
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', uid)
        .limit(1);
      setUsernameError(data && data.length > 0 ? '该用户名已被占用' : '');
    }, 500);
    return () => clearTimeout(t);
  }, [username, uid]);

  // 昵称查重
  useEffect(() => {
    if (!nickname || nickname.length < 2) {
      setNicknameError('');
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname)
        .neq('id', uid)
        .limit(1);
      setNicknameError(data && data.length > 0 ? '该昵称已被占用' : '');
    }, 500);
    return () => clearTimeout(t);
  }, [nickname, uid]);

  const validate = () => {
    if (!username.trim()) { setError('请设置用户名'); return false; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setError('用户名需 3-20 位，仅支持字母、数字、下划线'); return false; }
    if (usernameError) { setError(usernameError); return false; }
    if (!nickname.trim()) { setError('请填写昵称'); return false; }
    if (nicknameError) { setError(nicknameError); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setError('');
    try {
      const lowerName = username.toLowerCase();
      // 同步到 auth user_metadata，便于其它端读取
      await supabase.auth.updateUser({ data: { username: lowerName } });
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          {
            id: uid,
            username: lowerName,
            nickname: nickname.trim(),
            avatar_url: avatarUrl || '😀',
            signature: signature.trim() || '这家伙很懒~',
            gender,
            email,
          },
          { onConflict: 'id' },
        );
      if (upsertErr) throw upsertErr;
      router.replace('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isImageAvatar = typeof avatarUrl === 'string' && /^https?:\/\//.test(avatarUrl);

  if (checking) {
    return (
      <main style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f5f5f5' }}>
        <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
        <div style={{ fontSize: 14, color: '#666' }}>正在读取账号信息…</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', fontSize: 24, margin: 0 }}>完善个人信息</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 8 }}>
          哔哩哔哩登录成功！还差一步——设置你的论坛用户名即可开始使用。
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          {isImageAvatar ? (
            <img src={avatarUrl} alt="头像" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{avatarUrl || '😀'}</div>
          )}
        </div>

        {error && <div style={{ color: '#dc3545', textAlign: 'center', margin: '12px 0' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div>
            <input style={inputStyle} placeholder="用户名（3-20位 字母/数字/下划线，必填）" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} />
            {usernameError && <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>{usernameError}</div>}
          </div>
          <div>
            <input style={inputStyle} placeholder="昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} required disabled={loading} />
            {nicknameError && <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>{nicknameError}</div>}
          </div>
          <input style={inputStyle} placeholder="个性签名（选填）" value={signature} onChange={(e) => setSignature(e.target.value)} disabled={loading} />
          <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)} disabled={loading}>
            <option value="unknown">保密</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <button type="submit" disabled={loading} style={btnPrimary}>{loading ? '保存中...' : '完成并进入'}</button>
        </form>
      </div>
    </main>
  );
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
