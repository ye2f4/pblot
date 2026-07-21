#!/usr/bin/env node
/**
 * github-push.mjs — 双轨同步 / 部署（localhost 免 Git 直推 GitHub）
 * -------------------------------------------------------------
 * 适用场景：本地开发时，不想装/用 Git，直接把当前工作区推送到 GitHub。
 *
 * 双轨：
 *   A 线（主）：用 GitHub REST API 创建 blob/tree/commit，更新分支 ref，
 *               等价于 git add + commit + push，但全程不调用 git。
 *   B 线（副）：推送成功后，POST 指定的 Vercel Deploy Hook，触发远端重新构建。
 *
 * 配置（环境变量优先，其次 scripts/deploy.config.mjs 导出对象）：
 *   GITHUB_TOKEN        GitHub PAT（需 repo 权限）              必填
 *   GITHUB_REPO         owner/name                              必填
 *   GITHUB_BRANCH       目标分支，默认 main
 *   GITHUB_COMMIT_MSG   提交信息，默认 "deploy: 自动同步"
 *   VERCEL_DEPLOY_HOOK  Vercel 主项目 deploy hook URL（可选，B 线）
 *   NEXT_APP_DEPLOY_HOOK /app 独立 Next.js 项目 deploy hook URL（可选，B 线）
 *                       主项目仅构建 Docusaurus，/app 由独立 Vercel 项目
 *                       （如 next-app-mocha-three）承载，需单独触发重建。
 *   DEPLOY_DRY_RUN      设为 1 时只扫描+打印，不实际推送
 *
 * 用法：
 *   node scripts/github-push.mjs        # 或 pnpm deploy:push（package.json 中定义）
 *   DEPLOY_DRY_RUN=1 node scripts/github-push.mjs
 *
 * 忽略规则：忽略清单由项目根 .gitignore 实时解析（与真实 Git 行为一致），
 *           仅 .git / deploy.config.mjs 被硬编码硬排除（防密钥/元数据误推）。
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync, execFileSync } from 'node:child_process';

// 计算 Git 对象的 blob SHA-1：sha1("blob " + 字节长度 + "\0" + 内容)
// 与 GitHub 树里的 blob sha 完全一致，可用于本地/远端增量比对。
function gitBlobSha(buf) {
  const header = Buffer.from(`blob ${buf.length}\0`);
  return createHash('sha1').update(Buffer.concat([header, buf])).digest('hex');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // 项目根目录

// 日志走可重定向的 sink，便于被本地 UI 服务捕获并实时推送到网页
let logSink = (...a) => console.log('[双轨部署]', ...a);
let warnSink = (...a) => console.warn('[双轨部署][警告]', ...a);
const log = (...a) => logSink(...a);
const warn = (...a) => warnSink(...a);

// ── 忽略规则 ──────────────────────────────────────────────
// 优先解析项目根 .gitignore，使脚本的忽略行为与真实 Git 完全一致，
// 不再依赖容易脱节的硬编码清单。
// 仍保留少量「硬排除」：含密钥的配置 / 版本库元数据，无论如何都不推送。
const HARD_IGNORE = new Set(['.git', 'deploy.config.mjs']);

// 将 .gitignore 解析为规则数组（支持 ! 否定、/ 锚定、*、** 通配、目录 /）
function loadGitignore(root) {
  let content;
  try {
    content = readFileSync(join(root, '.gitignore'), 'utf8');
  } catch {
    warn('未找到根目录 .gitignore，仅使用硬排除规则。');
    return [];
  }
  const rules = [];
  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    let negate = false;
    if (line.startsWith('!')) {
      negate = true;
      line = line.slice(1).trim();
    }
    line = line.replace(/\s+$/, ''); // 去掉尾部空白（git 允许转义保留，此处简单处理）
    if (!line) continue;
    const dirOnly = line.endsWith('/');
    if (dirOnly) line = line.slice(0, -1);
    const anchored = line.startsWith('/');
    if (anchored) line = line.slice(1);
    const segs = line.split('/').filter(Boolean);
    const nameOnly = segs.length === 1 || (segs[0] === '**' && segs.length >= 2);
    rules.push({ negate, dirOnly, anchored, segs, nameOnly });
  }
  log(`已解析 .gitignore，共 ${rules.length} 条忽略规则。`);
  return rules;
}

// 单段通配匹配（* 不匹配 /，** 匹配任意）
function segMatch(patternSeg, name) {
  if (patternSeg === '**') return true;
  let re = '';
  for (const ch of patternSeg) {
    if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$').test(name);
}

function matchRule(rule, pathSegs, isDir) {
  const { dirOnly, anchored, segs, nameOnly, negate } = rule;
  if (dirOnly && !isDir) return false; // 目录规则只匹配目录
  if (nameOnly) {
    if (segs.length === 1) {
      return pathSegs.some((s) => segMatch(segs[0], s)); // 任意层级同名
    }
    const tail = segs.slice(1); // **/x/y → 尾部 x/y
    if (pathSegs.length < tail.length) return false;
    const sub = pathSegs.slice(pathSegs.length - tail.length);
    return sub.every((s, i) => segMatch(tail[i], s));
  }
  const n = segs.length;
  if (pathSegs.length < n) return false;
  const sub = pathSegs.slice(pathSegs.length - n);
  return sub.every((s, i) => segMatch(segs[i], s));
}

const GITIGNORE_RULES = loadGitignore(ROOT);

function isIgnored(relPath, isDir) {
  const pathSegs = relPath.split('/').filter(Boolean);
  let ignored = false;
  for (const rule of GITIGNORE_RULES) {
    if (matchRule(rule, pathSegs, isDir)) ignored = !rule.negate;
  }
  return ignored;
}
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 单文件 10MB 上限
const CONCURRENCY = 6;

// ── 配置合并：deploy.config.mjs（可选） < 环境变量 ──
// cfg 在每次部署/查询前都会通过 reloadConfig() 实时重读磁盘上的
// deploy.config.mjs，因此修改配置后无需重启 dev server / 部署服务即可生效。
const cfg = {
  token: '',
  repo: '',
  branch: 'main',
  message: 'deploy: 自动同步',
  vercelHook: '',
  nextAppHook: '', // /app 独立 Next.js 项目的 Deploy Hook（重建 next-app-mocha-three 等）
  dryRun: false,
  gitEnabled: true, // 默认开启真实 git commit，用于激活仓库历史 / AI 更新日志
};

// 从 .git 直接解析仓库（owner/name）与当前分支，避免依赖 git 可执行文件（dev server 进程 PATH 可能不含 git）
function detectRepoFromGit() {
  try {
    const text = readFileSync(join(ROOT, '.git', 'config'), 'utf8');
    const m = text.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(\S+)/);
    if (m) {
      const mm = m[1].match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
      if (mm) return mm[1];
    }
  } catch (e) {
    console.error('[detect] readFile .git/config failed:', e.message);
  }
  try {
    const url = execSync('git remote get-url origin', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
    return m ? m[1] : '';
  } catch (e) {
    console.error('[detect] exec git remote failed:', e.message);
    return '';
  }
}
function detectBranchFromGit() {
  try {
    const head = readFileSync(join(ROOT, '.git', 'HEAD'), 'utf8').trim();
    const m = head.match(/ref: refs\/heads\/(.+)/);
    if (m) return m[1];
  } catch { /* 忽略，回退到 execSync */ }
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

// 实时重读配置：环境变量优先，其次 deploy.config.mjs，最后自动探测 git。
// 加 ?t= 缓存破坏参数，确保每次都拿到磁盘最新内容（Node 会缓存静态 import）。
async function reloadConfig() {
  let fileConfig = {};
  try {
    const mod = await import(
      pathToFileURL(join(__dirname, 'deploy.config.mjs')).href + `?t=${Date.now()}`
    );
    fileConfig = mod.default || {};
  } catch {
    /* 没有配置文件也没关系 */
  }

  const branchExplicit = process.env.GITHUB_BRANCH ?? fileConfig.GITHUB_BRANCH;
  cfg.token = process.env.GITHUB_TOKEN ?? fileConfig.GITHUB_TOKEN ?? '';
  cfg.repo = process.env.GITHUB_REPO ?? fileConfig.GITHUB_REPO ?? '';
  cfg.branch = branchExplicit ?? 'main';
  cfg.message = process.env.GITHUB_COMMIT_MSG ?? fileConfig.GITHUB_COMMIT_MSG ?? 'deploy: 自动同步';
  cfg.vercelHook = process.env.VERCEL_DEPLOY_HOOK ?? fileConfig.VERCEL_DEPLOY_HOOK ?? '';
  cfg.nextAppHook = process.env.NEXT_APP_DEPLOY_HOOK ?? fileConfig.NEXT_APP_DEPLOY_HOOK ?? '';
  cfg.dryRun = (process.env.DEPLOY_DRY_RUN ?? fileConfig.DEPLOY_DRY_RUN ?? '0') === '1';
  // GITHUB_GIT_COMMIT=0/false/no 时禁用真实 git 提交，仅使用 GitHub API 推送
  cfg.gitEnabled = process.env.GITHUB_GIT_COMMIT
    ? !/^(0|false|no)$/i.test(process.env.GITHUB_GIT_COMMIT)
    : (fileConfig.GITHUB_GIT_COMMIT ? !/^(0|false|no)$/i.test(String(fileConfig.GITHUB_GIT_COMMIT)) : true);

  // 未显式配置仓库时，尝试从 git remote 自动探测
  if (!cfg.repo) {
    const d = detectRepoFromGit();
    if (d) cfg.repo = d;
  }
  // 未显式配置分支时，跟随当前检出的分支（如 master）
  if (!branchExplicit) {
    const b = detectBranchFromGit();
    if (b && b !== 'HEAD') cfg.branch = b;
  }
}

// 模块加载时先填充一次（CLI 直接运行时也能立刻拿到配置）
await reloadConfig();

const API = 'https://api.github.com';

async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'my-forum-github-push',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${data.message || ''}`);
  }
  return data;
}

// 递归收集需要同步的文件（相对路径，使用 / 分隔）
async function walk(dir, base = dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (HARD_IGNORE.has(e.name)) continue; // 含密钥/版本库元数据，绝不推送
    const rel = relative(base, abs).split(sep).join('/');
    if (isIgnored(rel, e.isDirectory())) continue; // 遵循 .gitignore
    if (e.isDirectory()) {
      out.push(...(await walk(abs, base)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

// 简单的并发池
async function pool(items, size, worker) {
  const it = items[Symbol.iterator]();
  const runners = Array.from({ length: size }, async () => {
    for (let n = it.next(); !n.done; n = it.next()) {
      await worker(n.value);
    }
  });
  await Promise.all(runners);
}

// A 线（git 优先）：真实 git commit + push，用于激活仓库历史 / AI 更新日志。
// 成功返回 true；未检测到 git、无改动或提交/推送失败时返回 false，由调用方回退到 GitHub API。
// 若提交成功但推送失败，会软重置撤销本地提交，保证工作区干净、可直接由 API 兜底。
async function gitCommitAndPush(message) {
  try {
    execFileSync('git', ['--version'], { cwd: ROOT, stdio: 'ignore' });
  } catch {
    warn('未检测到 git 命令，回退到 GitHub API 推送。');
    return false;
  }
  let committed = false;
  try {
    execFileSync('git', ['add', '-A'], { cwd: ROOT });
    // 判断是否有可提交内容（git diff --cached --quiet 退出码 0 表示无改动）
    try {
      execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT, stdio: 'ignore' });
      log('ℹ️ 工作区无新增改动，跳过 git 提交。');
      return false; // 交给 API 兜底同步远端
    } catch {
      /* 有改动，继续 */
    }
    const branch =
      execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() || cfg.branch;
    log(`git commit -m "${message}"`);
    execFileSync('git', ['commit', '-m', message], { cwd: ROOT });
    committed = true;
    log(`✅ git commit 成功（分支 ${branch}）`);
    log('git push origin HEAD:' + branch);
    execFileSync('git', ['push', 'origin', 'HEAD:' + branch], { cwd: ROOT });
    log('✅ git push 完成，仓库历史已更新（AI 更新日志可据此生成）。');
    return true;
  } catch (e) {
    if (committed) {
      try {
        execFileSync('git', ['reset', '--soft', 'HEAD~1'], { cwd: ROOT });
        log('⚠️ 已撤销本地 git 提交，回退到 API 推送。');
      } catch {
        /* 忽略重置失败 */
      }
    }
    const detail = e.stderr ? e.stderr.toString().trim() : e.message;
    warn('git 提交/推送失败：' + detail + '，回退到 GitHub API 推送。');
    return false;
  }
}

async function runDeploy(opts = {}) {
  if (opts.onLog) logSink = opts.onLog;
  if (opts.onWarn) warnSink = opts.onWarn;
  await reloadConfig(); // 部署前实时重读最新配置（无需重启）
  const effectiveDryRun = opts.dryRun ?? cfg.dryRun;
  const commitMessage = opts.message || cfg.message; // 可被 UI 传入，覆盖默认提交信息
  log(`扫描本地文件 (root=${ROOT}) …`);
  const files = await walk(ROOT);
  log(`共发现 ${files.length} 个文件`);

  if (effectiveDryRun) {
    // 预览模式：只扫描+列出将同步的文件，不触碰 GitHub，无需 Token
    log('预览模式：仅列出将同步的文件，不推送（无需 GitHub Token）。');
    log('预览提交信息：' + commitMessage + (cfg.gitEnabled !== false ? '（将优先 git commit，失败回退 API）' : '（git 已禁用，使用 API）'));
    for (const f of files.slice(0, 200)) log('· ' + f);
    if (files.length > 200) log(`… 其余 ${files.length - 200} 个文件省略`);
    return;
  }

  if (!cfg.token || !cfg.repo) {
    throw new Error('缺少 GITHUB_TOKEN 或 GITHUB_REPO，请在 scripts/deploy.config.mjs 或环境变量配置后，再点「一键部署」。');
  }

  // A 线：获取当前分支 ref 与基础树
  log(`读取分支 ${cfg.branch} 的引用…`);
  const ref = await gh(`/repos/${cfg.repo}/git/refs/heads/${cfg.branch}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`/repos/${cfg.repo}/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  // 拉取远端完整目录树，构建 path -> blobSha 映射，用于增量比对
  log('读取远端目录树用于增量比对…');
  const remoteTree = await gh(`/repos/${cfg.repo}/git/trees/${baseTreeSha}?recursive=1`);
  const remoteMap = new Map();
  for (const t of remoteTree.tree || []) {
    if (t.type === 'blob') remoteMap.set(t.path, t.sha);
  }
  if (remoteTree.truncated) {
    warn('远端树被截断（文件过多），本次退化为全量比对可能不准确。');
  }

  // 先算出所有本地文件的 git blob sha，划分「需上传」与「未改动」
  const localSet = new Set();
  const toUpload = [];
  let unchanged = 0, oversized = 0;
  let pushed = false; // 是否真正产生了新提交

  await pool(files, CONCURRENCY, async (path) => {
    const abs = join(ROOT, path);
    const st = await stat(abs);
    if (st.size > MAX_FILE_BYTES) {
      oversized++;
      warn(`跳过超大文件 (${Math.round(st.size / 1024)}KB): ${path}`);
      return;
    }
    const content = await readFile(abs);
    const sha = gitBlobSha(content);
    localSet.add(path);
    if (remoteMap.get(path) === sha) {
      unchanged++; // 远端已是同一内容，无需上传
    } else {
      toUpload.push({ path, content });
    }
  });

  // 检测被删除的文件（远端有、本地没有）
  const deleted = [];
  for (const p of remoteMap.keys()) {
    if (!localSet.has(p)) deleted.push(p);
  }

  log(`增量比对：改动/新增 ${toUpload.length}，未改动 ${unchanged}，删除 ${deleted.length}，跳过超大 ${oversized}`);

  if (toUpload.length === 0 && deleted.length === 0) {
    log('工作区与远端一致，无改动，跳过提交。');
  } else {
    // A 线（git 优先）：真实 git commit + push，用于激活仓库历史 / AI 更新日志
    let gitPushed = false;
    if (cfg.gitEnabled !== false) {
      gitPushed = await gitCommitAndPush(commitMessage);
    }
    if (gitPushed) {
      log('✅ 已通过 git 提交并推送，跳过 GitHub API 建树（避免重复提交）。');
      pushed = true;
    } else {
    // 仅为改动文件创建 blob
    const entries = [];
    let created = 0;
    await pool(toUpload, CONCURRENCY, async ({ path, content }) => {
      const blob = await gh(`/repos/${cfg.repo}/git/blobs`, {
        method: 'POST',
        body: { content: content.toString('base64'), encoding: 'base64' },
      });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      created++;
      if (created % 25 === 0) log(`已上传 ${created}/${toUpload.length} 个改动 blob`);
    });
    // 删除的文件：sha 置 null 从树中移除
    for (const path of deleted) {
      entries.push({ path, mode: '100644', type: 'blob', sha: null });
    }

    log(`blob 完成：新建 ${created}，删除 ${deleted.length}`);
    log('创建 tree…');
    const tree = await gh(`/repos/${cfg.repo}/git/trees`, {
      method: 'POST',
      body: { base_tree: baseTreeSha, tree: entries },
    });

    // tree 与基础树相同则说明无实际变化，跳过空提交
    if (tree.sha === baseTreeSha) {
      log('生成的树与基础树一致，无实际变化，跳过提交。');
    } else {
      log('创建 commit…');
      const commit = await gh(`/repos/${cfg.repo}/git/commits`, {
        method: 'POST',
        body: { message: commitMessage, tree: tree.sha, parents: [baseSha] },
      });

      log('更新分支引用…');
      await gh(`/repos/${cfg.repo}/git/refs/heads/${cfg.branch}`, {
        method: 'PATCH',
        body: { sha: commit.sha, force: false },
      });
      log(`A 线完成：已推送到 ${cfg.repo}@${cfg.branch} (${commit.sha.slice(0, 7)})`);
      pushed = true;
    }
  }
  }

  // B 线：仅在真正推送后触发 Vercel 重新部署，避免无改动空构建
  if (!pushed) {
    log('B 线：本次无实际推送，跳过 Vercel 部署。');
  } else {
    // 触发单个 Deploy Hook 的小工具（GET/POST 均可，这里用 POST）
    const triggerHook = async (label, url) => {
      if (!url) return;
      try {
        const r = await fetch(url, { method: 'POST' });
        log(`B 线：${label} deploy hook 触发 ${r.ok ? '成功' : '失败(' + r.status + ')'}`);
      } catch (e) {
        warn(`B 线 ${label} deploy hook 触发异常：`, e.message);
      }
    };
    // 主项目（Docusaurus + /app 反向代理函数）通常由 git push 自动部署；
    // 若配置了 VERCEL_DEPLOY_HOOK 则额外显式触发一次。
    await triggerHook('主项目', cfg.vercelHook);
    // /app 由独立 Next.js 项目承载，主项目部署不会重建它，
    // 必须单独触发其 Deploy Hook 才能把改动的 /app 推上线。
    await triggerHook('/app(next-app)', cfg.nextAppHook);
    if (!cfg.vercelHook && !cfg.nextAppHook) {
      log('B 线：未配置任何 Deploy Hook，依赖 git push 自动部署。');
    }
  }

  log('双轨同步结束。');
}

// 暴露部署配置状态（不含 token 明文），供本地 UI 服务展示
// 每次调用都实时重读配置，改完 deploy.config.mjs 无需重启即可生效。
export async function getDeployStatus() {
  await reloadConfig();
  return {
    hasToken: Boolean(cfg.token),
    repo: cfg.repo || null,
    branch: cfg.branch,
    hasVercelHook: Boolean(cfg.vercelHook),
    hasNextAppHook: Boolean(cfg.nextAppHook),
    message: cfg.message,
    gitEnabled: cfg.gitEnabled,
  };
}

// 作为命令行直接运行时执行；被 import 作为模块时不自动执行
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runDeploy().catch((e) => {
    console.error('[双轨部署] 失败：', e.message);
    process.exit(1);
  });
}

export { runDeploy };
