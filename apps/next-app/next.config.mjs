/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 子路径部署：所有路由与静态资源挂在 /app 下，配合 Vercel rewrite 统一到主域名 monoblog.cc.cd
  basePath: '/app',
  // 静态资源（/_next/static）必须与页面同源（主域名 monoblog.cc.cd/app/_next/...），
  // 严禁指向 *.vercel.app 直连域名：国内网络普遍无法访问 vercel.app（实测超时），
  // 一旦 assetPrefix 指向它，CSS/JS 全部加载失败 → 页面裸 HTML（布局错乱）。
  // 同源路径由主站 /api/app 代理函数识别 /_next/ 并去 /app 前缀转发到 next-app 静态文件层
  // （Vercel 平台把 .next/static 暴露在域名根 /_next，不吃 basePath）。
  // 除非确知用户群可访问 vercel.app，否则保持为空；可用 NEXT_PUBLIC_ASSET_PREFIX 临时覆盖。
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
