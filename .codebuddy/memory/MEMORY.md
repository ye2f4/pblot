# 长期记忆 (MEMORY)

## 工作目录
- **实际工作仓库在 `e:/my-forum/`**（2026-07-23 曾误判"E: 已改名 F:"，实测 `E:` 存在、`F:` 不存在，统一用 `e:/my-forum`；此前"一律用 F:"已失效）。
- 记忆目录：`e:/my-forum/.codebuddy/memory/`。

## 用户偏好 / 工作约定
- **不用每次都 build**：用户本地有开发服务器（`pnpm dev:all` → 主站 3000 / app 3001），能完成热更新验证。改完代码后**不要**主动跑 `pnpm build`；如有问题用户会把日志发来。（2026-07-19 记录）
- **不要并行写入文件**：执行文件写入（`write_to_file`/`replace_in_file`）时，不要并行/批量发起多个写操作，应逐个顺序执行；`update_memory` 也单独、顺序进行。原因：此前同轮并行写多文件曾出现 "No result found" 写入失败。自 2026-07-20 起生效。（2026-07-20 记录）

## 项目结构关键点
- 双站架构 + 本地 dev 路由：线上由 Vercel `/app` 反向代理拼合。**本地 `pnpm dev:all`** 起一个反向代理在 **:3000**（`scripts/dev-proxy.mjs`，纯 Node、支持 WS）：`/app/*` → next-app（:3001，`apps/next-app`，`basePath:/app`），其余 → Docusaurus 主站（**已迁至 :3002**，由 `pnpm start -- --port 3002` 启动）；音乐本地代理 dev-api 在 **:3009**（`scripts/dev-api.mjs`，`/api/music`）。**独立 `pnpm start` 仍用 :3000**（未走代理）。开 `localhost:3000` 即等价于生产 /app 路由。
- 导航/页脚为共享包 `@mono/ui`（`packages/ui/src`），两端复用以保证 3000/3001 一致：
  - `ui.css` 自包含：复刻原站 shadcn 式 HSL 主题（源 `src/css/variables.css`）+ Infima 类 DOM 样式（`navbar.css`/`components.css`/`custom.css`）。`packages/ui/src/index.ts` 顶部 `import './ui.css'` 统一引入。
  - `SiteHeader.tsx`/`SiteFooter.tsx` 渲染 Infima 类 DOM（`.navbar__*`/`.footer__*`/`.dropdown*`/`.navbar-sidebar*`）。
  - **⚠️ 移动侧边栏铁律**：`SiteHeader` 自带移动侧边栏（本地 `setMobileOpen` state，**不调** Docusaurus 的 `useNavbarMobileSidebar`）。它替换了默认 `@theme/Navbar`，故经典 `Navbar/MobileSidebar/{Toggle,PrimaryMenu,Layout}` 链不再被渲染，那 3 个 swizzle 是**孤儿死代码**（已于 2026-07-23 删除）。`NavbarMobileSidebarProvider` 由 `Layout/Provider`→`NavbarProvider` 提供，但本仓库自定义组件**禁止**调 `useNavbarMobileSidebar`（SiteHeader 不接该 context，一旦在 Layout 外或被 HMR 错拉起即报 `called outside the <NavbarMobileSidebarProvider>`）。`BackToTop`/`EscapeKeyHandler` 原依赖它，前者已改为纯滚动逻辑、后者已删（2026-07-23）。
  - 接入点：主站 swizzle `src/theme/Navbar|Footer/index.tsx`；app `apps/next-app/components/AppNav|AppFooter.tsx`。
  - 配置来源 `src/data/siteData.json`：主站与 app **共用同一份** `navbarConfig`/`footerConfig`（app 端不再有平行配置）。
  - app 端通过 `apps/next-app/lib/docusaurusLinks.ts` 把配置 `to` 解析到 next-app 命名空间（`/app/*` 剥前缀留作站内链接、主站路由改 `siteUrl` 外链），再喂给 SiteHeader/SiteFooter。其逻辑与主站 DLink 相反。
- 绿色按钮基色 `#22c55e`、hover `#16a34a`。主站搜索页 `/search`（`https://monoblog.cc.cd/search`）。
- ICP 备案：`https://icp.gov.moe/?keyword=20265033` → `萌ICP备20265033号`，页脚版权下方。

## /app 静态资源架构（关键，2026-07-22 定案并修正）
- **现象**：`/app/*`（next-app 论坛）页面裸 HTML/无样式。
- **正确架构（全部留在 `monoblog.cc.cd/app` 下，无需子域）**：`vercel.json` 的 rewrite `/app/:path*` → `/api/app/:path*` → 边缘函数 `api/app/[...path].js` 在 **Vercel 内部（Vercel→Vercel）** fetch next-app 真实部署（`NEXT_APP_ORIGIN` 默认 `https://next-app-mocha-three.vercel.app`，可 env 覆盖）。**用户浏览器只跟 `monoblog.cc.cd`(Cloudflare)通信，永不直连 `*.vercel.app`**，故国内封锁 vercel.app 不影响。HTML 与 CSS/JS 全部经同一代理返回，env 一致、哈希匹配。
- **资产前缀**：`apps/next-app/next.config.mjs` 的 `assetPrefix` = `''`(空) → HTML 同源引用 `/app/_next/static/...`，走主站 rewrite→代理抓真实产物。`NEXT_PUBLIC_ASSET_PREFIX` 可临时覆盖。
- **主站必须提交 `static/app/_next`(2026-07-22 修正)**:代理函数只能抓 SSR HTML、抓不到 next-app 静态(见下),所以 CSS/JS **必须由主站提交的 `static/app/_next` 提供**(主站静态层优先级高于 rewrite,直接 serve)。曾因误删 `static/app/_next` 导致页面错乱,也曾在 env 不一致时提交导致 JS 全部 404。**铁律:提交的静态必须用与 Vercel 线上部署相同 env 构建**,否则 JS chunk 哈希不匹配。
- **代理函数只能抓 SSR HTML,抓不到静态(2026-07-22 实测)**:对 next-app 经代理连 `public/LOADING.gif`、`favicon.ico`、`/_next/static/*` 全 404(返回 Next.js 404 页),说明 next-app 在 Vercel 上根本不对外 serve 任何静态文件(静态层疑似未上传/损坏)。**因此"代理提供 CSS/JS 静态"这条路彻底走不通**,静态必须由主站提交的 `static/app/_next` 提供。
- **JS 哈希不对齐的真正根因(2026-07-22 定位 = BOM,非"两个项目")**:线上报 `Invalid header ... apikey: ﻿﻿eyJ...` → Vercel 上的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 值带了 **BOM 零宽字符(U+FEFF)**。BOM 被内联进客户端 chunk → ① 运行时 Supabase `apikey` 请求头含多字节字符报错;② 构建哈希与本地干净 key 构建不同。本地 `.env.local` 是 `vercel env pull` 的干净旧快照(无 BOM),故本地干净构建(`webpack-a1f16472`/`main-app-06ea76de`/`571-e9c87f30`)与线上(带 BOM 部署,`webpack-9069517d` 等)不一致。**关键实测**:本地注入单个 BOM 重建,哈希仍与线上不一致 → 无法精确复现 Vercel 线上 env 字符串(可能多 BOM/零宽或 dotenv 吞 BOM),故**必须让 Vercel 侧把变量改回干净值并重部署**才能对齐。
- **最终解法(2026-07-23)= 源码写死公开常量,彻底绕开 Vercel env**:`apps/next-app/lib/supabase/config.ts` 不再读 `process.env`,直接 `export const SUPABASE_URL` / `SUPABASE_ANON_KEY` 写死(公开值,无保密需求);`app/login/page.tsx` 改从 config 引入 `SUPABASE_URL`。原因:anon key 是公开值(每个浏览器都拿到),没必要走环境变量;Vercel 上该变量带 BOM 且 Redeploy 复用缓存,用户在后台删/改/手敲十几遍都无效。写死后 Vercel 与本地构建同一份源码→内联同一份常量→chunk 哈希天然一致,BOM 问题从根消失,且改源码强制 Vercel 真重建。dashboard 的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 现为死值(可删);`NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` 仍走 env(仅服务端,不影响客户端哈希)。
- **部署铁律(不变)**:`static/app/_next` 必须由与 Vercel 线上**同一份源码+同一份 env** 本地 `pnpm build` 产出并 `git push` 提交,否则 JS chunk 哈希不匹配→404。验证:线上 HTML 引用的 chunk 必须能在 `static/app/_next/static/chunks/` 找到且 200。
- **判据纠正(2026-07-23)**:`webpack-*.js` 是 webpack 运行时引导块,**不内联 env**,哈希不随 Supabase key 变,故不能用它判断"BOM 是否清/Vercel 是否重建"(此前用 `webpack-9069517d` 当判据是错的,害用户白删 env 十几遍)。真正随 env/源码变的是 `main-app-*`/`571-*`/`424bf126-*`/页面 chunk。实证:写死常量 push 后线上 `main-app` `06ea76de→746f3d1f`、`571` `e9c87f30→cfe067e7`、`424bf126` `a48825e0→ab6fdcba`,证明写死方案生效+Vercel 已真重建;webpack 不变属正常。CSS `412159514ded5acf.css` 曾 404 仅因主站静态未同步,`pnpm build`+Copy 到 `static/app/_next/static`+push 即修复。
- **环境事实**：主域名 `monoblog.cc.cd` 走 Cloudflare（172.67.x/104.21.x/2606:4700）；`*.vercel.app` 用户侧不可达，但 Vercel→Vercel 内部可达。
- **注意**：`@docusaurus/plugin-pwa` 须作为 `plugins` 独立项而非 preset 的 `pwa` 键。

## ⚠️ 架构现状（2026-07-23 起：单 Docusaurus）— 上方双站/代理/static/app 诸节均已 RETIRED
- **已彻底移除 Next.js**：`apps/next-app/`、`根 next-app/`、`api/app` 代理、`api/asset-proxy`、`scripts/dev-proxy.mjs`、`static/app`（含提交的 _next 静态）、`src/components/forum/ForumLayout.tsx` 全部删除；`pnpm-workspace.yaml` 去掉 `apps/*`；`vercel.json` 去掉 `/app` 重定向与 `/api/app` rewrite；`packages/ui` 保留（主站仍用）。
- **论坛已搬回 Docusaurus 主站，且已去掉 /app 前缀（2026-07-23）**：页面全部在 `src/pages/` 根（Docusaurus 页面，纯客户端 React + Supabase）：`/forum /chat /friends /moments /submissions /leaderboard /capsule /profile /login /register /complete-profile`；原 `/app` 社区着陆页 → **`community.tsx`（/community）**（因 `/` 被主站首页占用）；`bilibili-callback` 用根 `bilibili-callback.js`（原 app 版重复已删）。**曾经的 `src/pages/app/` 目录已删空**。社区路由判定改用 `src/lib/appRoutes.ts` 的 `isAppRoute()`（含上述路由列表），替代旧的 `startsWith('/app')`。
- **复用主站 Supabase 客户端**：`src/lib/supabase/client.ts` 直接再导出 `src/supabase/supabaseClient.ts`（同一 URL+anon，localStorage 会话 key 一致 → 主站与论坛登录态天然共享，这正是"supabase 关联问题"的根因修复）。`src/lib/supabase/{safe,useUser,config}.ts` 配套；anon key/URL 仍**写死**在 `config.ts` 防 Vercel BOM（沿用上一轮结论）。
- **lib/components 落地位置**：`@/lib/supabase/*`、`@/lib/{chatNotification,dialog}.ts(x)`、`@/components/forum/{MarkdownView,ProfileGuard,ForumTabs,ProfileEditor}.tsx`。`calendar` 复用主站 `src/lib/calendar.js`（`solarToLunar`）。
- **全局守护/导航**：`src/theme/Layout/index.tsx` swizzle（用 `@theme-init/Layout`）注入 `<ProfileGuard/>`（仅社区路由生效，主站页不干预）+ `<ForumTabs/>`（仅社区页顶部显示分区导航）。二者都用 `src/lib/appRoutes.ts` 的 `isAppRoute(pathname)` 判定；ProfileGuard 白名单 `['/login','/register','/complete-profile','/bilibili-callback']`。`routes`: `@docusaurus/router` 的 `useHistory/useLocation`；`<Link>` 用 `@docusaurus/Link`。
- **⚠️ 路由 API 铁律(2026-07-23 实测修正)**:本仓库的 `@docusaurus/router` 实为 **react-router v5** API，**只导出 `Redirect`/`matchPath`/`useHistory`/`useLocation`**，**不导出 `Link`/`Switch`/`useNavigate`**(webpack 报警 `export 'Link' was not found in '@docusaurus/router'` 即源于误从这里引 Link)。⚠️**`Link` 必须 `import Link from '@docusaurus/Link'`**（不是 `@docusaurus/router`）。所有 `/app/*` 页面跳转必须用 `const history = useHistory(); history.push(path)` / `history.replace(path)`，绝不能用 `useNavigate`/`navigate()`。现有可运行页面(`WeatherWidget`/`calendar`/`locations`/`bilibili-callback.js`根)均用 `useHistory` 证实此约定。记忆里"routes 用 useNavigate"是错的,已纠正。
- **dev 脚本**：`dev:all` 现为 `concurrently "pnpm start"(主站 :3000) "node scripts/dev-api.mjs"(音乐 :3009)`；不再有 next-app / 代理 / :3001 / :3002。
- **⚠️ rspack dev + React.lazy 铁律**：`future.faster`(rspack) 的 **dev server 不支持客户端 `React.lazy` 动态导入**（报 `Loading chunk ... failed (timeout)`）；生产构建正常。故 `docusaurus.config.js` 设 `future.faster: process.env.NODE_ENV === 'production'`（dev 回退 webpack）。**首页 `WeatherWidget`/`CommentSection`/`AdSection` 及 `CarouselSection`(react-slick) 必须保持 `React.lazy`**——它们在 render 期访问 `window`/`localStorage`，`lazy()` 让其服务端 suspend、仅客户端执行，避免 SSR `window is not defined`。**绝不可改成静态 import**。改 `future.faster`/打包器后需重启 `pnpm start`。
- **构建注意**：本沙箱 `pnpm install` 报环境性 `mkdir '\\?'` 失败（pnpm store 路径 bug），无法在此跑 `pnpm build`；但 `oxlint` 对迁移代码零 correctness 错误。真实机器 `pnpm build` 应正常（/app/* 由 Docusaurus 静态产出）。
- **部署脚本**：`scripts/github-push.mjs` 的 `nextAppHook`（独立 next-app 部署钩子）已移除，现在是单站部署。
