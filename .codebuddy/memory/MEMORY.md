# 长期记忆 (MEMORY)

## 工作目录
- 实际工作仓库在 `e:/my-forum/`(2026-07-23 曾误判"E: 已改名 F:",实测 E: 存在、F: 不存在,统一用 `e:/my-forum`;此前"一律用 F:"已失效)。
- 记忆目录:`e:/my-forum/.codebuddy/memory/`。

## 用户偏好 / 工作约定
- **不用每次都 build**:用户本地有开发服务器(`pnpm start` 主站 :3000 / 音乐 dev-api `scripts/dev-api.mjs` :3009),能热更新验证。改完代码后不要主动跑 `pnpm build`;有问题用户会把日志发来。(2026-07-19)
- **不要并行写入文件**:`write_to_file`/`replace_in_file` 逐个顺序执行;`update_memory` 也单独进行。原因:同轮并行写多文件曾 "No result found"。自 2026-07-20。

## 项目架构（单 Docusaurus，2026-07-23 起）
- **已彻底移除 Next.js / `/app` 前缀**:`apps/next-app`、`api/app` 代理、`static/app`、`src/pages/app` 全部删除;论坛搬回主站,根路径:`/forum /chat /friends /moments /submissions /leaderboard /capsule /profile /login /register /complete-profile`;社区着陆页 `/community`(因 `/` 被首页占用)。判断社区路由用 `src/lib/appRoutes.ts` 的 `isAppRoute()`。
- **导航/页脚：改用 Docusaurus 官方 Navbar/Footer 渲染（2026-08-01 变更，集成 meshtastic 方式；此前"内联进 src/theme swizzle"方案已废弃）**:
  - **根因（2026-07-26 结论的再纠正）**:navbar/footer 不显示的真凶是**自定义 swizzle `src/theme/Navbar/index.tsx`、`src/theme/Footer/index.tsx` 覆盖了官方组件却渲染失败**（不是 @mono/ui、也不是内联组件本身）。参考补丁库 `E:/meshtastic` 的做法：不 swizzle Navbar/Footer 主体，纯靠 `themeConfig.navbar/footer` 配置 + 官方组件渲染。
  - **解法（现行）**:①删除 `src/theme/Navbar/index.tsx`、`src/theme/Footer/index.tsx`、孤儿空目录 `src/theme/Navbar/MobileSidebar/`、多余的 `src/css/mono-navbar-footer.css` → 官方组件+官方默认移动侧边栏接管（原生支持中文 dropdown）。②`docusaurus.config.js` 的 `themeConfig.navbar/footer` 已完整引用 `src/data/siteData.json`（`navbarConfig.items`/`footerConfig.links`）；`footer.copyright` 用数组 `join('<br/>')` 把 `footerConfig.beian` 并入为 HTML `.footer__beian-link`；navbar 补 `logo`(读 `branding.logoSrc`)。③样式全由现有 meshtastic 体系提供：`src/css/navbar.css`(官方 navbar 样式+hsl 变量)、`components.css`/`base.css`(官方 footer)、`variables.css`(hsl 变量含暗色)，均经 `custom.css` `@import`。三个绿色按钮 className(`navbar-contribute-btn`/`navbar-chat-btn`/`navbar-github-btn`)样式追加在 `navbar.css` 末尾。
  - 配置单一来源 `src/data/siteData.json`:`navbarConfig`(hideOnScroll + items[]，标准 Docusaurus 格式含 type:dropdown)、`footerConfig`(style/links[]/beian)、`branding.logoSrc`;`siteTitle` 作品牌名。
  - **⚠️ 铁律**:今后 navbar/footer 视觉改 `navbar.css`/`components.css`/`base.css`，**绝不要再 swizzle Navbar/Footer 主体**（会重现"不显示"）。移动侧边栏用官方默认（不移植 meshtastic 的 MobileSidebar 补丁，那是英文+Tailwind+无法处理 dropdown）。
- **Supabase 复用主站客户端**:`src/lib/supabase/client.ts` 再导出 `src/supabase/supabaseClient.ts`(同 URL+anon → 登录态共享);`config.ts` 写死 anon/URL 防 Vercel env BOM。配套 `safe.ts`/`useUser.ts`。
- **全局 Layout swizzle(`src/theme/Layout/index.tsx`)**:注入 `<ProfileGuard/>`(社区路由白名单 `/login /register /complete-profile /bilibili-callback` 跳过)+ `<ForumTabs/>`(仅社区路由显示分区导航);用 `isAppRoute(pathname)` 判定。诊断用 `RenderErrorBoundary` 已于 2026-07-26 删除。
- **路由 API 铁律**:`@docusaurus/router` 是 react-router v5,**只导 `Redirect`/`matchPath`/`useHistory`/`useLocation`**,不导 `Link`/`Switch`/`useNavigate`。`Link` 必须 `import Link from '@docusaurus/Link'`;跳转用 `const h = useHistory(); h.push(path)`,绝不用 `useNavigate`。
- **dev / 构建铁律**:`pnpm start` 主站 :3000;`docusaurus.config.js` `future.faster: process.env.NODE_ENV==='production'`(rspack dev 不支持 `React.lazy`,生产正常)。首页 `WeatherWidget`/`CommentSection`/`AdSection` 及 `Carousel` 用 `React.lazy` 仅在 production 生效。
- 绿色按钮基色 `#22c55e`、hover `#16a34a`;主站搜索页 `/search`;ICP 备案 `萌ICP备20265033号`(`https://icp.gov.moe/?keyword=20265033`)。
- **i18n 铁律**:本仓库是 **Docusaurus 3.10**,**`@docusaurus/Translate` 只导出 `Translate`(默认组件)和 `translate`(imperative 函数),没有 `useTranslate` hook**（那是 Docusaurus 4.x API）。在 JS/JSX 页面做函数式翻译,用 `import { translate } from '@docusaurus/Translate'` + 模块顶层封装 `const t = (...a) => { const [o,v]=a; if(typeof o==='string') return translate({id:o},v); const vals=v??o?.values??(o?.count!==undefined?{count:o.count}:undefined); return translate(o,vals); }`,组件内直接调 `t({ id, message })`,不要 `const t = useTranslate()`。中文取 message、英文取 `i18n/en/code.json`(键为 id,值为英文)。
- 主域名 `monoblog.cc.cd`(Cloudflare)。

## 关键排查经验
- 自定义组件"根本不显示"(非回退默认)常见根因:依赖了 `src/` 之外的外部 TS 包(如曾经的 `@mono/ui`),Docusaurus 不转译 → 整组件渲染失败。优先把设计内联进 `src/theme/*`(必被转译),并清掉对应的 webpack alias / babel 规则。另:swizzle 接入点缺失才会回退默认组件(可用 `git log --all -- <path>` 找历史中被删的 swizzle 还原)。
- Vercel 上 env 变量带 BOM 会导致 Supabase `apikey` 报 "Invalid header" 且 JS chunk 哈希错位;解法:源码写死公开 anon/URL(见 `src/lib/supabase/config.ts`)。
