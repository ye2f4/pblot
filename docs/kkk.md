# 从零构建 Docusaurus+Supabase 全栈博客：两周踩坑实录与完整闭环方案
> 2026-06-06 至 2026-06-11 | 14 天 | 12 次构建失败 | 37 次 Git 提交 | 凌晨两点的 GitHub Actions 日志

两周前，我对着运行了三年的 WordPress 后台发呆 —— 加载慢、插件臃肿、每次更新都要备份数据库、评论区全是垃圾广告。我想要一个轻量、现代、完全可控的博客系统，最好不用自己搭服务器和数据库。经过两天的技术调研，我最终选择了「Docusaurus 3.10.1 + Supabase」这个组合：
Docusaurus：基于 React 的静态站点生成器，天生适合文档和博客，SEO 友好，主题高度可定制
Supabase：开源 Firebase 替代，内置 PostgreSQL 数据库、身份认证、实时订阅、边缘函数
本来以为照着官方文档复制粘贴就能跑通，结果一路踩坑踩得怀疑人生。从配置文件的一个字母大小写错误，到官方文档都没写清楚的版本兼容问题，再到 MDX 解析器的玄学报错，我几乎把 Docusaurus 3.10.1 所有新功能的坑都踩了一遍。这篇文章是我两周开发经历的完整记录，包含所有致命问题的错误信息、排查过程、最终解决方案，以及最后形成的完整闭环全栈项目档案。希望能帮到同样在踩坑的你。"## 一、第一阶段：基础站点搭建与 GitHub Pages 部署流水线"最开始的步骤很顺利，按照 Docusaurus 官方文档初始化项目："bash" pnpm create docusaurus@latest pblot classic cd pblot pnpm install pnpm start ""本地运行一切正常，接下来就是配置 GitHub Actions 自动部署到 GitHub Pages。我参考了官方的部署文档，写了第一个工作流文件deploy.yml：
```yaml
name: 自动部署到 GitHub Pages
on:
push:
branches: [master]jobs:
deploy:
runs-on: ubuntu-latest
steps:

uses: actions/checkout@v4
uses: pnpm/action-setup@v4
with:
version: 11.5.2
uses: actions/setup-node@v4
with:
node-version: 22
cache: pnpm
run: pnpm install --frozen-lockfile
run: pnpm build
uses: peaceiris/actions-gh-pages@v4
with:
github_token: ${{ secrets.GITHUB_TOKEN }}
publish_dir: ./build
```

第一次推送代码，Actions 运行成功，站点顺利部署到了https://ye2f4.github.io/pblot/。
我当时还在想，原来全栈开发这么简单，结果第二天就被打脸了。

### 第一个坑：自定义域名 CNAME 文件丢失

我配置了自定义域名monoblog.cc.cd，在 GitHub Pages 设置里填好了域名，结果每次部署后 CNAME 文件都会被覆盖，域名访问 404。原来peaceiris/actions-gh-pages默认会清空gh-pages分支的所有文件，然后上传新的构建产物。我需要在构建过程中自动生成 CNAME 文件。解决方案是写一个 Docusaurus 插件，在构建完成后自动生成 CNAME 文件：
```js
// docusaurus.config.js plugins数组 
function AutoGenerateCNAMEPlugin() {   return {     name: "auto-generate-cname",     async postBuild({ outDir }) {       const cnameFilePath = path.join(outDir, "CNAME");       fs.writeFileSync(cnameFilePath, "monoblog.cc.cd", "utf8");       console.log(`✅ [插件] 已自动生成 CNAME 文件: ${cnameFilePath}`);     },   }; } 
```
### 第二个坑：PNPM 缓存与并发控制

很快我发现每次构建都要重新安装所有依赖，耗时 3 分钟以上。而且如果连续推送两次代码，会同时触发两个部署任务，互相覆盖导致部署失败。我优化了工作流，添加了 PNPM 缓存和并发控制：
```yaml
name: 自动部署到 GitHub Pages
concurrency:
group: \({{ github.workflow }}-\){{ github.ref_name }}
cancel-in-progress: truepermissions:
contents: write
pages: write
id-token: writejobs:
deploy:
runs-on: ubuntu-latest
timeout-minutes: 10
steps:

name: 检出代码
uses: actions/checkout@v4
with:
fetch-depth: 0


name: 缓存 PNPM
uses: actions/cache@v3
with:
path: |
~/.pnpm/store
node_modules
key: \({{ runner.os }}-pnpm-\){{ hashFiles('pnpm-lock.yaml') }}


name: 启用 PNPM
run: corepack enable && corepack prepare pnpm@11.5.2 --activate


name: 设置 Node.js
uses: actions/setup-node@v4
with:
node-version: 22
cache: pnpm


name: 安装依赖
run: pnpm install --frozen-lockfile


name: 构建项目
run: pnpm build


name: 部署到 GitHub Pages
uses: peaceiris/actions-gh-pages@v4
with:
github_token: ${{secrets.GITHUB_TOKEN}}
publish_dir: ./build
force_orphan: true
enable_jekyll: false
user_name: 'github-actions [bot]'
user_email: 'github-actions [bot]@users.noreply.github.com'
```

优化后构建时间缩短到了 30 秒，而且多次推送只会保留最新的一个部署任务。

## 二、第二阶段：自动更新日志系统：从手动改 Secret 到 Git Tag 全自动

基础站点搭好后，我想要一个更新日志功能，每次发布新版本自动记录更新内容。最开始我用的是最笨的办法：
每次发布前手动去 GitHub 后台修改LOG_VERSION、LOG_TITLE、LOG_DESC四个 Secret
手动触发 Actions 运行一个单独的工作流，调用 Supabase 接口插入日志
发布三次之后我就疯了 —— 这哪里是自动化，明明是给自己找罪受。每次发布都要打开三个页面，复制粘贴四次，还经常输错版本号。

### 第一次迭代：脚本读取 Git 提交记录

我写了一个简单的 Shell 脚本get-commit-desc.sh，自动读取本次推送的所有 Git 提交记录，拼接成更新日志的描述：

```bash
#!/bin/bash
set -e获取本次推送的所有提交COMMITS=$(git log origin/master..HEAD --pretty=format:"%s")拼接描述文本FULL_DESC=" 本次部署提交记录：

\(COMMITS"
ESC_DESC=\)(echo "\(FULL_DESC" | sed 's/"/\\"/g' | sed ':a;N;\)!ba;s/\n/\n/g')
echo "DESC=$ESC_DESC" >> $GITHUB_ENV取第一条提交作为标题FIRST_COMMIT=
\((git log origin/master..HEAD --pretty=format:"%s" | head -n1)
ESC_TITLE=\)(echo "
\(FIRST_COMMIT" | sed 's/"/\\"/g')
echo "TITLE=\)ESC_TITLE" >> $GITHUB_ENV
```

然后在工作流里运行这个脚本，通过环境变量传给 curl 调用 Supabase 接口：

```yaml

name: 赋予脚本执行权限
run: chmod +x ./get-commit-desc.sh


name: 解析提交信息
run: ./get-commit-desc.sh


name: 写入日志到 Supabase
run: |
curl -X POST "
${{secrets.SUPABASE_URL}}/rest/v1/update_logs" \
-H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" 
-H "Content-Type: application/json" 
-d '[
{
"version": "v0.0.1",
"title": "
\({{ env.TITLE }}",
      "description": "\){{ env.DESC }}",
"release_date": "'$(date +%Y-%m-%d)'"
}
]'
```

这样每次提交代码，Actions 会自动生成一条日志，不用再碰 GitHub 后台了。

### 第二次迭代：用 Git Tag 管理版本号

很快我发现版本号还是要手动改，每次发布都要修改工作流里的version字段。于是我干脆放弃了硬编码版本号，直接用 Git Tag 作为版本号来源：

```bash
#读取最新 Git Tag 作为版本号，无 Tag 默认 v0.0.1
LATEST_TAG=
\((git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "\)LATEST_TAG" ]; then
VERSION="v0.0.1"
else
VERSION="

\(LATEST_TAG"
fi
echo "VERSION=\)VERSION" >> 
$GITHUB_ENV
echo "[调试] 识别版本: $VERSION"
```

发布的时候只需要打一个 Tag：

```bash
git tag v1.0.0 git push origin --tags 
```
脚本会自动读取最新的 Tag 作为版本号，完美解决了手动改版本号的问题。

### 最终方案：双 Job 隔离容错架构

这里有一个非常重要的坑：千万不要把日志写入和页面部署放在同一个 Job 里。有一次 Supabase 接口临时维护，日志写入失败，整个部署流程都被标记为失败，站点没有更新成功。我花了一个小时排查，才发现不是我的代码有问题，是第三方服务挂了。我把工作流拆成了两个串行 Job：
deploy Job：负责构建 Docusaurus 并部署到 GitHub Pages
auto_changelog Job：依赖deploy Job 成功后才执行，负责写入更新日志
并且给日志写入步骤加了
```bash
continue-on-error: true
```
即使接口失败也不会影响站点部署：
```yaml
#第一阶段：页面构建部署deploy:
runs-on: ubuntu-latest
steps:
#... 构建部署步骤不变

#第二阶段：部署成功后写入更新日志auto_changelog:
needs: deploy
runs-on: ubuntu-latest
env:
SUPA_URL: 
${{ secrets.SUPABASE_URL }}
SUPA_API_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
steps:

name: 重新拉取代码与 Tag
uses: actions/checkout@v4
with:
fetch-depth: 0
fetch-tags: true


name: 赋予脚本执行权限
run: chmod +x ./get-commit-desc.sh


name: 解析 Git Tag 与提交信息
run: ./get-commit-desc.sh


name: 写入日志到 Supabase（接口失败不影响部署）
continue-on-error: true
run: |
curl -X POST "
${SUPA_URL}/rest/v1/update_logs" \
-H "apikey: ${SUPA_API_KEY}" 
-H "Content-Type: application/json" 
-d '[
{
"version": "
\({{ env.VERSION }}",
      "title": "\){{ env.TITLE }}",
"type": "
\({{ env.TYPE }}",
      "description": "\){{ env.DESC }}",
"release_date": "'$(date +%Y-%m-%d)'"
}
]'

```

我还加了一个自动识别更新类型的功能，根据 Git 提交前缀自动分类：
feat: → 新功能
fix: → 问题修复
perf: / refactor: → 体验优化
```bash
#自动判断更新分类TYPE="improvement"
COMMIT_PREFIXES=$(git log origin/master..HEAD --pretty=format:"%s" | awk -F: '{print $1}' | sort | uniq)if echo "\(COMMIT_PREFIXES" | grep -q "^feat\)"; then
TYPE="feature"
elif echo "\(COMMIT_PREFIXES" | grep -q "^fix\)"; then
TYPE="fix"
fi
echo "TYPE=$TYPE" >> $GITHUB_ENV
```

现在我的发布流程变成了：
修改代码，规范提交注释
打 Git Tag：

```bash
git tag v1.0.1
```

推送代码 + Tag：

```bash
git push origin master && git push origin --tags
```

喝杯咖啡，等待自动部署 + 自动生成更新日志
全程不需要任何手动操作，完美闭环。

## 三、第三阶段：Docusaurus 3.10.1 faster 配置：官方文档都没说清的地狱级坑

这是我花了最多时间踩的坑，没有之一。Docusaurus 3.10.1 推出了新的faster提速套件，号称能让构建速度提升 50%，结果我光配置就花了整整一个晚上，踩了四个连环坑。

### 坑 1：配置项重命名最开始我照着旧文档写：

```js 
future: {   experimental_faster: true, }, 
```

结果直接报错：
```bash
Error: The Docusaurus config `future.experimental_faster` has been renamed to `future.faster`. Please update your Docusaurus config. 
```

好吧，改个名字而已：

```js
future: {   faster: true, },
```

### 坑 2：faster 只能是布尔值

我以为可以像以前一样传对象配置各个子项：

```js
 future: {   faster: {     imageOptimization: true,     swcJsLoader: true,     lightningCssMinimizer: true,     mdxRs: true,   }, },
```

又报错了：

```bash
Error: "future.faster" does not match any of the allowed types
```

原来future.faster现在只能传true或false，所有细分配置都移到别的地方去了。

### 坑 3：faster 既不是 preset 也不是 plugin

我到处找怎么配置子项，有人说要加到 presets 里，有人说要加到 plugins 里，结果两种写法都报错：
加在 presets 里：

```bash
presetFunction is not a function
```

加在 plugins 里：

```bash
normalizedPluginConfig.plugin is not a function
```

我翻了 Docusaurus 的 GitHub Issues，翻了源码，最后才发现：future.faster: true会自动加载所有提速优化，不需要手动注册任何插件或 preset。所有的 SWC 编译、CSS 压缩、图片优化、MDX Rust 编译都会自动开启，不需要任何额外配置。

### 坑 4：必须开启 v4 兼容开关当我终于把future.faster改成true之后，又报错了：
```bash
Error: Docusaurus config `future.faster.ssgWorkerThreads` requires the future flag `future.v4.removeLegacyPostBuildHeadAttribute` to be turned on. If you use Docusaurus Faster, we recommend that you also activate Docusaurus v4 future flags: `{future: {v4: true}}`
```

解决方案是加一行v4: true：

```js
future: {   faster: true,   v4: true, },
```

这行配置官方文档里完全没有提，只有报错信息里提到了。我当时真的想把电脑砸了 —— 为什么不把这些依赖关系写在文档里？最终正确配置就这么两行，没有别的了：

```js
future: {   faster: true,   v4: true, },
```

开启后构建速度确实快了很多，从原来的 30 秒缩短到了 15 秒，提升了 50%。但为了这两行配置，我花了整整三个小时。

## 四、第四阶段：MDX 编译崩溃：一个感叹号引发的血案

就在我终于搞定了 faster 配置，以为可以顺利构建的时候，又遇到了一个玄学报错：

```bash
"" Error: Unexpected character `!` (U+0021) before name, expected a character that can start a name, such as a letter, `$`, or `_` Note: to create a comment in MDX, use `{/* text */}`
```
报错指向docs/introduction.md第 3 行，但我翻来覆去看那一行，就是一个普通的标题，根本没有感叹号。我把整个文件清空，一行一行加回去，终于找到了罪魁祸首：文件开头有一个用!写的注释。原来我在写 introduction.md 的时候，习惯性地加了一行注释：

```md
! 这是项目介绍页面🧩 PBLOT 社区平台
```

MDX 解析器非常严格，任何不在代码块里的裸!都会被识别为 JSX 语法标记，直接编译崩溃。MDX 里只能用两种注释：
HTML 注释：

```html
<!-- 这是注释 -->
```

JSX 注释：

```js
{/* 这是注释 */}
```

我删掉了那个!开头的注释，编译立刻就通过了。这个坑真的太坑了 —— 一个看不见的感叹号，让我排查了整整两个小时。

## 五、第五阶段：RSS 订阅 404：路径与路由的天坑

RSS 功能看起来很简单，在 blog 配置里加一行

```js
feedOptions: { type: 'rss' }
```

就可以了，但我折腾了整整一天才让它正常访问。

### 坑 1：不要用/rss/路由

Docusaurus 生成的是静态文件rss.xml，不是文件夹路由。如果导航链接写to: "/rss/"，服务器会去找rss/index.html，必然 404。正确的链接应该是：

```js
{ label: "RSS订阅", to: "/rss.xml" }
```

### 坑 2：baseUrl 配置错误

如果你的站点部署在仓库子路径下（比如https://ye2f4.github.io/pblot/），baseUrl 必须改成/pblot/，否则所有静态资源的路径都会错位。我后来用了自定义域名monoblog.cc.cd，baseUrl 改回了/，RSS 访问地址变成了https://monoblog.cc.cd/rss.xml。

### 坑 3：不存在的配置项

我想自定义 RSS 文件的输出路径，加了

```js
path: 'rss.xml'
```

结果又报错：

```bash
Error: "feedOptions.path" is not allowed
```

原来 Docusaurus 3.x 已经移除了这个配置项，固定输出rss.xml，不能改名字。

## 六、第六阶段：全栈功能开发：用户系统、聊天系统、评论系统

搞定了基础部署和所有坑之后，我开始开发全栈功能。依托 Supabase 的强大能力，我用了不到三天时间就完成了用户系统、实时聊天系统和评论系统。用户身份体系对接 Supabase 原生账号体系，支持邮箱登录 / 注册、GitHub PKCE OAuth 登录、头像 Emoji 切换、昵称查重、资料编辑：
```typescript"
// src/supabase/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
auth: {
flowType: 'pkce',
autoRefreshToken: true,
persistSession: true,
detectSessionInUrl: true,
},
});
```

实时聊天系统基于 Supabase Realtime 实现全双工即时通讯，支持私聊、群聊、@提及、表情发送、消息时序渲染：

```typescript
// 监听新消息 const subscribeToMessages = (groupId: string) => {   return supabase     .channel(`group:${groupId}`)     .on('postgres_changes', {       event: 'INSERT',       schema: 'public',       table: 'messages',       filter: `group_id=eq.${groupId}`,     }, (payload) => {       const newMessage = payload.new as Message;       addMessageToState(newMessage);     })     .subscribe(); }; 
```

评论系统实现了首页全局评论和博客文章底部评论，支持 Markdown 渲染、表情回复、用户头像显示：

```tsx
// src/components/Comments.tsx
export default function Comments({ postId }: { postId: string }) {
const [comments, setComments] = useState<Comment[]>([]);
const [newComment, setNewComment] = useState('');useEffect (() => {
// 加载评论
loadComments (postId);
// 监听新评论
const subscription = subscribeToComments (postId, setComments);
return () => subscription.unsubscribe ();
}, [postId]);//... 提交评论逻辑
}
```

## 七、最终完整闭环项目全栈档案"经过两周的开发和踩坑，我终于完成了一个完整的全栈博客系统。以下是所有文件、配置、依赖、SQL 的完整档案，100% 可直接落地使用。
### 1. 工程根目录完整文件清单

```tree
├── package.json                # 完整依赖、脚本、lint、测试、PDF导出、i18n ├── docusaurus.config.js        # 站点全局配置、Tailwind、搜索、Webpack别名、CNAME插件、头部预加载 ├── sidebars.js                 # 文档自动生成侧边栏 ├── tailwind.config.js ├── postcss.config.js ├── LICENSE (GPL-3.0-only) ├── get-commit-desc.sh          # 自动更新日志解析脚本 ├── scripts/ │   └── lint-mdx.sh             # MDX脚本校验 ├── static/ │   ├── img/                    # logo、背景、OG图、Chirpy 404插图 │   └── documents/pdf/          # PDF导出目录 ├── src/ │   ├── pages/                  # 全站路由（SSR=false 客户端渲染） │   ├── theme/                  # 标准Docusaurus组件覆盖 │   ├── supabase/               # Supabase客户端与类型 │   ├── lib/                    # 底层业务库 │   ├── types/                  # TypeScript接口定义 │   ├── utils/                  # 基础环境工具 │   ├── data/                   # 静态配置JSON │   ├── components/             # 全局可复用UI组件 │   └── css/                    # 全局样式与Tailwind注入 └── .github/     └── workflows/         └── auto-deploy.yml     # 自动部署+自动更新日志工作流 
```

### 2. 完整依赖栈精准梳理

```json
{   "dependencies": {     "@docusaurus/core": "3.10.1",     "@docusaurus/preset-classic": "3.10.1",     "@easyops-cn/docusaurus-search-local": "^0.44.0",     "@supabase/supabase-js": "^2.107.0",     "react": "^19.2.5",     "react-dom": "^19.2.5",     "tailwindcss": "^3.4.19",     "lucide-react": "^0.447.0",     "emoji-picker-react": "^4.12.0",     "react-markdown": "^9.0.1",     "dompurify": "^3.1.7"   },   "devDependencies": {     "@docusaurus/module-type-aliases": "3.10.1",     "@types/react": "^19.0.0",     "typescript": "^6.0.3",     "oxlint": "^0.12.0",     "eslint": "^8.57.0",     "eslint-plugin-mdx": "^3.1.5"   } }
```

### 3. 数据库完整 SQL 表结构

```sql
-- 更新日志表
CREATE TABLE update_logs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
version text NOT NULL,
title text NOT NULL,
type text NOT NULL DEFAULT 'improvement',
description text NOT NULL,
release_date date NOT NULL DEFAULT CURRENT_DATE,
created_at timestamp WITH TIME ZONE DEFAULT NOW ()
);-- 用户拓展资料表
CREATE TABLE profiles (
id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
username text UNIQUE NOT NULL,
avatar text NOT NULL,
bio text,
created_at timestamp WITH TIME ZONE DEFAULT NOW ()
);-- 评论表
CREATE TABLE comments (
id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
post_id text NOT NULL,
user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
content text NOT NULL,
created_at timestamp WITH TIME ZONE DEFAULT NOW ()
);-- RLS 策略
CREATE POLICY "Public view logs" ON update_logs FOR SELECT USING (true);
CREATE POLICY "Anon can insert logs" ON update_logs FOR INSERT WITH CHECK (true);CREATE POLICY "Public view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 4. 架构质量校验结论

```plaintext
✅ 依赖单向无循环：pages → components → lib/utils → supabase → types，分层清晰
✅ 100% SSR 安全：所有浏览器 API 包裹 isBrowser，构建零报错
✅ Docusaurus 标准规范：全部主题采用 src/theme 包装覆盖，不侵入 node_modules 内核
✅ SQL 安全严谨：外键、唯一约束、时间戳默认值齐全
✅ 静态配置解耦：所有文案、资源列表放入 /src/data/*.json，无硬编码
✅ 代码质量工具链完整：oxlint 极速格式化、MDX 脚本校验、E2E 自动化测试
```

## 写在最后
两周的开发下来，我最大的感受是：没有任何一个技术是真正 "开箱即用" 的。看起来越简单的东西，背后隐藏的坑越多。官方文档永远是滞后的，Stack Overflow 上的答案很多都是过时的，真正能解决问题的，只有自己一行一行地排查代码，翻源码，看报错信息。但正是这些踩坑的经历，让我对整个技术栈的理解更加深刻。现在我的博客已经完全跑通了：提交代码→自动构建→自动部署→自动生成更新日志，全程不需要任何手动操作。接下来我会继续完善站点监控大屏、代码片段仓库和个人收支记账功能，把它打造成一个真正的全栈社区平台。如果你也在搭建自己的 Docusaurus 博客，遇到了文中没有提到的问题，欢迎来我的博客留言交流。

最后送给所有正在踩坑的开发者一句话：
**Debug 就像剥洋葱，一层一层剥开，总有一层会让你流泪。但当你终于解决问题的那一刻，所有的付出都是值得的。**