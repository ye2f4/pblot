// /api/asset-proxy.js —— 调试版：尝试多组候选路径，全部失败时返回诊断信息。
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
  const assetPath =
    url.searchParams.get('p') ||
    url.pathname.replace(/^\/api\/asset-proxy/, '') ||
    '/';
  const extra = url.search.replace(/^\?p=[^&]*/, '');

  const candidates = [
    assetPath,
    '/app' + assetPath,
    assetPath.replace('/_next/', '/_next/app/'), // 理论排除
    assetPath.replace('/css/', '/css/app/'),
  ];

  const results = [];
  let upstream = null;
  let usedPath = null;

  for (const base of candidates) {
    const target = new URL(base + extra, NEXT_APP_ORIGIN);
    try {
      const r = await fetch(target.toString(), { method: 'GET', redirect: 'manual' });
      results.push(base + ' => ' + r.status);
      if (r.status !== 404) {
        upstream = r;
        usedPath = base;
        break;
      }
      upstream = r;
    } catch (e) {
      results.push(base + ' => ERR ' + e.message);
    }
  }

  if (!upstream) {
    return new Response('no upstream. tried:\n' + results.join('\n'), { status: 502 });
  }
  if (upstream.status === 404) {
    // 全部 404：返回诊断
    return new Response('ALL 404. tried:\n' + results.join('\n') + '\norigin=' + NEXT_APP_ORIGIN, {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    });
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
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}
