# 后台管理控制台 · 部署与初始化指南

> 目标：在 Supabase 上启用「隐藏入口 `/admin` + 独立管理密码 + 通用配置面板」，实现远程改公告/标题/板块开关等，全站即时生效。

## 一、前置条件
- 已安装 `supabase` CLI：`npm i -g supabase`
- 已 `supabase login`
- 本地项目已 `supabase link --project-ref xwhwcmorcmgpfpocmgez`（项目 ref 即 URL 中的 `xwhwcmorcmgpfpocmgez`）

---

## 二、执行 SQL（创建数据表）

1. 打开 **Supabase Dashboard → SQL Editor**（https://app.supabase.com/project/xwhwcmorcmgpfpocmgez/sql）。
2. 点击 **New query**，把 `supabase/migrations/20260716_admin_console.sql` 的**全部内容**粘贴进去。
3. 点击 **Run**（或 `Ctrl/Cmd + Enter`）。

执行成功后应看到：
- 表 `public.site_config`（站点动态配置）
- 表 `public.admin_secrets`（密码哈希，已被 RLS 完全封死，普通用户读不到）

⚠️ **验证是否真的写入**：在 SQL Editor 再跑一句：
```sql
select count(*) from information_schema.tables
where table_schema='public' and table_name in ('site_config','admin_secrets');
```
返回 `2` 即表示两张表都已建好。若返回 `0`，多半是粘贴时为空或没点 Run——本仓库早期出现过 SQL 文件空内容的情况，请确认文件非空再粘贴。

---

## 三、设置 Secrets（密钥，切勿提交到代码）

在终端执行（任选其一）：

**方式 A：本地 CLI（推荐，需要已 link 项目）**
```bash
supabase secrets set ADMIN_JWT_SECRET="$(openssl rand -base64 32)"
supabase secrets set ADMIN_SETUP_KEY="$(openssl rand -base64 24)"
```
- `ADMIN_JWT_SECRET`：用于给登录 token 做 HMAC 签名，**必须 ≥ 16 字节随机值**。
- `ADMIN_SETUP_KEY`：首次初始化密码时用的「一次性钥匙」，**只在第一次设密码时用一次**。请妥善保存，泄露等于谁能设你的密码。

**方式 B：Dashboard 手动填**
Supabase Dashboard → Project Settings → Edge Functions → Secrets，分别新建：
- `ADMIN_JWT_SECRET` = 一段随机串（如 `openssl rand -base64 32` 的输出）
- `ADMIN_SETUP_KEY` = 另一段随机串

> 注意：`SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 在 Edge Functions 运行时由平台**自动注入**，无需手动设置。

---

## 四、部署两个 Edge Function

在项目根目录（`f:/my-forum`）执行：
```bash
supabase functions deploy admin-auth --no-verify-jwt
supabase functions deploy admin-config --no-verify-jwt
```
- `--no-verify-jwt` 必须加：这两个函数自己校验密码/token，不走 Supabase 登录 JWT。
- 部署成功后，函数地址为：
  - `https://xwhwcmorcmgpfpocmgez.supabase.co/functions/v1/admin-auth`
  - `https://xwhwcmorcmgpfpocmgez.supabase.co/functions/v1/admin-config`

本地联调可用 `supabase functions serve` 起本地函数（需本机装 Deno）。

---

## 五、首次设置管理密码

**只能成功一次**（之后要用「修改密码」功能）。

用你在第三步生成的 `ADMIN_SETUP_KEY` 替换下面命令里的 `<SETUP_KEY>`，并设一个 ≥8 位的强密码：

```bash
curl -X POST "https://xwhwcmorcmgpfpocmgez.supabase.co/functions/v1/admin-auth" \
  -H "Content-Type: application/json" \
  -H "x-setup-key: <SETUP_KEY>" \
  -d '{"action":"setup","password":"你的强密码至少8位"}'
```

成功返回：
```json
{ "ok": true, "message": "管理密码初始化成功，请登录。" }
```
若返回 `密码已初始化…`(409)，说明之前设过了，跳过这步直接用「修改密码」。

---

## 六、前端实测

1. 本地 `pnpm start`，打开 `http://localhost:3000/admin`（**不挂导航，需手动输入地址**）。
2. 输入刚才设的密码 → 登录 → 看到「站点配置」面板。
3. 修改「站点公告」为测试文案，点「保存配置」。
4. 回到首页，中间栏「站点公告」应立即变化（前端 `SiteConfigProvider` 拉 `site_config` 并合并进 `siteData`）。
5. 想改密码：面板右上角「修改密码」，需原密码正确。

---

## 七、安全说明

- 入口「隐藏」= 不挂导航栏，需知道 `/admin` 才能访问；真正防线是管理密码 + HMAC 短期 token。
- 登录失败 5 次锁定 15 分钟，密码用 PBKDF2-SHA256(15 万次) 哈希存储，哈希与盐存在 `admin_secrets`，RLS 已封死匿名/认证访问。
- `site_config` 表允许匿名只读（首页拉取用），但禁止匿名/认证用户写入，只有 service_role（函数内部）可写。
- 全程走 HTTPS（Supabase 自带），token 有效期 30 分钟。

---

## 八、扩展参数（加字段不用改前端逻辑）

编辑 `src/config/adminConfigSchema.js`，往 `ADMIN_CONFIG_SCHEMA` 里加一项即可，例如：
```js
{ key: 'features.showChat', label: '显示聊天入口', type: 'toggle', default: true }
```
对应组件读取 `siteData.features?.showChat` 即可生效。key 即写入 `site_config` 表的 key（点路径会自动合并进 siteData）。

> 注意：`meta.*` 类参数（SEO 描述、og 标题）是 Docusaurus **构建期**注入的，运行时改不会刷新搜索引擎已抓取的 meta，需要重新构建部署才对 SEO 生效；其余运行时参数（公告、标题、标语、板块开关、关于）改完立即生效。

---

## 九、全站灾害/应急预警系统

在「后台 + 自动地震速报」之上新增了全站预警能力：**有生效预警时，所有页面弹出全屏预警窗**，支持地震/恶劣天气/防空/核应急(人防)等分类与红橙黄蓝四级。

### 1. 执行 SQL
`supabase/migrations/20260717_site_warnings.sql` 全文粘贴到 SQL Editor 执行，建 `site_warnings` 表（公开读、禁匿名写）。

### 2. 部署两个函数
```bash
supabase functions deploy admin-warnings --no-verify-jwt
supabase functions deploy fetch-quake --no-verify-jwt
```
- `admin-warnings`：需管理员 token，提供预警的列表/发布/编辑/启停/删除。
- `fetch-quake`：匿名可调用，拉取 USGS 全球地震速报（M≥4.5、近 24h）写入 `site_warnings`，自动去重。

### 3. 自动更新机制
前端 `WarningsProvider` 每次加载拉取一次，并**每 10 分钟自动调用 `fetch-quake`** 刷新地震数据；后台「预警管理」页也有「立即拉取地震速报」按钮手动触发。

### 4. 手动发布 / 验证（无需任何 API key）
进入 `/admin` → 「预警管理」标签页：
- 点「🌍 立即拉取地震速报」→ 若全球近期有 M≥4.5 地震，会自动出现并弹窗（验证自动链路）。
- 填表手动发布一条（类型/等级/区域/标题/正文/过期时间）→ 保存后全站立即弹窗（验证手动链路）。
- 列表可「停用/启用/删除」。

### 5. 弹窗交互
全屏遮罩弹窗按等级排序（红>橙>黄>蓝），点「我已知晓，关闭」后本次浏览器不再提示（localStorage 记忆，按预警 id 区分；新预警或新地震事件会再次弹出）。

> 说明：`nuclear`(核应急/人防) 分类仅作展示位，内容请只转发**官方权威通报**，切勿伪造。地震源用的是 USGS 全球接口（免 key），如需国内源（如地震局/成都高新减灾所）替换 `fetch-quake/index.ts` 里的 `FEED` 即可。
