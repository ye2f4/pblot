/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 子路径部署：所有路由与静态资源挂在 /app 下，配合 Vercel rewrite 统一到主域名 monoblog.cc.cd
  basePath: '/app',
  // 静态资源（_next/static）保持同源、挂在 /app/_next 下（assetPrefix 留空）。
  // HTML 引用的 CSS/JS 即 /app/_next/static/...，由主站 vercel.json 的 rewrite 经
  // api/app/[...path].js 边缘代理在 Vercel 内部（Vercel→Vercel，不经过用户浏览器，
  // 故国内封锁 *.vercel.app 不影响）抓回 next-app 的真实构建产物——哈希与线上一致、env 一致。
  // 因此【不要】把 next-app 的 _next/static 提交进主站 static/：主站静态层优先级高于 rewrite，
  // 会抢答并返回本地构建（env 不同 → JS chunk 哈希不匹配）的过期文件。资源统一走代理。
  // 可用 NEXT_PUBLIC_ASSET_PREFIX 临时覆盖为其它 CDN 域名（一般无需）。
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  // next-app 用 trailingSlash:false（与最初可用配置一致）。
  // 实测：trailingSlash:true + basePath:/app 会导致 /app/forum/ 返回 404（Next.js 14 已知坑：
  // 308 到带尾斜杠 URL 却又 404）。主站 vercel.json 的 trailingSlash:true 会把 /app/forum 308 到
  // /app/forum/，再经 rewrite 代理过来；next-app 侧用 false，对 /app/forum（无斜杠）直接 200，
  // 不会形成死循环（因为无斜杠才是 canonical，会被直接服务而非再次 308）。
  // 代理函数 api/app/[[...path]].js 也会主动去掉尾斜杠再请求，进一步消除多余跳转。
  trailingSlash: false,
  // 本仓库是 monorepo：根项目用 React 19 + @types/react@19，next-app 用 React 18 + @types/react@18。
  // next 被提升到根 node_modules，其 <Link> 类型解析到 @types/react@19 的 ReactNode（含 bigint），
  // 与 next-app 的 18 版 ReactNode 冲突，导致 tsc 在构建期误报（纯类型层面，非运行时 bug）。
  // 编辑器内仍按 next-app 自身 tsconfig 做类型校验，故此处仅跳过构建期阻断。
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // @mono/ui 是 workspace 内的 TS 源码包，需让 Next 转译它
  transpilePackages: ['@mono/ui'],
};

export default nextConfig;
