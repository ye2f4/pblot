# 长期记忆 (MEMORY)

## 工作目录
- **实际工作仓库在 `e:/my-forum/`**（用户工作区、所有 git 操作均在此；"2026-07-20 迁移 F 盘"的记忆疑似有误/或为另一副本，本会话一律用 E:）。
- 记忆目录：`e:/my-forum/.codebuddy/memory/`。

## 用户偏好 / 工作约定
- **不用每次都 build**：用户本地有开发服务器（`pnpm dev:all` → 主站 3000 / app 3001），能完成热更新验证。改完代码后**不要**主动跑 `pnpm build`；如有问题用户会把日志发来。（2026-07-19 记录）
- **不要并行写入文件**：执行文件写入（`write_to_file`/`replace_in_file`）时，不要并行/批量发起多个写操作，应逐个顺序执行；`update_memory` 也单独、顺序进行。原因：此前同轮并行写多文件曾出现 "No result found" 写入失败。自 2026-07-20 起生效。（2026-07-20 记录）

## 项目结构关键点
- 双站架构 + 本地 dev 路由：线上由 Vercel `/app` 反向代理拼合。**本地 `pnpm dev:all`** 起一个反向代理在 **:3000**（`scripts/dev-proxy.mjs`，纯 Node、支持 WS）：`/app/*` → next-app（:3001，`apps/next-app`，`basePath:/app`），其余 → Docusaurus 主站（**已迁至 :3002**，由 `pnpm start -- --port 3002` 启动）；音乐本地代理 dev-api 在 **:3009**（`scripts/dev-api.mjs`，`/api/music`）。**独立 `pnpm start` 仍用 :3000**（未走代理）。开 `localhost:3000` 即等价于生产 /app 路由。
- 导航/页脚为共享包 `@mono/ui`（`packages/ui/src`），两端复用以保证 3000/3001 一致：
  - `ui.css` 自包含：复刻原站 shadcn 式 HSL 主题（源 `src/css/variables.css`）+ Infima 类 DOM 样式（`navbar.css`/`components.css`/`custom.css`）。`packages/ui/src/index.ts` 顶部 `import './ui.css'` 统一引入。
  - `SiteHeader.tsx`/`SiteFooter.tsx` 渲染 Infima 类 DOM（`.navbar__*`/`.footer__*`/`.dropdown*`/`.navbar-sidebar*`）。
  - 接入点：主站 swizzle `src/theme/Navbar|Footer/index.tsx`；app `apps/next-app/components/AppNav|AppFooter.tsx`。
  - 配置来源 `src/data/siteData.json`：主站用 `navbarConfig`/`footerConfig`；app 用 `appNavbarConfig`/`appFooterConfig`（`to` 不带 `/app` 前缀，Next `<Link>` 自动补 basePath）。
- 绿色按钮基色 `#22c55e`、hover `#16a34a`。主站搜索页 `/search`（`https://monoblog.cc.cd/search`）。
- ICP 备案：`https://icp.gov.moe/?keyword=20265033` → `萌ICP备20265033号`，页脚版权下方。

## /app 静态资源架构（关键，2026-07-22 定案并修正）
- **现象**：`/app/*`（next-app 论坛）页面裸 HTML/无样式。
- **正确架构（全部留在 `monoblog.cc.cd/app` 下，无需子域）**：`vercel.json` 的 rewrite `/app/:path*` → `/api/app/:path*` → 边缘函数 `api/app/[...path].js` 在 **Vercel 内部（Vercel→Vercel）** fetch next-app 真实部署（`NEXT_APP_ORIGIN` 默认 `https://next-app-mocha-three.vercel.app`，可 env 覆盖）。**用户浏览器只跟 `monoblog.cc.cd`(Cloudflare)通信，永不直连 `*.vercel.app`**，故国内封锁 vercel.app 不影响。HTML 与 CSS/JS 全部经同一代理返回，env 一致、哈希匹配。
- **资产前缀**：`apps/next-app/next.config.mjs` 的 `assetPrefix` = `''`(空) → HTML 同源引用 `/app/_next/static/...`，走主站 rewrite→代理抓真实产物。`NEXT_PUBLIC_ASSET_PREFIX` 可临时覆盖。
- **关键坑（曾导致错乱）**：曾把 next-app 的 `_next/static` 提交进主站 `static/app/_next` 作兜底。但**主站静态层优先级高于 rewrite**，会抢答并返回本地构建（env 不同 → JS chunk 哈希不匹配）的过期文件 → JS 全部 404/失效。已 `git rm` 移除 `static/app/_next` 与 `scripts/sync-next-static.mjs`。**不要再提交 next-app 静态到主站**。
- **代理函数细节**：`api/app/[...path].js` 对 `/_next` 资源依次尝试 `/app/_next/...`(basePath 实际路径)与 `/_next/...`；`location` 头统一改写为 `/api/app/*` 直达代理。
- **环境事实**：主域名 `monoblog.cc.cd` 走 Cloudflare（172.67.x/104.21.x/2606:4700）；`*.vercel.app` 用户侧不可达，但 Vercel→Vercel 内部可达。
- **注意**：`@docusaurus/plugin-pwa` 须作为 `plugins` 独立项而非 preset 的 `pwa` 键；next-app 根布局勿把 `<html>/<body>` 直接包进 client 组件。
