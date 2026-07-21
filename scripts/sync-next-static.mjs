// 把 next-app 的构建产物 .next/static 同步到主站 static/app/_next/static，
// 使主站（monoblog.cc.cd）能同源托管 /app/_next/* 静态资源。
//
// 背景：next-app 是独立 Vercel 项目，其 _next/static 无法经主站函数代理获取
// （Vercel 会把含扩展名的 /api/* 当静态文件拦截；跨项目 serverless fetch 也拿不到
// next-app 的 _next/static）。因此改为由主站项目直接托管这些静态文件。
//
// 用法（在 next-app 改动 CSS/JS 后）：
//   1) pnpm --filter next-app build
//   2) node scripts/sync-next-static.mjs
//   3) git add static/app/_next && git commit && git push
import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'apps/next-app/.next/static');
const dst = resolve(root, 'static/app/_next/static');

await rm(dst, { recursive: true, force: true });
await mkdir(dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });
console.log(`synced ${src} -> ${dst}`);
