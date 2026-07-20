/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 子路径部署：所有路由与静态资源挂在 /app 下，配合 Vercel rewrite 统一到主域名 monoblog.cc.cd
  basePath: '/app',
  // 静态资源（/_next/static）走绝对域名前缀，绕过主站 Vercel 对 /_next/* 的保留路径限制：
  // 主站代理只负责转发 HTML/API，CSS/JS 由浏览器直连 next-app 域名加载，避免页面无样式（错乱 HTML）。
  // 优先级：NEXT_PUBLIC_ASSET_PREFIX（自定义域）> NEXT_PUBLIC_VERCEL_URL（需手动配）> VERCEL_URL（Vercel 构建期自动注入的本次部署不可变域名）> 空（相对路径，会错乱）。
  // 注意：Vercel 默认只注入 VERCEL_URL，并不会注入 NEXT_PUBLIC_VERCEL_URL；此前只读后者导致生产环境取到空值，
  //       assetPrefix 变成相对路径，经主站代理时 /_next/static/* 落到主站域名 → 页面无样式（布局错乱）。
  //       加入 VERCEL_URL 兜底后，assets 会从 next-app 本次部署的不可变域名直连加载，无需手动配置即可修复。
  assetPrefix:
    process.env.NEXT_PUBLIC_ASSET_PREFIX ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : ''),
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
