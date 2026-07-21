// /api/asset-proxy/[...path].js
// 承接主站 /app/_next/* 的静态资源（CSS/JS/字体等），转发到 next-app。
//
// 为什么需要这个独立函数（而不是并入 /api/app/[...path].js）：
// Vercel 不允许 `_next` 出现在函数路由路径中——请求 /api/app/_next/... 会被平台
// 当成静态文件请求直接拦截（返回 x-vercel-error: NOT_FOUND），根本不进入函数。
// 因此用 /api/asset-proxy/* 这个不含 _next 字面量的路径承接，由本函数在 Vercel
// 边缘网络内再去 next-app 取资源（Vercel→Vercel 可达，不受用户网络限制）。
//
// next-app 在 Vercel 平台静态文件层的位置不确定（/_next/... 域名根 或 /app/_next/...
// 带 basePath），故对两个候选依次尝试，返回首个非 404。
export const config = {
  runtime: 'edge',
};

const NEXT_APP_ORIGIN =
  process.env.NEXT_APP_ORIGIN || 'https://next-app-mocha-three.vercel.app';

const HOP_BY_HOP = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'trailer',
];

export default async function handler(req) {
  const url = new URL(req.url);
  // req.url 形如 https://<host>/api/asset-proxy/static/css/x.css
  let rest = url.pathname.replace(/^\/api\/asset-proxy/, '');
  if (rest === '') rest = '/';

  const candidates = ['/_next' + rest, '/app/_next' + rest];
  let upstream = null;
  let usedPath = null;
  let lastErr = null;

  for (const base of candidates) {
    const target = new URL(base + url.search, NEXT_APP_ORIGIN);
    try {
      const r = await fetch(target.toString(), {
        method: 'GET',
        redirect: 'manual',
      });
      usedPath = base;
      if (r.status !== 404) {
        upstream = r;
        break;
      }
      // 404：尝试下一个候选，保留最后一个作为兜底响应
      upstream = r;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!upstream) {
    return new Response(
      'Asset proxy upstream error: ' + (lastErr?.message || 'no candidate'),
      { status: 502 }
    );
  }

  const respHeaders = new Headers();
  respHeaders.set('x-proxy-path', usedPath || '');
  respHeaders.set('access-control-allow-origin', '*');
  for (const [k, v] of upstream.headers.entries()) {
    const lk = k.toLowerCase();
    if (HOP_BY_HOP.includes(lk)) continue;
    if (lk === 'set-cookie') {
      respHeaders.append('set-cookie', v);
      continue;
    }
    respHeaders.set(k, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
