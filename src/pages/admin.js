import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { ADMIN_CONFIG_SCHEMA, getByPath } from '../config/adminConfigSchema';
import { useSiteConfig } from '../theme/SiteConfigProvider';
import { useWarnings } from '../theme/WarningsProvider';
import { WARNING_TYPES, WARNING_LEVELS } from '../config/warningTypes';
import siteData from '../data/siteData.json';
import { supabase } from '../supabase/supabaseClient';

const TOKEN_KEY = 'admin_console_token';

const wrap = {
  maxWidth: 860,
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
  const { refresh: refreshConfig } = useSiteConfig();
  const { refresh, triggerQuake } = useWarnings();
  const [token, setToken] = useState(() => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) || '' : ''));
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('config');
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');

  // 预警管理
  const [warnings, setWarnings] = useState([]);
  const [wForm, setWForm] = useState({
    type: 'earthquake', level: 'orange', region: '', title: '', message: '', source: '', expires_at: '', is_active: true,
    lat: '', lng: '', impact_at: '', subtype: '', shelter: '',
  });

  useEffect(() => {
    if (token) {
      const init = {};
      ADMIN_CONFIG_SCHEMA.forEach((g) =>
        g.items.forEach((it) => {
          const v = getByPath(siteData, it.key);
          init[it.key] = v !== undefined ? v : it.default ?? '';
        })
      );
      setForm(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && tab === 'warnings') loadWarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab]);

  function persistToken(t) {
    setToken(t);
    if (typeof sessionStorage === 'undefined') return;
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  // ── 后台接口封装 ──
  async function authFn(action, body, withToken = true) {
    return supabase.functions.invoke('admin-auth', {
      body: { action, ...body },
      ...(withToken ? { headers: { 'x-admin-token': token } } : {}),
    });
  }
  async function wFn(action, body) {
    return supabase.functions.invoke('admin-warnings', {
      body: { action, ...body },
      headers: { 'x-admin-token': token },
    });
  }

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const { data, error } = await authFn('login', { password }, false);
      if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '登录失败' });
      else { persistToken(data.token); setMsg({ type: 'success', text: '登录成功' }); }
    } catch (err) { setMsg({ type: 'error', text: '请求异常：' + String(err) }); }
    finally { setBusy(false); }
  }

  async function doSave(e) {
    e.preventDefault();
    setBusy(true); setMsg({ type: '', text: '' });
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
          persistToken(''); setMsg({ type: 'error', text: '登录已过期，请重新登录' });
        } else setMsg({ type: 'error', text: data?.error || error?.message || '保存失败' });
      } else { setMsg({ type: 'success', text: '配置已保存，正在刷新全站…' }); await refreshConfig(); }
    } catch (err) { setMsg({ type: 'error', text: '请求异常：' + String(err) }); }
    finally { setBusy(false); }
  }

  async function doChangePwd(e) {
    e.preventDefault();
    if (newPwd !== newPwd2) { setMsg({ type: 'error', text: '两次新密码不一致' }); return; }
    if (newPwd.length < 8) { setMsg({ type: 'error', text: '新密码至少 8 位' }); return; }
    setBusy(true);
    try {
      const { data, error } = await authFn('change_password', { old_password: oldPwd, new_password: newPwd });
      if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '改密失败' });
      else { setMsg({ type: 'success', text: '密码已更新' }); setShowChange(false); setOldPwd(''); setNewPwd(''); setNewPwd2(''); }
    } catch (err) { setMsg({ type: 'error', text: '请求异常：' + String(err) }); }
    finally { setBusy(false); }
  }

  function logout() { persistToken(''); setForm({}); setShowChange(false); setMsg({ type: '', text: '' }); }

  // ── 预警管理 ──
  async function loadWarnings() {
    const { data, error } = await wFn('list', {});
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '加载预警失败' });
    else setWarnings(data.warnings || []);
  }

  async function doFetchQuake() {
    setBusy(true);
    try {
      await triggerQuake();
      await loadWarnings();
      setMsg({ type: 'success', text: '已拉取地震速报' });
    } catch (err) { setMsg({ type: 'error', text: '拉取失败：' + String(err) }); }
    finally { setBusy(false); }
  }

  // 核打击预警模板：预填类型/等级/文案框架/通用避险建议。
  // 爆心坐标(lat/lng)与来袭时间(impact_at)刻意留空，必须由发布者填入官方真实通报，严禁编造。
  function loadNuclearTemplate() {
    setWForm((f) => ({
      ...f,
      type: 'nuclear',
      level: 'red',
      region: '',
      title: '核打击警报',
      source: '国家核应急协调机构（请替换为实际发布单位）',
      message:
        '接上级通报，我地区面临核打击威胁。请立即按下列避险指引行动，并以官方权威发布为准。\n【本模板文案须替换为真实通报内容，切勿编造。】',
      shelter: WARNING_TYPES.nuclear.shelterTips.join('\n'),
      lat: '',
      lng: '',
      impact_at: '',
      is_active: true,
    }));
    setMsg({ type: 'success', text: '已载入核打击预警模板，请补全爆心坐标(lat/lng)与来袭时间(impact_at)后发布' });
  }

  async function doCreateWarning(e) {
    e.preventDefault();
    if (!wForm.title.trim()) { setMsg({ type: 'error', text: '标题必填' }); return; }
    setBusy(true);
    try {
      const expires = wForm.expires_at ? new Date(wForm.expires_at).toISOString() : null;
      const impact = wForm.impact_at ? new Date(wForm.impact_at).toISOString() : null;
      const toNum = (v) => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v);
      const lat = toNum(wForm.lat);
      const lng = toNum(wForm.lng);
      const { data, error } = await wFn('create', {
        type: wForm.type, level: wForm.level, region: wForm.region, title: wForm.title,
        message: wForm.message, source: wForm.source, is_active: wForm.is_active,
        expires_at: expires, lat, lng, impact_at: impact,
        subtype: wForm.subtype || null, shelter: wForm.shelter || null,
      });
      if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '发布失败' });
      else {
        setMsg({ type: 'success', text: '预警已发布' });
        setWForm({ type: 'earthquake', level: 'orange', region: '', title: '', message: '', source: '', expires_at: '', is_active: true });
        await loadWarnings();
        await refresh(); // 刷新全局预警数据，触发全站弹窗
      }
    } catch (err) { setMsg({ type: 'error', text: '发布异常：' + String(err) }); }
    finally { setBusy(false); }
  }

  async function doToggle(w) {
    const { error } = await wFn('update', { id: w.id, is_active: !w.is_active });
    if (error) setMsg({ type: 'error', text: '操作失败' });
    else { await loadWarnings(); await refresh(); }
  }

  async function doDelete(w) {
    if (!confirm('确定删除该预警？')) return;
    const { error } = await wFn('delete', { id: w.id });
    if (error) setMsg({ type: 'error', text: '删除失败' });
    else { await loadWarnings(); await refresh(); }
  }

  const msgStyle = (t) => ({
    margin: '12px 0', padding: '10px 14px', borderRadius: 8, fontSize: 14,
    background: t === 'error' ? '#fde8e8' : '#e7f6ec',
    color: t === 'error' ? '#c0392b' : '#1e7e34',
  });

  if (!token) {
    return (
      <Layout title="管理控制台">
        <div style={{ ...wrap, maxWidth: 360, margin: '14vh auto' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>🔐 管理控制台</h2>
          <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>请输入管理密码</p>
          <form onSubmit={doLogin}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="管理密码" style={inputStyle} autoFocus />
            <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 14, padding: '10px', background: '#509feb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '登录中…' : '登录'}
            </button>
          </form>
          {msg.text && <div style={msgStyle(msg.type)}>{msg.text}</div>}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="管理控制台">
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>🛠️ 站点管理</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setTab('config')} style={{ padding: '6px 14px', background: tab === 'config' ? '#509feb' : '#f0f0f0', color: tab === 'config' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>站点配置</button>
            <button onClick={() => setTab('warnings')} style={{ padding: '6px 14px', background: tab === 'warnings' ? '#509feb' : '#f0f0f0', color: tab === 'warnings' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>预警管理</button>
            <button onClick={() => setShowChange((v) => !v)} style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>修改密码</button>
            <button onClick={logout} style={{ padding: '6px 12px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: 6, cursor: 'pointer' }}>退出</button>
          </div>
        </div>

        {showChange && (
          <form onSubmit={doChangePwd} style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>修改管理密码</h3>
            <input type="password" placeholder="原密码" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <input type="password" placeholder="新密码（至少8位）" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <input type="password" placeholder="再次输入新密码" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#509feb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{busy ? '处理中…' : '确认修改'}</button>
          </form>
        )}

        {msg.text && <div style={msgStyle(msg.type)}>{msg.text}</div>}

        {tab === 'config' && (
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
                      <input type="checkbox" checked={!!form[it.key]} onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.checked }))} />
                    ) : it.type === 'textarea' ? (
                      <textarea value={form[it.key] ?? ''} placeholder={it.placeholder || ''} onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))} rows={3} style={inputStyle} />
                    ) : (
                      <input type="text" value={form[it.key] ?? ''} placeholder={it.placeholder || ''} onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))} style={inputStyle} />
                    )}
                  </div>
                ))}
              </fieldset>
            ))}
            <button type="submit" disabled={busy} style={{ width: '100%', padding: '12px', marginTop: 8, background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '保存中…' : '保存配置'}
            </button>
          </form>
        )}

        {tab === 'warnings' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={doFetchQuake} disabled={busy} style={{ padding: '8px 16px', background: '#509feb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🌍 立即拉取地震速报</button>
              <button onClick={loadWarnings} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🔄 刷新列表</button>
            </div>

            <form onSubmit={doCreateWarning} style={{ padding: 16, background: '#fafafa', borderRadius: 10, marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>发布新预警（手动）</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <select value={wForm.type} onChange={(e) => setWForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
                  {Object.entries(WARNING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
                <select value={wForm.level} onChange={(e) => setWForm((f) => ({ ...f, level: e.target.value }))} style={inputStyle}>
                  {Object.entries(WARNING_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input type="text" placeholder="影响区域（如：华北地区）" value={wForm.region} onChange={(e) => setWForm((f) => ({ ...f, region: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="来源（默认：管理员）" value={wForm.source} onChange={(e) => setWForm((f) => ({ ...f, source: e.target.value }))} style={inputStyle} />
              </div>

              {wForm.type === 'airdrill' && (
                <div style={{ margin: '12px 0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>防空警报类型</label>
                  <select value={wForm.subtype} onChange={(e) => setWForm((f) => ({ ...f, subtype: e.target.value }))} style={inputStyle}>
                    <option value="">（不指定）</option>
                    {Object.entries(WARNING_TYPES.airdrill.subtypes).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  {wForm.subtype && (
                    <div style={{ fontSize: 12, color: '#b26a00', marginTop: 4 }}>{WARNING_TYPES.airdrill.subtypes[wForm.subtype].desc}</div>
                  )}
                </div>
              )}

              {wForm.type === 'nuclear' && (
                <div style={{ margin: '12px 0' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={loadNuclearTemplate} style={{ padding: '6px 12px', background: '#fff3e0', border: '1px solid #ef6c00', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#b26a00' }}>☢️ 填入核打击预警模板</button>
                    <span style={{ fontSize: 12, color: '#b26a00' }}>模板仅预填文案框架与避险建议；爆心坐标(lat/lng)与来袭时间(impact_at)须填<b>官方真实数据</b>，切勿编造。</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input type="text" placeholder="爆心纬度 lat（如 39.9042）" value={wForm.lat} onChange={(e) => setWForm((f) => ({ ...f, lat: e.target.value }))} style={inputStyle} />
                    <input type="text" placeholder="爆心经度 lng（如 116.4074）" value={wForm.lng} onChange={(e) => setWForm((f) => ({ ...f, lng: e.target.value }))} style={inputStyle} />
                    <input type="datetime-local" value={wForm.impact_at} onChange={(e) => setWForm((f) => ({ ...f, impact_at: e.target.value }))} style={inputStyle} />
                    <input type="text" disabled value="（需浏览器授权定位才能算距离）" style={{ ...inputStyle, color: '#999', background: '#f5f5f5' }} />
                  </div>
                  <textarea placeholder="避险建议（每行一条，可选；留空则用默认建议）" value={wForm.shelter} onChange={(e) => setWForm((f) => ({ ...f, shelter: e.target.value }))} rows={2} style={{ ...inputStyle, marginTop: 12 }} />
                </div>
              )}

              <input type="text" placeholder="标题（必填）" value={wForm.title} onChange={(e) => setWForm((f) => ({ ...f, title: e.target.value }))} style={{ ...inputStyle, margin: '12px 0' }} />
              <textarea placeholder="正文说明" value={wForm.message} onChange={(e) => setWForm((f) => ({ ...f, message: e.target.value }))} rows={3} style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13 }}>过期时间（可选）：
                  <input type="datetime-local" value={wForm.expires_at} onChange={(e) => setWForm((f) => ({ ...f, expires_at: e.target.value }))} style={{ ...inputStyle, width: 'auto', marginLeft: 6 }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  <input type="checkbox" checked={wForm.is_active} onChange={(e) => setWForm((f) => ({ ...f, is_active: e.target.checked }))} /> 立即生效
                </label>
                <button type="submit" disabled={busy} style={{ padding: '8px 18px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' }}>{busy ? '发布中…' : '发布预警'}</button>
              </div>
            </form>

            <h3 style={{ fontSize: 15 }}>当前预警列表（{warnings.length}）</h3>
            {warnings.length === 0 && <div style={{ color: '#999', fontSize: 14 }}>暂无预警</div>}
            {warnings.map((w) => (
              <div key={w.id} style={{ border: '1px solid #eee', borderLeft: `4px solid ${(WARNING_LEVELS[w.level] || WARNING_LEVELS.blue).color}`, borderRadius: 8, padding: '10px 14px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{(WARNING_TYPES[w.type] || WARNING_TYPES.other).label} · {(WARNING_LEVELS[w.level] || WARNING_LEVELS.blue).label}</span>
                  <div style={{ color: '#666' }}>{w.title}{w.region ? `（${w.region}）` : ''} {w.is_auto ? '· 自动' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => doToggle(w)} style={{ padding: '5px 12px', background: w.is_active ? '#fff3e0' : '#e8f5e9', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{w.is_active ? '停用' : '启用'}</button>
                  <button onClick={() => doDelete(w)} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
