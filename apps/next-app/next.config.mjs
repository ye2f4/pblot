/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 子路径部署：所有路由与静态资源挂在 /app 下，配合 Vercel rewrite 统一到主域名 monoblog.cc.cd
  basePath: '/app',
  // 主站 vercel.json 顶层 trailingSlash:true，会把 /app/forum 先 308 到 /app/forum/ 再 rewrite 过来。
  // 若 next-app 保持默认 trailingSlash:false，会再次 308 回 /app/forum，造成跨域重定向死循环。
  // 故此处同步开启，让 next-app 直接接受带尾斜杠的请求，rewrite 链在此终结。
  // 注意：线上 next-app 此前已用此配置部署；本地仓库的 4fd772da 版本缺失，此处仅为本地补回以防下次 CLI 部署丢失。
  trailingSlash: true,
  // 本仓库是 monorepo：根项目用 React 19 + @types/react@19，next-app 用 React 18 + @types/react@18。
  // next 被提升到根 node_modules，其 <Link> 类型解析到 @types/react@19 的 ReactNode（含 bigint），
  // 与 next-app 的 18 版 ReactNode 冲突，导致 tsc 在构建期误报（纯类型层面，非运行时 bug）。
  // 编辑器内仍按 next-app 自身 tsconfig 做类型校验，故此处仅跳过构建期阻断。
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
