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

  // 投稿审核
  const [subs, setSubs] = useState([]);
  const [subFilter, setSubFilter] = useState('pending');
  const [subBusy, setSubBusy] = useState(false);

  // 友链管理
  const [friends, setFriends] = useState([]);
  const [fForm, setFForm] = useState({ name: '', url: '', avatar: '', description: '', tag: '朋友', sort_order: 0, is_approved: true });
  const [fEditId, setFEditId] = useState(null);

  // 友链申请审核
  const [friendReqs, setFriendReqs] = useState([]);
  const [reqFilter, setReqFilter] = useState('pending');
  const [reqBusy, setReqBusy] = useState(false);

  // 说说管理
  const [moments, setMoments] = useState([]);
  const [mForm, setMForm] = useState({ content: '', author_name: '站长', author_avatar: '', is_pinned: false });
  const [mEditId, setMEditId] = useState(null);

  useEffect(() => {
    if (token) {
      const init = {};
      ADMIN_CONFIG_SCHEMA.forEach((g) =>
        g.items.forEach((it) => {
          let v = getByPath(siteData, it.key);
          if (it.type === 'list' && Array.isArray(v)) v = v.join('\n');
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

  useEffect(() => {
    if (!token) return;
    if (tab === 'submissions') loadSubs();
    if (tab === 'friends') loadFriends();
    if (tab === 'friendRequests') loadFriendRequests();
    if (tab === 'moments') loadMoments();
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
  async function subFn(action, body) {
    return supabase.functions.invoke('admin-submissions', {
      body: { action, ...body },
      headers: { 'x-admin-token': token },
    });
  }
  async function friendFn(action, body) {
    return supabase.functions.invoke('admin-friends', {
      body: { action, ...body },
      headers: { 'x-admin-token': token },
    });
  }
  async function momentFn(action, body) {
    return supabase.functions.invoke('admin-moments', {
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

  // ── 投稿审核 ──
  async function loadSubs() {
    setSubBusy(true);
    const { data, error } = await subFn('list', { status: subFilter });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '加载投稿失败' });
    else setSubs(data.submissions || []);
    setSubBusy(false);
  }

  async function doReview(id, status, note) {
    setSubBusy(true);
    const { data, error } = await subFn('set_status', { id, status, review_note: note || '' });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '操作失败' });
    else { setMsg({ type: 'success', text: status === 'published' ? '已通过并发布' : status === 'rejected' ? '已驳回' : '状态已更新' }); await loadSubs(); }
    setSubBusy(false);
  }

  async function doPin(sub) {
    setSubBusy(true);
    const { data, error } = await subFn('pin', { id: sub.id });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '置顶失败' });
    else { setMsg({ type: 'success', text: data.submission.is_pinned ? '已置顶' : '已取消置顶' }); await loadSubs(); }
    setSubBusy(false);
  }

  async function doDeleteSub(sub) {
    if (!confirm('确定删除该投稿？此操作不可恢复')) return;
    setSubBusy(true);
    const { error } = await subFn('delete', { id: sub.id });
    if (error) setMsg({ type: 'error', text: '删除失败' });
    else { setMsg({ type: 'success', text: '已删除' }); await loadSubs(); }
    setSubBusy(false);
  }

  const SUB_STATUS = {
    draft: { label: '草稿', color: '#888' },
    pending: { label: '待审核', color: '#ef6c00' },
    published: { label: '已发布', color: '#2e7d32' },
    rejected: { label: '已驳回', color: '#c0392b' },
  };

  // ── 友链管理 ──
  async function loadFriends() {
    const { data, error } = await friendFn('list', {});
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '加载友链失败' });
    else setFriends(data.friends || []);
  }

  async function doSaveFriend(e) {
    e.preventDefault();
    if (!fForm.name.trim() || !fForm.url.trim()) { setMsg({ type: 'error', text: '站点名称与链接必填' }); return; }
    setBusy(true);
    const body = {
      name: fForm.name.trim(),
      url: fForm.url.trim(),
      avatar: fForm.avatar.trim(),
      description: fForm.description.trim(),
      tag: fForm.tag.trim() || '朋友',
      sort_order: Number(fForm.sort_order) || 0,
      is_approved: !!fForm.is_approved,
    };
    let res;
    if (fEditId) res = await friendFn('update', { id: fEditId, ...body });
    else res = await friendFn('create', body);
    const { data, error } = res;
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '保存失败' });
    else {
      setMsg({ type: 'success', text: fEditId ? '友链已更新' : '友链已添加' });
      setFForm({ name: '', url: '', avatar: '', description: '', tag: '朋友', sort_order: 0, is_approved: true });
      setFEditId(null);
      await loadFriends();
    }
    setBusy(false);
  }

  function doEditFriend(f) {
    setFEditId(f.id);
    setFForm({
      name: f.name || '', url: f.url || '', avatar: f.avatar || '', description: f.description || '',
      tag: f.tag || '朋友', sort_order: f.sort_order || 0, is_approved: !!f.is_approved,
    });
    setTab('friends');
  }

  async function doDeleteFriend(f) {
    if (!confirm('确定删除该友链？')) return;
    const { error } = await friendFn('delete', { id: f.id });
    if (error) setMsg({ type: 'error', text: '删除失败' });
    else { setMsg({ type: 'success', text: '已删除' }); await loadFriends(); }
  }

  async function doToggleFriend(f) {
    const { error } = await friendFn('update', { id: f.id, is_approved: !f.is_approved });
    if (error) setMsg({ type: 'error', text: '操作失败' });
    else { await loadFriends(); }
  }

  // ── 友链申请审核 ──
  const REQ_STATUS = {
    pending: { label: '待审核', color: '#ef6c00' },
    approved: { label: '已通过', color: '#2e7d32' },
    rejected: { label: '已拒绝', color: '#c0392b' },
  };

  async function loadFriendRequests() {
    setReqBusy(true);
    const { data, error } = await friendFn('requests_list', { status: reqFilter });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '加载友链申请失败' });
    else setFriendReqs(data.requests || []);
    setReqBusy(false);
  }

  async function doApproveReq(r) {
    setReqBusy(true);
    const { data, error } = await friendFn('request_approve', { id: r.id });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '通过失败' });
    else { setMsg({ type: 'success', text: '已通过并写入友链' }); await loadFriendRequests(); await loadFriends(); }
    setReqBusy(false);
  }

  async function doRejectReq(r) {
    const note = prompt('拒绝理由（可选）：') || '';
    setReqBusy(true);
    const { data, error } = await friendFn('request_reject', { id: r.id, review_note: note });
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '拒绝失败' });
    else { setMsg({ type: 'success', text: '已拒绝该申请' }); await loadFriendRequests(); }
    setReqBusy(false);
  }

  async function doDeleteReq(r) {
    if (!confirm('确定删除该申请记录？')) return;
    setReqBusy(true);
    const { error } = await friendFn('request_delete', { id: r.id });
    if (error) setMsg({ type: 'error', text: '删除失败' });
    else { setMsg({ type: 'success', text: '已删除' }); await loadFriendRequests(); }
    setReqBusy(false);
  }

  // ── 说说管理 ──
  async function loadMoments() {
    const { data, error } = await momentFn('list', {});
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '加载说说失败' });
    else setMoments(data.moments || []);
  }

  async function doSaveMoment(e) {
    e.preventDefault();
    if (!mForm.content.trim()) { setMsg({ type: 'error', text: '内容不能为空' }); return; }
    setBusy(true);
    const body = {
      content: mForm.content.trim(),
      author_name: mForm.author_name || '站长',
      author_avatar: mForm.author_avatar || null,
      is_pinned: !!mForm.is_pinned,
    };
    let res;
    if (mEditId) res = await momentFn('update', { id: mEditId, ...body });
    else res = await momentFn('create', body);
    const { data, error } = res;
    if (error || !data?.ok) setMsg({ type: 'error', text: data?.error || error?.message || '保存失败' });
    else {
      setMsg({ type: 'success', text: mEditId ? '已更新' : '已发布' });
      setMForm({ content: '', author_name: '站长', author_avatar: '', is_pinned: false });
      setMEditId(null);
      await loadMoments();
    }
    setBusy(false);
  }

  function doEditMoment(m) {
    setMForm({ content: m.content, author_name: m.author_name, author_avatar: m.author_avatar || '', is_pinned: !!m.is_pinned });
    setMEditId(m.id);
    setTab('moments');
  }

  async function doDeleteMoment(m) {
    if (!confirm('确定删除该说说？')) return;
    const { error } = await momentFn('delete', { id: m.id });
    if (error) setMsg({ type: 'error', text: '删除失败' });
    else { setMsg({ type: 'success', text: '已删除' }); await loadMoments(); }
  }

  async function doTogglePin(m) {
    const { error } = await momentFn('update', { id: m.id, is_pinned: !m.is_pinned });
    if (error) setMsg({ type: 'error', text: '操作失败' });
    else { await loadMoments(); }
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
            <button onClick={() => setTab('submissions')} style={{ padding: '6px 14px', background: tab === 'submissions' ? '#509feb' : '#f0f0f0', color: tab === 'submissions' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>投稿审核</button>
            <button onClick={() => setTab('friends')} style={{ padding: '6px 14px', background: tab === 'friends' ? '#509feb' : '#f0f0f0', color: tab === 'friends' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>友链管理</button>
            <button onClick={() => setTab('friendRequests')} style={{ padding: '6px 14px', background: tab === 'friendRequests' ? '#509feb' : '#f0f0f0', color: tab === 'friendRequests' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>友链审核</button>
            <button onClick={() => setTab('moments')} style={{ padding: '6px 14px', background: tab === 'moments' ? '#509feb' : '#f0f0f0', color: tab === 'moments' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>说说管理</button>
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
                    ) : it.type === 'select' ? (
                      <select value={form[it.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))} style={inputStyle}>
                        {(it.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : it.type === 'textarea' || it.type === 'list' ? (
                      <textarea value={Array.isArray(form[it.key]) ? form[it.key].join('\n') : (form[it.key] ?? '')} placeholder={it.placeholder || ''} onChange={(e) => setForm((f) => ({ ...f, [it.key]: e.target.value }))} rows={it.type === 'list' ? 4 : 3} style={inputStyle} />
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

        {tab === 'submissions' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {[['pending', '待审核'], ['published', '已发布'], ['rejected', '已驳回'], ['draft', '草稿'], ['all', '全部']].map(([v, label]) => (
                <button key={v} onClick={() => { setSubFilter(v); }} disabled={subBusy}
                  style={{ padding: '6px 14px', background: subFilter === v ? '#509feb' : '#f0f0f0', color: subFilter === v ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                  {label}
                </button>
              ))}
              <button onClick={loadSubs} disabled={subBusy} style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>🔄 刷新</button>
            </div>
            {subBusy && <div style={{ color: '#999', fontSize: 14 }}><img src="/img/LOADING.gif" alt="加载中" width={40} style={{ opacity: 0.92 }} /></div>}
            {!subBusy && subs.length === 0 && <div style={{ color: '#999', fontSize: 14 }}>该状态下暂无投稿</div>}
            {subs.map((s) => (
              <div key={s.id} style={{ border: '1px solid #eee', borderLeft: `4px solid ${SUB_STATUS[s.status]?.color || '#888'}`, borderRadius: 8, padding: '12px 14px', margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, flex: 1, minWidth: 240 }}>
                    <span style={{ fontWeight: 700 }}>{s.title}</span>
                    {s.is_pinned && <span style={{ marginLeft: 8, fontSize: 11, color: '#ef6c00', border: '1px solid #ef6c00', borderRadius: 10, padding: '1px 8px' }}>📌 置顶</span>}
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      {(SUB_STATUS[s.status] || SUB_STATUS.draft).label} · {s.author_name || '匿名'} · {new Date(s.created_at).toLocaleDateString('zh-CN')} · 👁 {s.view_count || 0}
                    </div>
                    {s.review_note && <div style={{ color: '#b26a00', fontSize: 12, marginTop: 4 }}>审核备注：{s.review_note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => doReview(s.id, 'published')} disabled={subBusy} style={{ padding: '5px 12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>通过</button>
                    <button onClick={() => doReview(s.id, 'rejected', prompt('驳回理由（可选）：') || '')} disabled={subBusy} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>驳回</button>
                    <button onClick={() => doPin(s)} disabled={subBusy} style={{ padding: '5px 12px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{s.is_pinned ? '取消置顶' : '置顶'}</button>
                    <button onClick={() => doDeleteSub(s)} disabled={subBusy} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'friends' && (
          <div style={{ marginTop: 16 }}>
            <form onSubmit={doSaveFriend} style={{ padding: 16, background: '#fafafa', borderRadius: 10, marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>{fEditId ? '编辑友链' : '添加友链'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="text" placeholder="站点名称（必填）" value={fForm.name} onChange={(e) => setFForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="链接 URL（必填）" value={fForm.url} onChange={(e) => setFForm((f) => ({ ...f, url: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="头像 URL（可选）" value={fForm.avatar} onChange={(e) => setFForm((f) => ({ ...f, avatar: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="分组标签（如：技术/朋友）" value={fForm.tag} onChange={(e) => setFForm((f) => ({ ...f, tag: e.target.value }))} style={inputStyle} />
                <input type="number" placeholder="排序（数字越小越靠前）" value={fForm.sort_order} onChange={(e) => setFForm((f) => ({ ...f, sort_order: e.target.value }))} style={inputStyle} />
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={fForm.is_approved} onChange={(e) => setFForm((f) => ({ ...f, is_approved: e.target.checked }))} /> 前台展示（启用）
                </label>
              </div>
              <textarea placeholder="简介（可选）" value={fForm.description} onChange={(e) => setFForm((f) => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, marginTop: 12 }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={busy} style={{ padding: '8px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{busy ? '保存中…' : (fEditId ? '保存修改' : '添加友链')}</button>
                {fEditId && <button type="button" onClick={() => { setFEditId(null); setFForm({ name: '', url: '', avatar: '', description: '', tag: '朋友', sort_order: 0, is_approved: true }); }} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>取消编辑</button>}
              </div>
            </form>

            <h3 style={{ fontSize: 15 }}>当前友链（{friends.length}）</h3>
            {friends.length === 0 && <div style={{ color: '#999', fontSize: 14 }}>暂无友链</div>}
            {friends.map((f) => (
              <div key={f.id} style={{ border: '1px solid #eee', borderLeft: `4px solid ${f.is_approved ? '#2e7d32' : '#c0392b'}`, borderRadius: 8, padding: '10px 14px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, flex: 1, minWidth: 220 }}>
                  <span style={{ fontWeight: 700 }}>{f.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#888', border: '1px solid #ddd', borderRadius: 10, padding: '1px 8px' }}>{f.tag}</span>
                  <div style={{ color: '#666' }}>{f.url}{f.description ? ` · ${f.description}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => doToggleFriend(f)} style={{ padding: '5px 12px', background: f.is_approved ? '#fff3e0' : '#e8f5e9', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{f.is_approved ? '停用' : '启用'}</button>
                  <button onClick={() => doEditFriend(f)} style={{ padding: '5px 12px', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>编辑</button>
                  <button onClick={() => doDeleteFriend(f)} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'friendRequests' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {[['pending', '待审核'], ['approved', '已通过'], ['rejected', '已拒绝'], ['all', '全部']].map(([v, label]) => (
                <button key={v} onClick={() => { setReqFilter(v); }} disabled={reqBusy}
                  style={{ padding: '6px 14px', background: reqFilter === v ? '#509feb' : '#f0f0f0', color: reqFilter === v ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                  {label}
                </button>
              ))}
              <button onClick={loadFriendRequests} disabled={reqBusy} style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>🔄 刷新</button>
            </div>
            {reqBusy && <div style={{ color: '#999', fontSize: 14 }}><img src="/img/LOADING.gif" alt="加载中" width={40} style={{ opacity: 0.92 }} /></div>}
            {!reqBusy && friendReqs.length === 0 && <div style={{ color: '#999', fontSize: 14 }}>该状态下暂无申请</div>}
            {friendReqs.map((r) => (
              <div key={r.id} style={{ border: '1px solid #eee', borderLeft: `4px solid ${REQ_STATUS[r.status]?.color || '#888'}`, borderRadius: 8, padding: '12px 14px', margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, flex: 1, minWidth: 240 }}>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#888', border: '1px solid #ddd', borderRadius: 10, padding: '1px 8px' }}>{r.tag || '朋友'}</span>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      {REQ_STATUS[r.status]?.label || r.status} · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>
                      {r.url}{r.description ? ` · ${r.description}` : ''}
                    </div>
                    {r.avatar && <div style={{ marginTop: 4 }}><img src={r.avatar} alt="" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} onError={(e) => { e.target.style.display = 'none'; }} /></div>}
                    {r.review_note && <div style={{ color: '#b26a00', fontSize: 12, marginTop: 4 }}>审核备注：{r.review_note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => doApproveReq(r)} disabled={reqBusy} style={{ padding: '5px 12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>通过</button>
                        <button onClick={() => doRejectReq(r)} disabled={reqBusy} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>拒绝</button>
                      </>
                    )}
                    <button onClick={() => doDeleteReq(r)} disabled={reqBusy} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'moments' && (
          <div style={{ marginTop: 16 }}>
            <form onSubmit={doSaveMoment} style={{ padding: 16, background: '#fafafa', borderRadius: 10, marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>{mEditId ? '编辑说说' : '发布说说'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="text" placeholder="作者名（默认：站长）" value={mForm.author_name} onChange={(e) => setMForm((f) => ({ ...f, author_name: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="作者头像 URL（可选）" value={mForm.author_avatar} onChange={(e) => setMForm((f) => ({ ...f, author_avatar: e.target.value }))} style={inputStyle} />
              </div>
              <textarea placeholder="说点什么…（上限 500 字）" value={mForm.content} onChange={(e) => setMForm((f) => ({ ...f, content: e.target.value }))} rows={3} style={{ ...inputStyle, marginTop: 12 }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={mForm.is_pinned} onChange={(e) => setMForm((f) => ({ ...f, is_pinned: e.target.checked }))} /> 置顶
                </label>
                <button type="submit" disabled={busy} style={{ padding: '8px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' }}>{busy ? '保存中…' : (mEditId ? '保存修改' : '发布说说')}</button>
                {mEditId && <button type="button" onClick={() => { setMEditId(null); setMForm({ content: '', author_name: '站长', author_avatar: '', is_pinned: false }); }} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>取消编辑</button>}
              </div>
            </form>

            <h3 style={{ fontSize: 15 }}>当前说说（{moments.length}）</h3>
            {moments.length === 0 && <div style={{ color: '#999', fontSize: 14 }}>暂无说说</div>}
            {moments.map((m) => (
              <div key={m.id} style={{ border: '1px solid #eee', borderLeft: `4px solid ${m.is_deleted ? '#c0392b' : m.is_pinned ? '#509feb' : '#2e7d32'}`, borderRadius: 8, padding: '10px 14px', margin: '8px 0', opacity: m.is_deleted ? 0.55 : 1 }}>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span><span style={{ fontWeight: 700 }}>{m.author_name}</span>{m.is_pinned && <span style={{ marginLeft: 6, fontSize: 11, color: '#509feb' }}>📌置顶</span>}{m.is_deleted && <span style={{ marginLeft: 6, fontSize: 11, color: '#c0392b' }}>已删除</span>}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>{new Date(m.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div style={{ fontSize: 14, margin: '6px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => doTogglePin(m)} style={{ padding: '5px 12px', background: m.is_pinned ? '#fff3e0' : '#e3f2fd', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{m.is_pinned ? '取消置顶' : '置顶'}</button>
                  <button onClick={() => doEditMoment(m)} style={{ padding: '5px 12px', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>编辑</button>
                  {!m.is_deleted && <button onClick={() => doDeleteMoment(m)} style={{ padding: '5px 12px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>删除</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
