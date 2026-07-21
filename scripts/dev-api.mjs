// scripts/dev-api.mjs
// 本地开发用的网易云音乐代理服务（:3009）。
// 仅在 `pnpm dev` / `pnpm dev:all` 时启动；生产由 Vercel 的 api/music.js 提供。
// 浏览器在开发环境会请求 http://localhost:3009/api/music（见 src/components/TopBanner/index.js）。
import http from 'node:http';
import { fetchMusic } from '../api/music-core.mjs';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
};

const PORT = Number(process.env.DEV_API_PORT) || 3009;

const server = http.createServer(async (req, res) => {
  // 允许主站 :3000 跨源访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/music') {
    try {
      const idsParam = url.searchParams.get('ids');
      const pid = url.searchParams.get('pid') || '';
      const ids = idsParam
        ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const songs = await fetchMusic({ ids, pid });
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(songs));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(String((e && e.message) || e).includes('missing') ? 400 : 500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[dev-api] music proxy listening on http://localhost:${PORT}/api/music`);
});
