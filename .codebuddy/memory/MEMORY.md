# 长期记忆 (MEMORY)

## 用户偏好 / 工作约定
- **不用每次都 build**：用户本地有开发服务器（`pnpm dev:all` → 主站 3000 / app 3001），能完成热更新验证。改完代码后**不要**主动跑 `pnpm build`；如有问题用户会把日志发来。（2026-07-19 记录）

## 项目结构关键点
- 双站架构：主站 Docusaurus（:3000，仓库根）+ app Next.js（:3001，`apps/next-app`，`basePath:/app`）。线上由 Vercel `/app` 反向代理拼合。
- 导航/页脚为共享包 `@mono/ui`（`packages/ui/src`），两端复用以保证 3000/3001 一致：
  - `ui.css` 自包含：复刻原站 shadcn 式 HSL 主题（源 `src/css/variables.css`）+ Infima 类 DOM 样式（`navbar.css`/`components.css`/`custom.css`）。`packages/ui/src/index.ts` 顶部 `import './ui.css'` 统一引入。
  - `SiteHeader.tsx`/`SiteFooter.tsx` 渲染 Infima 类 DOM（`.navbar__*`/`.footer__*`/`.dropdown*`/`.navbar-sidebar*`）。
  - 接入点：主站 swizzle `src/theme/Navbar|Footer/index.tsx`；app `apps/next-app/components/AppNav|AppFooter.tsx`。
  - 配置来源 `src/data/siteData.json`：主站用 `navbarConfig`/`footerConfig`；app 用 `appNavbarConfig`/`appFooterConfig`（`to` 不带 `/app` 前缀，Next `<Link>` 自动补 basePath）。
- 绿色按钮基色 `#22c55e`、hover `#16a34a`。主站搜索页 `/search`（`https://monoblog.cc.cd/search`）。
- ICP 备案：`https://icp.gov.moe/?keyword=20265033` → `萌ICP备20265033号`，页脚版权下方。
