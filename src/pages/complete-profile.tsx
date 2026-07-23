import { useEffect, useState } from 'react';
import { useHistory } from '@docusaurus/router';
import { supabase } from '@/lib/supabase/client';
import { safeGetSession } from '@/lib/supabase/safe';

const EMOJI_LIST = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😍','🤩','🥰','👦','👧','👨','👩','🐶','🐱','🐼','🦁','🐯','🦄','🐝','👻','🤖','👽'];

// 由 next-app/complete-profile 迁移：B站/OAuth 登录后若缺 username，补全论坛资料。
// 路由改为 @docusaurus/router；路径统一 /*；补全 safeGetSession 导入。
export default function CompleteProfilePage() {
  const history = useHistory();
  const [form, setForm] = useState({ username: '', nickname: '', signature: '', gender: 'unknown' });
  const [avatar, setAvatar] = useState('😀');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const run = async () => {
      const { session, user } = await safeGetSession();
      if (!active) return;
      if (!user) {
        history.replace('/login');
        setChecking(false);
        return;
      }
      // 预填 B站昵称/头像
      const { data: identity } = await supabase
        .from('user_identities')
        .select('*')
        .eq('user_id', user.id);
      let preNick = '';
      let preAvatar = '😀';
      (identity || []).forEach((idn: any) => {
        if (idn?.provider === 'bilibili') {
          try {
            const m = JSON.parse(idn.identity_data || '{}');
            preNick = m?.user_name || m?.nickname || preNick;
            preAvatar = '📺';
          } catch {}
        }
      });
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.username) {
        history.replace('/profile');
        setChecking(false);
        return;
      }
      setForm((f) => ({ ...f, nickname: preNick }));
      setAvatar(preAvatar);
      setChecking(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [history]);

  const checkUsername = async (val: string) => {
    const v = val.trim();
    if (!v) { setError(''); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) { setError('用户名需 3-20 位，仅支持字母、数字、下划线'); return; }
    const { data } = await supabase.from('profiles').select('username').eq('username', v.toLowerCase()).maybeSingle();
    setError(data ? '该用户名已被占用' : '');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const uname = form.username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(uname)) { setError('用户名格式不合法'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await safeGetSession();
      if (!user) { history.replace('/login'); return; }
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: user.id,
        username: uname,
        nickname: form.nickname.trim() || uname,
        avatar_url: avatar,
        signature: form.signature,
        gender: form.gender,
        email: user.email,
      }, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      history.replace('/profile');
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--ifm-font-color-base)' }}>加载中…</div>;
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%)' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 22 }}>完善资料</h1>
        <p style={{ textAlign: 'center', color: '#666', marginTop: 0, marginBottom: 24, fontSize: 14 }}>设置你的论坛用户名，开启完整功能</p>
        {error && <div style={{ color: '#dc3545', textAlign: 'center', marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>{avatar}</div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#4285f4', fontSize: 13 }}>选择头像</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 10 }}>
                {EMOJI_LIST.map((e) => (
                  <button key={e} type="button" onClick={() => setAvatar(e)} style={{ fontSize: 22, border: 'none', background: 'transparent', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </details>
          </div>
          <input style={{ padding: '12px 16px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, minHeight: 48 }} placeholder="用户名（必填，3-20位）" value={form.username} onChange={(e) => { setForm((f) => ({ ...f, username: e.target.value })); checkUsername(e.target.value); }} required />
          <input style={{ padding: '12px 16px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, minHeight: 48 }} placeholder="昵称（可选）" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} />
          <input style={{ padding: '12px 16px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, minHeight: 48 }} placeholder="个性签名（可选）" value={form.signature} onChange={(e) => setForm((f) => ({ ...f, signature: e.target.value }))} />
          <select style={{ padding: '12px 16px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, minHeight: 48 }} value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
            <option value="unknown">保密</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <button type="submit" disabled={loading} style={{ padding: 12, background: '#34a853', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', minHeight: 48 }}>
            {loading ? '保存中…' : '保存并进入'}
          </button>
        </form>
      </div>
    </main>
  );
}
