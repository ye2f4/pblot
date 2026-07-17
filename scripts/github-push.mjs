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
 *   VERCEL_DEPLOY_HOOK  Vercel deploy hook URL（可选，B 线）
 *   DEPLOY_DRY_RUN      设为 1 时只扫描+打印，不实际推送
 *
 * 用法：
 *   node scripts/github-push.mjs
 *   DEPLOY_DRY_RUN=1 node scripts/github-push.mjs
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // 项目根目录

// 不同步的目录 / 文件（与 .gitignore 思路一致）
const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.docusaurus', 'build', 'dist',
  'coverage', '.cache', '.vercel', '.idea', '.vscode',
]);
const IGNORE_FILES = new Set(['.env', '.env.local', 'pnpm-lock.yaml.bak']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 单文件 10MB 上限
const CONCURRENCY = 6;

// ── 配置合并：deploy.config.mjs（可选） < 环境变量 ──
let fileConfig = {};
try {
  const mod = await import(join(__dirname, 'deploy.config.mjs'));
  fileConfig = mod.default || {};
} catch {
  /* 没有配置文件也没关系 */
}

const cfg = {
  token: process.env.GITHUB_TOKEN ?? fileConfig.GITHUB_TOKEN ?? '',
  repo: process.env.GITHUB_REPO ?? fileConfig.GITHUB_REPO ?? '',
  branch: process.env.GITHUB_BRANCH ?? fileConfig.GITHUB_BRANCH ?? 'main',
  message: process.env.GITHUB_COMMIT_MSG ?? fileConfig.GITHUB_COMMIT_MSG ?? 'deploy: 自动同步',
  vercelHook: process.env.VERCEL_DEPLOY_HOOK ?? fileConfig.VERCEL_DEPLOY_HOOK ?? '',
  dryRun: (process.env.DEPLOY_DRY_RUN ?? fileConfig.DEPLOY_DRY_RUN ?? '0') === '1',
};

const API = 'https://api.github.com';
const log = (...a) => console.log('[双轨部署]', ...a);
const warn = (...a) => console.warn('[双轨部署][警告]', ...a);

if (!cfg.token || !cfg.repo) {
  console.error('[双轨部署] 缺少 GITHUB_TOKEN 或 GITHUB_REPO，请在环境变量或 scripts/deploy.config.mjs 中配置。');
  process.exit(1);
}

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
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      out.push(...(await walk(abs, base)));
    } else {
      if (IGNORE_FILES.has(e.name)) continue;
      const rel = relative(base, abs).split(sep).join('/');
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

async function main() {
  log(`扫描本地文件 (root=${ROOT}) …`);
  const files = await walk(ROOT);
  log(`共发现 ${files.length} 个文件`);

  if (cfg.dryRun) {
    log('DEPLOY_DRY_RUN=1，仅预览，不推送。');
    for (const f of files.slice(0, 50)) console.log('  ·', f);
    if (files.length > 50) log(`… 其余 ${files.length - 50} 个文件省略`);
    return;
  }

  // A 线：获取当前分支 ref 与基础树
  log(`读取分支 ${cfg.branch} 的引用…`);
  const ref = await gh(`/repos/${cfg.repo}/git/refs/heads/${cfg.branch}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`/repos/${cfg.repo}/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;
  log(`基础提交 ${baseSha.slice(0, 7)}，开始创建 blob…`);

  const entries = [];
  let created = 0, oversized = 0;

  await pool(files, CONCURRENCY, async (path) => {
    const abs = join(ROOT, path);
    const st = await stat(abs);
    if (st.size > MAX_FILE_BYTES) {
      oversized++;
      warn(`跳过超大文件 (${Math.round(st.size / 1024)}KB): ${path}`);
      return;
    }
    const content = await readFile(abs);
    const b64 = content.toString('base64');
    const blob = await gh(`/repos/${cfg.repo}/git/blobs`, {
      method: 'POST',
      body: { content: b64, encoding: 'base64' },
    });
    entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    created++;
    if (created % 25 === 0) log(`已创建 ${created}/${files.length} 个 blob`);
  });

  log(`blob 完成：新建 ${created}，跳过超大 ${oversized}`);
  log('创建 tree…');
  const tree = await gh(`/repos/${cfg.repo}/git/trees`, {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree: entries },
  });

  log('创建 commit…');
  const commit = await gh(`/repos/${cfg.repo}/git/commits`, {
    method: 'POST',
    body: { message: cfg.message, tree: tree.sha, parents: [baseSha] },
  });

  log('更新分支引用…');
  await gh(`/repos/${cfg.repo}/git/refs/heads/${cfg.branch}`, {
    method: 'PATCH',
    body: { sha: commit.sha, force: false },
  });
  log(`A 线完成：已推送到 ${cfg.repo}@${cfg.branch} (${commit.sha.slice(0, 7)})`);

  // B 线：触发 Vercel 重新部署
  if (cfg.vercelHook) {
    try {
      const r = await fetch(cfg.vercelHook, { method: 'POST' });
      log(`B 线：Vercel deploy hook 触发 ${r.ok ? '成功' : '失败(' + r.status + ')'}`);
    } catch (e) {
      warn('B 线 Vercel hook 触发异常：', e.message);
    }
  } else {
    log('B 线：未配置 VERCEL_DEPLOY_HOOK，跳过。');
  }

  log('双轨同步结束。');
}

main().catch((e) => {
  console.error('[双轨部署] 失败：', e.message);
  process.exit(1);
});
