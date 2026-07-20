import React, { useEffect, useRef, useState } from 'react';

export default function DevDeployPanel() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevDeployPanelInner />;
}

function DevDeployPanelInner() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle');
  const [deploying, setDeploying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');
  const esRef = useRef(null);
  const logBoxRef = useRef(null);

  useEffect(() => {
    const es = new EventSource('/api/deploy-events');
    esRef.current = es;
    // 服务端用 JSON.stringify 推送，这里还原（字符串去引号，兼容特殊字符）
    const parse = (e) => { try { return JSON.parse(e.data); } catch { return e.data; } };
    es.addEventListener('clear', () => setLogs([]));
    es.addEventListener('log', (e) => setLogs((l) => [...l, parse(e)]));
    es.addEventListener('warn', (e) => setLogs((l) => [...l, '⚠ ' + parse(e)]));
    es.addEventListener('status', (e) => setStatus(parse(e)));
    es.addEventListener('deployError', (e) => setLogs((l) => [...l, '❌ ' + parse(e)]));
    return () => es.close();
  }, []);

  useEffect(() => {
    if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (status === 'done' || status === 'previewDone' || status === 'error') setDeploying(false);
  }, [status]);

  useEffect(() => {
    fetch('/api/deploy-status').then((r) => r.json()).then(setCfg).catch(() => setCfg({ error: true }));
  }, []);

  const run = async (dry) => {
    if (deploying) return;
    setDeploying(true);
    setStatus(dry ? 'previewing' : 'deploying');
    setLogs((l) => [...l, dry ? '▶ 预览改动…' : '▶ 开始部署…']);
    try {
      const res = await fetch('/api/deploy' + (dry ? '?dry=1' : ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg }),
      });
      if (!res.ok) setLogs((l) => [...l, '❌ 接口错误 ' + res.status]);
    } catch (e) {
      setLogs((l) => [...l, '❌ 请求失败：' + e.message]);
      setDeploying(false);
    }
  };

  const statusLabel = {
    idle: '空闲',
    deploying: '部署中…',
    previewing: '预览中…',
    done: '✅ 部署完成',
    previewDone: '✅ 预览完成',
    error: '❌ 出错',
  }[status];

  const accent = status === 'error' ? '#d32f2f' : status === 'idle' ? '#2563eb' : '#d97706';

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} style={fabStyle}>
        🚀 部署
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ ...headerStyle, borderBottom: `2px solid ${accent}` }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🚀 双轨一键部署（dev）</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCollapsed(true)} style={iconBtnStyle} title="收起">–</button>
        </span>
      </div>

      <div style={{ padding: '8px 10px', fontSize: 12, color: '#555', borderBottom: '1px solid #eee' }}>
        {cfg == null && '读取配置中…'}
        {cfg && cfg.error && '⚠ 读取配置失败'}
        {cfg && !cfg.error && (
          <>
            仓库：<b>{cfg.repo || '未配置'}</b>　分支：<b>{cfg.branch}</b><br />
            Token：{cfg.hasToken ? '✅ 已配置' : '❌ 未配置（请在 scripts/deploy.config.mjs 填入 GITHUB_TOKEN）'}<br />
            Vercel Hook：{cfg.hasVercelHook ? '✅ 已配置' : '⚪ 未配置（仅推 GitHub）'}<br />
            git 提交：{cfg.gitEnabled ? '✅ 开启（优先真实 git commit）' : '⚪ 关闭（仅用 API）'}
          </>
        )}
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>
          提交信息（git commit -m）：用 <b>update:Vx.x</b> 可激活网站 AI 更新日志
        </div>
        <input
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder={cfg?.message || 'deploy: 自动同步'}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 6 }}
        />
      </div>

      <div style={btnRowStyle}>
        <button onClick={() => run(false)} disabled={deploying} style={{ ...actionBtnStyle, background: '#d32f2f' }}>
          🚀 一键部署
        </button>
        <button onClick={() => run(true)} disabled={deploying} style={{ ...actionBtnStyle, background: '#2563eb' }}>
          👁 预览改动
        </button>
      </div>

      <div ref={logBoxRef} style={logBoxStyle}>
        {logs.length === 0 && <span style={{ color: '#999' }}>日志区（点击上方按钮开始）…</span>}
        {logs.map((l, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>{l}</div>
        ))}
      </div>

      <div style={{ padding: '4px 10px 8px', fontSize: 11, color: '#999' }}>
        状态：{statusLabel}
      </div>
    </div>
  );
}

const panelStyle = {
  position: 'fixed',
  left: 16,
  bottom: 16,
  zIndex: 99997,
  width: 320,
  maxWidth: '92vw',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  overflow: 'hidden',
};
const fabStyle = {
  position: 'fixed',
  left: 16,
  bottom: 16,
  zIndex: 99997,
  background: '#d32f2f',
  color: '#fff',
  border: 'none',
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 13,
  cursor: 'pointer',
  boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
};
const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  background: '#f7f7f9',
};
const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: '#666',
};
const btnRowStyle = {
  display: 'flex',
  gap: 8,
  padding: '8px 10px',
};
const actionBtnStyle = {
  flex: 1,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 6px',
  fontSize: 13,
  cursor: 'pointer',
};
const logBoxStyle = {
  height: 200,
  overflowY: 'auto',
  background: '#0d1117',
  color: '#c9d1d9',
  padding: 10,
  fontFamily: 'monospace',
  fontSize: 11,
};
