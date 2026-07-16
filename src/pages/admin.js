import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { ADMIN_CONFIG_SCHEMA, getByPath } from '../config/adminConfigSchema';
import { useSiteConfig } from '../theme/SiteConfigProvider';
import siteData from '../data/siteData.json';
import { supabase } from '../supabase/supabaseClient';

const TOKEN_KEY = 'admin_console_token';

const wrap = {
  maxWidth: 760,
  margin: '40px auto',
  padding: '28px 32px',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  color: '#1a1a1a',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
};

export default function AdminPage() {
  const { refresh } = useSiteConfig();
  const [token, setToken] = useState(() => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) || '' : ''));
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');

  // 登录成功后用当前 siteData（已含动态配置）初始化表单
  useEffect(() => {
    if (!token) return;
    const init = {};
    ADMIN_CONFIG_SCHEMA.forEach((g) =>
      g.items.forEach((it) => {
        const v = getByPath(siteData, it.key);
        init[it.key] = v !== undefined ? v : it.default ?? '';
      })
    );
    setForm(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function persistToken(t) {
    setToken(t);
    if (typeof sessionStorage === 'undefined') return;
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', password },
      });
      if (error || !data?.ok) {
        setMsg({ type: 'error', text: data?.error || error?.message || '登录失败' });
      } else {
        persistToken(data.token);
        setMsg({ type: 'success', text: '登录成功' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: '请求异常：' + String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function doSave(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const config = {};
      ADMIN_CONFIG_SCHEMA.forEach((g) =>
        g.items.forEach((it) => {
          let val = form[it.key];
          if (it.type === 'toggle') val = !!val;
          if (val !== '' && val !== undefined && val !== null) config[it.key] = val;
        })
      );
      const { data, error } = await supabase.functions.invoke('admin-config', {
        body: { config },
        headers: { 'x-admin-token': token },
      });
      if (error || !data?.ok) {
        if ((data && /未授权|过期/.test(data.error)) || (error && error.status === 401)) {
          persistToken('');
          setMsg({ type: 'error', text: '登录已过期，请重新登录' });
        } else {
          setMsg({ type: 'error', text: data?.error || error?.message || '保存失败' });
        }
      } else {
        setMsg({ type: 'success', text: '配置已保存，正在刷新全站…' });
        await refresh();
      }
    } catch (err) {
      setMsg({ type: 'error', text: '请求异常：' + String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function doChangePwd(e) {
    e.preventDefault();
    if (newPwd !== newPwd2) {
      setMsg({ type: 'error', text: '两次新密码不一致' });
      return;
    }
    if (newPwd.length < 8) {
      setMsg({ type: 'error', text: '新密码至少 8 位' });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'change_password', old_password: oldPwd, new_password: newPwd },
      });
      if (error || !data?.ok) {
        setMsg({ type: 'error', text: data?.error || error?.message || '改密失败' });
      } else {
        setMsg({ type: 'success', text: '密码已更新' });
        setShowChange(false);
        setOldPwd('');
        setNewPwd('');
        setNewPwd2('');
      }
    } catch (err) {
      setMsg({ type: 'error', text: '请求异常：' + String(err) });
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    persistToken('');
    setForm({});
    setShowChange(false);
    setMsg({ type: '', text: '' });
  }

  const msgStyle = {
    margin: '12px 0',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 14,
    background: msg.type === 'error' ? '#fde8e8' : '#e7f6ec',
    color: msg.type === 'error' ? '#c0392b' : '#1e7e34',
  };

  // ── 未登录：登录框 ──
  if (!token) {
    return (
      <Layout title="管理控制台">
        <div style={{ ...wrap, maxWidth: 360, margin: '14vh auto' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>🔐 管理控制台</h2>
          <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>请输入管理密码</p>
          <form onSubmit={doLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理密码"
              style={inputStyle}
              autoFocus
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%', marginTop: 14, padding: '10px',
                background: '#509feb', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 15, cursor: 'pointer', opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? '登录中…' : '登录'}
            </button>
          </form>
          {msg.text && <div style={msgStyle}>{msg.text}</div>}
        </div>
      </Layout>
    );
  }

  // ── 已登录：配置面板 ──
  return (
    <Layout title="管理控制台">
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>🛠️ 站点配置</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowChange((v) => !v)}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              修改密码
            </button>
            <button
              onClick={logout}
              style={{ padding: '6px 12px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              退出登录
            </button>
          </div>
        </div>

        {showChange && (
          <form onSubmit={doChangePwd} style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>修改管理密码</h3>
            <input type="password" placeholder="原密码" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <input type="password" placeholder="新密码（至少8位）" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <input type="password" placeholder="再次输入新密码" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#509feb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {busy ? '处理中…' : '确认修改'}
            </button>
          </form>
        )}

        <form onSubmit={doSave}>
          {ADMIN_CONFIG_SCHEMA.map((group) => (
            <fieldset key={group.group} style={{ border: '1px solid #eee', borderRadius: 10, margin: '16px 0', padding: '12px 16px' }}>
              <legend style={{ fontWeight: 700, padding: '0 8px', color: '#333' }}>{group.group}</legend>
              {group.items.map((it) => (
                <div key={it.key} style={{ margin: '12px 0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {it.label}
                    {it.help && <span style={{ color: '#999', fontWeight: 400, marginLeft: 6 }}>({it.help})</span>}
                  </label>
                  {it.type === 'toggle' ? (
                    <input
                      type="checkbox"
                      checked={!!form[it.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.checked }))}
                    />
                  ) : it.type === 'textarea' ? (
                    <textarea
                      value={form[it.key] ?? ''}
                      placeholder={it.placeholder || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))}
                      rows={3}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[it.key] ?? ''}
                      placeholder={it.placeholder || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
            </fieldset>
          ))}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%', padding: '12px', marginTop: 8,
              background: '#2e7d32', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 15, cursor: 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '保存中…' : '保存配置'}
          </button>
        </form>

        {msg.text && <div style={msgStyle}>{msg.text}</div>}
      </div>
    </Layout>
  );
}
