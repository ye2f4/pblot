// /api/asset-proxy.js
// 承接主站 /app/_next/* 的静态资源（CSS/JS/字体等），转发到 next-app。
//
// 关键：资源路径必须放在查询参数 p 里，不能放在函数路径中。
// Vercel 会把 /api/* 中含文件扩展名（.css/.js 等）的路径当成静态文件请求直接拦截
// （返回 x-vercel-error: NOT_FOUND），不进入函数；路径里带 _next 也会被拦截。
// 故 rewrite 把 /app/_next/static/css/x.css 映射为
//   /api/asset-proxy?p=/_next/static/css/x.css
// 函数路径 /api/asset-proxy 无扩展名也无 _next，可正常命中。
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
  try {
    const url = new URL(req.url);
    // p 形如 /_next/static/css/x.css（含前导 /_next，由 rewrite 注入）
    let assetPath =
      url.searchParams.get('p') ||
      url.pathname.replace(/^\/api\/asset-proxy/, '') ||
      '/';
    // 保留原始查询（RSC 请求的 ?_rsc=xxx 等）拼到上游请求
    const extra = url.search.replace(/^\?p=[^&]*/, '');

    // 候选：/_next/...（域名根）与 /app/_next/...（带 basePath）
    const candidates = [assetPath, '/app' + assetPath];
    let upstream = null;
    let usedPath = null;
    let lastErr = null;

    for (const base of candidates) {
      const target = new URL(base + extra, NEXT_APP_ORIGIN);
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
  } catch (e) {
    return new Response(
      'ASSET-PROXY-ERR: ' + (e && e.stack ? e.stack : String(e)),
      { status: 500, headers: { 'content-type': 'text/plain' } }
    );
  }
}
