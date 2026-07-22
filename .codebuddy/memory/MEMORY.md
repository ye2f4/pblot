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
- **已加代码防御层(2026-07-22)**:新增 `apps/next-app/lib/supabase/config.ts`,`clean()` 运行时 `replace(/\uFEFF/g,'').trim()` 剥离 BOM;`client.ts`/`server.ts`/`middleware.ts` 统一引用。即使 env 带 BOM,运行时也干净,彻底消除 header 报错。
- **当前状态 + 待办(2026-07-22)**:代码 BOM 防御已提交;`static/app/_next` 已更新为本地**干净 key 构建**产物(JS `webpack-a1f16472`/`main-app-06ea76de`/`571-e9c87f30`,CSS `392202f5910e1531` 内容哈希不变)并推送(`173aa6cf`)。**待办**:用户在 Vercel 后台把 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 重录为干净值(去掉前面不可见 BOM,值即 JWT 本体 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...O5YcPueh...Qgw`)并 **Redeploy** next-app → 线上 HTML 引用哈希即与提交的主站静态一致 → JS 对齐、交互恢复。URL 变量(`xwhwcmorcmgpfpocmgez.supabase.co`)本就干净,无需改。
- **环境事实**：主域名 `monoblog.cc.cd` 走 Cloudflare（172.67.x/104.21.x/2606:4700）；`*.vercel.app` 用户侧不可达，但 Vercel→Vercel 内部可达。
- **注意**：`@docusaurus/plugin-pwa` 须作为 `plugins` 独立项而非 preset 的 `pwa` 键；next-app 根布局勿把 `<html>/<body>` 直接包进 client 组件。
