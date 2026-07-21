<<<<<<< HEAD
// /api/music.js
// Vercel Edge 函数：网易云音乐代理。
// 核心逻辑抽到 api/music-core.mjs，与本地开发服务（scripts/dev-api.mjs）共用，
// 避免两份实现漂移（也解决了"本地 dev 没有 /api/music 端点"导致 netease 修复看不到效果的问题）。
import { fetchMusic } from './music-core.mjs';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const pid = searchParams.get('pid');
  try {
    const ids = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const songs = await fetchMusic({ ids, pid: pid || '' });
    return new Response(JSON.stringify(songs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    const isMissing = String((e && e.message) || e).includes('missing');
    return new Response(JSON.stringify({ error: String(e) }), {
      status: isMissing ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
=======
// /api/music.js
// Vercel Edge 函数：网易云音乐代理。
// 核心逻辑抽到 api/music-core.mjs，与本地开发服务（scripts/dev-api.mjs）共用，
// 避免两份实现漂移（也解决了"本地 dev 没有 /api/music 端点"导致 netease 修复看不到效果的问题）。
import { fetchMusic } from './music-core.mjs';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const pid = searchParams.get('pid');
  try {
    const ids = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const songs = await fetchMusic({ ids, pid: pid || '' });
    return new Response(JSON.stringify(songs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    const isMissing = String((e && e.message) || e).includes('missing');
    return new Response(JSON.stringify({ error: String(e) }), {
      status: isMissing ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
