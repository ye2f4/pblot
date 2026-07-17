#!/usr/bin/env node
/**
 * deploy-server.mjs — 双轨部署的本地 UI 服务（免 Git 触发）
 * -------------------------------------------------------------
 * 启动后浏览器打开 http://localhost:3001，点「一键部署」即可把当前
 * 工作区免 Git 直推 GitHub（A 线）+ 触发 Vercel 重新构建（B 线）。
 * 部署逻辑完全复用 github-push.mjs 的 runDeploy()，不调用任何 git 命令。
 *
 * 配置：与 github-push.mjs 一致——环境变量 或 scripts/deploy.config.mjs
 *   （含 GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH / VERCEL_DEPLOY_HOOK）
 *
 * 启动：
 *   node scripts/deploy-server.mjs          # 或 pnpm deploy:ui
 *   DEPLOY_UI_PORT=4000 node scripts/deploy-server.mjs
 */

import { createServer } from 'node:http';
import { runDeploy, getDeployStatus } from './github-push.mjs';

const PORT = Number(process.env.DEPLOY_UI_PORT ?? 3001);
const ROOT_URL = `http://localhost:${PORT}`;
const clients = new Set();
let deploying = false;

// 向所有已连接的网页推送一条 SSE 事件
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

function statusHtml() {
  const s = getDeployStatus();
  const row = (k, v) =>
    `<div class="row"><span>${k}</span><b>${v}</b></div>`;
  return [
    row('目标仓库', s.repo ? `<code>${s.repo}</code>` : '<span class="bad">未配置</span>'),
    row('目标分支', `<code>${s.branch}</code>`),
    row('GitHub Token', s.hasToken ? '<span class="ok">已配置</span>' : '<span class="bad">未配置</span>'),
    row('Vercel Hook', s.hasVercelHook ? '<span class="ok">已配置</span>' : '<span class="muted">未配置（跳过 B 线）</span>'),
  ].join('');
}

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>双轨一键部署</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%); color: #1a1a1a;
  }
  .card {
    width: 100%; max-width: 600px; background: #fff; border-radius: 18px;
    padding: 32px; box-shadow: 0 12px 48px rgba(0,0,0,0.12);
  }
  h1 { margin: 0 0 4px; font-size: 24px; }
  .sub { margin: 0 0 20px; color: #666; font-size: 14px; }
  .status {
    background: #f7f9fc; border: 1px solid #e6ecf5; border-radius: 12px;
    padding: 14px 16px; margin-bottom: 20px; font-size: 14px;
  }
  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .row code { background: #eef2f8; padding: 1px 8px; border-radius: 6px; font-size: 13px; }
  .ok { color: #1a8a3c; font-weight: 600; }
  .bad { color: #d23b3b; font-weight: 600; }
  .muted { color: #999; }
  .actions { display: flex; gap: 12px; margin-bottom: 16px; }
  .btn {
    flex: 1; padding: 13px 18px; border: none; border-radius: 10px; font-size: 15px;
    font-weight: 600; cursor: pointer; transition: transform .05s ease, opacity .2s ease;
  }
  .btn:active { transform: translateY(1px); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn.primary { background: #4285f4; color: #fff; }
  .btn.ghost { background: #eef2f8; color: #333; }
  .badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px;
    font-weight: 600; margin-bottom: 14px;
  }
  .badge.idle { background: #eef2f8; color: #555; }
  .badge.deploying, .badge.previewing { background: #fff4e0; color: #b9770a; }
  .badge.done, .badge.previewDone { background: #e6f6ec; color: #1a8a3c; }
  .badge.error { background: #fdeaea; color: #d23b3b; }
  .term {
    background: #0f172a; color: #d6e2f0; border-radius: 12px; padding: 16px;
    height: 280px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px; line-height: 1.7; margin: 0; white-space: pre-wrap; word-break: break-all;
  }
  .line.log::before { content: "› "; color: #6ea8fe; }
  .line.warn { color: #ffcf6e; }
  .line.err { color: #ff8a8a; }
</style>
</head>
<body>
  <div class="card">
    <h1>🚀 双轨一键部署</h1>
    <p class="sub">免 Git 直推 GitHub（A 线）+ Vercel 重新构建（B 线）</p>
    <div class="status" id="status">__STATUS__</div>
    <div class="actions">
      <button id="deploy" class="btn primary">🚀 一键部署</button>
      <button id="preview" class="btn ghost">👁 预览改动</button>
    </div>
    <div class="badge idle" id="badge">空闲</div>
    <pre class="term" id="log"></pre>
  </div>
  <script>
    var es = new EventSource('/events');
    var logEl = document.getElementById('log');
    var badge = document.getElementById('badge');
    var deployBtn = document.getElementById('deploy');
    var previewBtn = document.getElementById('preview');
    var statusMap = {
      idle: '空闲', deploying: '部署中…', previewing: '预览中…',
      done: '完成 ✓', previewDone: '预览完成', error: '出错 ✗'
    };
    function append(text, cls) {
      var div = document.createElement('div');
      div.className = 'line ' + cls;
      div.textContent = text;
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;
    }
    es.addEventListener('status', function (e) {
      badge.textContent = statusMap[e.data] || e.data;
      badge.className = 'badge ' + e.data;
      var busy = (e.data === 'deploying' || e.data === 'previewing');
      deployBtn.disabled = busy; previewBtn.disabled = busy;
    });
    es.addEventListener('log', function (e) { append(e.data, 'log'); });
    es.addEventListener('warn', function (e) { append(e.data, 'warn'); });
    es.addEventListener('deployError', function (e) { append('错误：' + e.data, 'err'); });
    es.addEventListener('clear', function () { logEl.innerHTML = ''; });
    deployBtn.onclick = function () { fetch('/deploy', { method: 'POST' }); };
    previewBtn.onclick = function () { fetch('/deploy?dry=1', { method: 'POST' }); };
  </script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, ROOT_URL);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE.replace('__STATUS__', statusHtml()));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/deploy') {
    if (deploying) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, msg: '已有部署在进行中' }));
      return;
    }
    const dry = url.searchParams.get('dry') === '1';
    deploying = true;
    broadcast('status', dry ? 'previewing' : 'deploying');
    broadcast('clear', '');
    // 先回 200，部署在后台异步执行，日志通过 SSE 实时推送
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dry }));

    (async () => {
      try {
        await runDeploy({
          dryRun: dry,
          onLog: (...a) => broadcast('log', a.join(' ')),
          onWarn: (...a) => broadcast('warn', a.join(' ')),
        });
        broadcast('status', dry ? 'previewDone' : 'done');
      } catch (e) {
        broadcast('deployError', e.message);
        broadcast('status', 'error');
      } finally {
        deploying = false;
      }
    })();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  双轨部署 UI 已启动 →  ${ROOT_URL}`);
  console.log(`  在浏览器打开后点击「一键部署」即可（全程无需 Git）。\n`);
});
