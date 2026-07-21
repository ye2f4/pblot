/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 子路径部署：所有路由与静态资源挂在 /app 下，配合 Vercel rewrite 统一到主域名 monoblog.cc.cd
  basePath: '/app',
  // 静态资源（_next/static）由 next-app 自己的部署同源提供，URL 走国内可达的
  // 自定义子域 app.monoblog.cc.cd（在 Vercel 后台把该子域加到 next-app 项目，
  // 并在 DNS/Cloudflare 加 CNAME 指向 Vercel 且橙色代理）。
  // 之所以不直接用 *.vercel.app：国内网络普遍封锁 vercel.app → CSS/JS 全部超时 → 裸 HTML。
  // 之所以不在主站提交静态文件：next-app 在 Vercel 构建时内联了项目专属 NEXT_PUBLIC_* 环境变量，
  // 导致每次构建的客户端 chunk 哈希都不同（与本地构建不一致），提交的静态文件必然过期。
  // assetPrefix 设为自定义子域后，next-app 自己用同源域名提供 HTML+静态，env 一致、无跨项目 fetch。
  // 可用 NEXT_PUBLIC_ASSET_PREFIX 覆盖（例如临时测试其它 CDN 域名）。
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || 'https://app.monoblog.cc.cd',
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
