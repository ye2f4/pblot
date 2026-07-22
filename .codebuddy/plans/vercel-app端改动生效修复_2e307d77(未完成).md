---
name: vercel-app端改动生效修复
overview: 修复 Vercel 部署后 /app 端（独立 Next.js 项目 next-app-mocha-three）改动未生效的问题：根因是主项目部署只重建自身与代理函数，未重建承载 /app 的独立 next-app 项目。计划使一键部署能同时重建两个项目，并先手动 Redeploy 让当前待上线改动生效。
todos:
  - id: inspect-vercel
    content: 用 [skill:Vercel Deploy] 查看 next-app-mocha-three 部署状态与 NEXT_APP_ORIGIN 配置，确认根因
    status: pending
  - id: redeploy-app
    content: 用 [skill:Vercel Deploy] 立即 Redeploy next-app-mocha-three，让 /app 改动上线
    status: pending
    dependencies:
      - inspect-vercel
  - id: patch-deploy-script
    content: 修改 scripts/github-push.mjs：B 线在重建主项目后额外 POST 第二 Deploy Hook 重建 /app 项目
    status: pending
  - id: add-app-hook-config
    content: 在 scripts/deploy.config.mjs 填入 next-app 项目的 Deploy Hook URL（NEXT_APP_DEPLOY_HOOK）
    status: pending
    dependencies:
      - patch-deploy-script
  - id: refresh-cache-if-needed
    content: 若 /app 仍显示旧版，Redeploy 主项目 pblot-2q56 刷新边缘缓存
    status: pending
    dependencies:
      - redeploy-app
---

## 用户需求

用户将仓库迁回 E 盘后，部署 Vercel 发现：主站改动生效，但 `/app` 端（Next.js 应用）的改动（含 `@mono/ui` 共享包里的导航栏修复）未生效，尽管 Vercel 后台显示 build 成功。

## 核心问题

定位并解释为何“主项目构建成功”却不等于“/app 端更新”，并给出根治方案，使后续每次部署都能让主站与 /app 端同步上线。

## 预期效果

- 说清楚 /app 内容实际由独立 Vercel 项目承载、主项目代理转发的架构链路。
- 立即让当前已改好但未构建的 /app 改动（SiteHeader onNavigate、ui.css 导航栏高度）上线。
- 从部署脚本层面消除“只重建主项目、漏掉 /app 项目”的复发隐患。

## 技术栈与现状

- 主站：Docusaurus（Vercel 项目 `pblot-2q56`），构建命令 `pnpm run build` = `docusaurus build`，**不构建 next-app**。
- /app 端：独立的 Next.js 项目 `apps/next-app`（basePath `/app`），由独立 Vercel 项目 `next-app-mocha-three` 承载，`build = next build`。
- 路由拼接：`vercel.json` 将 `/app/:path*` 内部 rewrite 到本仓库 Edge 函数 `api/app/[...path].js`，该函数 `fetch(process.env.NEXT_APP_ORIGIN || 'https://next-app-mocha-three.vercel.app')` 把请求转发到独立项目。
- 本地一键部署：`scripts/github-push.mjs`（双轨）+ `scripts/deploy-server.mjs`，B 线仅用单个 `VERCEL_DEPLOY_HOOK` 触发**主项目**重建。

## 根因结论

Vercel 后台“build 成功”指的是主项目 `pblot-2q56`（Docusaurus + 代理函数）构建成功。`/app` 的真实内容由**另一个独立项目 `next-app-mocha-three`** 提供，它既未被一键部署 B 线触发，也未必连接了同一仓库的 push 自动部署。因此承载 /app 的构建产物停留在旧版本，/app 端改动不会生效。

## 实现方案

### 总体策略

分两步：(1) 立即补救——手动 Redeploy `next-app-mocha-three` 把已改好的 /app 代码推上线；(2) 根治——让双轨部署的 B 线在重建主项目后，再 POST 一次 /app 项目的 Deploy Hook，使两端同步。

### 关键决策与权衡

- **保留双项目 + 代理架构**：该架构是为规避 Vercel Hobby 计划丢弃“外部域名 rewrite”的限制而设计，不应合并为单项目，避免引入更大改动与回归。
- **代码侧用“第二 Deploy Hook”而非直连 Git 触发**：复用现有 `github-push.mjs` 的 B 线模式，新增一个 hook 变量，改动最小、与既有风格一致（DRY/KISS），不引入新依赖。
- **NEXT_APP_ORIGIN 校验**：若主项目环境变量指向旧 preview 链接也会导致 /app 恒定旧版，需在排查时一并确认指向生产域名 `https://next-app-mocha-three.vercel.app`。

### 性能与可靠性

- 代理为 Edge 函数、无 state，额外一次 hook POST 成本可忽略；同时只在该次推送确实发生（`pushed` 为 true）时才触发，避免空构建（沿用既有 `if(!pushed) skip` 逻辑）。
- 修复后每次部署两端一致，消除“改了却看不到”的困惑与重复排查。

### 实施要点

- `scripts/github-push.mjs`：`reloadConfig()` 新增读取 `NEXT_APP_DEPLOY_HOOK`（环境变量优先，其次 `deploy.config.mjs`）；B 线在 POST 主 hook 成功后，再 `fetch` 第二 hook 重建 next-app，日志显式标注“B 线：/app 项目部署”。
- `scripts/deploy.config.mjs`（含密钥、属 HARD_IGNORE 不随仓库推送）：由用户在后台复制 `next-app-mocha-three` 的 Deploy Hook URL 填入 `NEXT_APP_DEPLOY_HOOK`（脚本改动不含任何密钥明文）。
- 立即补救：用 Vercel 后台/GitHub 连接的 push 或手动 Redeploy `next-app-mocha-three`；若 /app 仍显示旧版，再 Redeploy 一次主项目以刷新边缘缓存（代理本身未设 cache-control，但上游 Next 响应可能被 CDN 缓存）。

## 架构示意

```mermaid
flowchart LR
  U[浏览器 /app/*] --> V[Vercel 主项目 pblot-2q56]
  V -->|vercel.json rewrite| P[Edge 函数 api/app/[...path].js]
  P -->|fetch NEXT_APP_ORIGIN| A[独立项目 next-app-mocha-three /app]
  Deploy[一键部署 B 线] -->|Deploy Hook 1| V
  Deploy -.->|Deploy Hook 2 本次新增| A
```

## 使用的 Agent 扩展

### Skill

- **Vercel Deploy**
- 用途：排查阶段查看两个 Vercel 项目（pblot-2q56、next-app-mocha-three）的部署状态与环境变量（尤其 NEXT_APP_ORIGIN），并手动 Redeploy next-app-mocha-three 让 /app 改动立即生效。
- 预期结果：确认 /app 项目上次构建早于本次代码改动、确认主项目 NEXT_APP_ORIGIN 配置正确，并完成一次 next-app 项目的重新部署。