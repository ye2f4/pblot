// /api/app/[...path].js
// Edge 反向代理：把主站 /app/* 代理到 next-app。
// 原因：Vercel 免费计划（Hobby）会静默丢弃「rewrite 到外部域名」的规则，
//       导致 /app/* 落到主站静态文件 → 404。改为内部 rewrite 到本函数（所有计划都支持），
//       由本函数在 Vercel 边缘网络内 fetch next-app（Vercel→Vercel 可达）。
// 注意：必须用「必需 catch-all」[...path]（而非可选 [[...path]]），否则带尾斜杠的
//       /api/app/forum/ 不会被匹配，rewrite 会落到主站静态 404。
export const config = {
  runtime: 'edge',
};

// next-app 的生产域名（稳定，跨部署不变）。可在 Vercel 项目环境变量中覆盖 NEXT_APP_ORIGIN。
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
  // req.url 形如 https://<host>/api/app/forum 或 https://<host>/api/app
  // Vercel 把请求 rewrite 到函数时，函数看到的仍是原始路径（如 /app/forum），
  // 直连时则是 /api/app/forum。两种都要兼容：依次剥离 /api/app 与 /app 前缀。
  let rest = url.pathname.replace(/^\/api\/app/, '').replace(/^\/app/, '');
  if (rest === '') rest = '/';
  // 去掉尾斜杠，避免 next-app（trailingSlash:false）再做一次 308 跳转
  if (rest.length > 1 && rest.endsWith('/')) rest = rest.slice(0, -1);
  // next-app 配置了 basePath:'/app'，故在其域名下路径需带 /app 前缀
  const targetPath = '/app' + (rest === '/' ? '' : rest);
  const target = new URL(targetPath + url.search, NEXT_APP_ORIGIN);

  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    const lk = k.toLowerCase();
    if (lk === 'host' || lk === 'content-length' || lk === 'connection') continue;
    headers.set(k, v);
  }

  const method = req.method;
  const init = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), init);
  } catch (e) {
    return new Response('Proxy upstream error: ' + e.message, { status: 502 });
  }

  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    const lk = k.toLowerCase();
    if (HOP_BY_HOP.includes(lk)) continue;
    if (lk === 'location') {
      let loc = v;
      if (loc.startsWith(NEXT_APP_ORIGIN)) {
        loc = new URL(loc).pathname + new URL(loc).search;
      }
      // 统一映射为 /api/app/* 直达代理函数（避免双 /app）
      if (loc.startsWith('/app')) {
        loc = '/api/app' + loc.slice(4);
      } else if (loc.startsWith('/')) {
        loc = '/api/app' + loc;
      }
      respHeaders.set('location', loc);
      continue;
    }
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
