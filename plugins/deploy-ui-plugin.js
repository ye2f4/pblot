const path = require('path');
const { pathToFileURL } = require('url');

// 把「双轨一键部署」后端注入 Docusaurus dev server，
// 这样只需 `pnpm start` 即可在网页里点按钮触发部署，无需另开 `pnpm deploy:ui`。
// 仅 development 模式生效：生产构建不会有这些路由，密钥永不落到前端。
//
// 注意：Docusaurus 3.x 的 webpack-dev-server（WDS v5）没有 configureDevServer 生命周期，
// 正确做法是经由 configureWebpack 返回 devServer.setupMiddlewares，
// 把我们的 /api/* 处理器 unshift 到 connect-history-api-fallback 之前，
// 否则 fallback 会把 /api/* 的 GET 重写到 index.html。
module.exports = function deployUiPlugin() {
  const isDev = process.env.NODE_ENV === 'development';
  const clients = new Set();
  let modPromise = null;

  function loadMod() {
    if (!modPromise) {
      modPromise = import(pathToFileURL(path.resolve(__dirname, '../scripts/github-push.mjs')).href).catch((e) => {
        modPromise = null;
        throw e;
      });
    }
    return modPromise;
  }

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) {
      try { c.write(payload); } catch { /* noop */ }
    }
  }

  return {
    name: 'deploy-ui-plugin',

    configureWebpack() {
      if (!isDev) return {};

      return {
        devServer: {
          setupMiddlewares: (middlewares, devServer) => {
            // 补回 Docusaurus 默认的 eval 源码映射中间件（被 webpack-merge 覆盖，需手动加回）
            try {
              const createEvalSourceMap = require('@docusaurus/core/lib/commands/utils/legacy/evalSourceMapMiddleware');
              middlewares.unshift({ name: 'eval-source-map', middleware: createEvalSourceMap(devServer) });
            } catch { /* 不影响部署功能 */ }

            // 把 /api/* 处理器插到最前，确保先于 historyApiFallback 生效
            middlewares.unshift({
              name: 'deploy-ui-api',
              middleware: async (req, res, next) => {
                const url = req.url.split('?')[0];

                // 实时日志流（SSE）
                if (req.method === 'GET' && url === '/api/deploy-events') {
                  res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive',
                    'X-Accel-Buffering': 'no',
                  });
                  res.write('\n');
                  clients.add(res);
                  const ping = setInterval(() => {
                    try { res.write(': ping\n\n'); } catch { /* noop */ }
                  }, 15000);
                  req.on('close', () => { clearInterval(ping); clients.delete(res); });
                  return;
                }

                // 部署配置状态（不含 token 明文，实时重读配置）
                if (req.method === 'GET' && url === '/api/deploy-status') {
                  loadMod()
                    .then((mod) => mod.getDeployStatus())
                    .then((status) => {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify(status));
                    })
                    .catch((e) => {
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: e.message }));
                    });
                  return;
                }

                // 触发部署 / 预览（复用 scripts/github-push.mjs 的 runDeploy）
                if (req.method === 'POST' && url === '/api/deploy') {
                  // setupMiddlewares 的 req 是原始 IncomingMessage，无 req.query，需手动解析 query
                  const params = new URLSearchParams(req.url.split('?')[1] || '');
                  const dry = params.get('dry') === '1' || params.get('dry') === 'true';
                  // 读取请求体中的提交信息（commit message），供 git commit -m 使用
                  let body = {};
                  try {
                    const chunks = [];
                    for await (const c of req) chunks.push(c);
                    const raw = Buffer.concat(chunks).toString('utf8');
                    if (raw) body = JSON.parse(raw);
                  } catch { /* 忽略解析错误，使用默认提交信息 */ }
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ ok: true, dry }));
                  loadMod().then((mod) => {
                    broadcast('status', dry ? 'previewing' : 'deploying');
                    broadcast('clear', '');
                    return mod.runDeploy({
                      dryRun: dry,
                      message: body.message,
                      onLog: (...a) => broadcast('log', a.join(' ')),
                      onWarn: (...a) => broadcast('warn', a.join(' ')),
                    });
                  }).then(() => {
                    broadcast('status', dry ? 'previewDone' : 'done');
                  }).catch((e) => {
                    broadcast('deployError', e.message || String(e));
                    broadcast('status', 'error');
                  });
                  return;
                }

                next();
              },
            });

            return middlewares;
          },
        },
      };
    },
  };
};
