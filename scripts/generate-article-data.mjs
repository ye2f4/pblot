/**
 * 文章数据生成脚本：扫描 blog/ 与 docs/ 下所有 MDX/MD 文章，
 * 解析 frontmatter，输出 src/data/articles.json。
 *
 * 该 JSON 被首页统计（今/昨/总、最新更新、热门话题）与「全部文章」聚合页使用，
 * 因此「创建文章后重新构建即自动更新」，无需手动同步数据库。
 *
 * 用法（通常由 prestart / prebuild 自动调用）：
 *   node scripts/generate-article-data.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'articles.json');

// ============ frontmatter 解析（与 seed-blog.mjs 保持一致）============

function parseInlineArray(str) {
  const inner = str.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((s) => s.trim().replace(/^["'](.*)["']$/, '$1'));
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const meta = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentArray = [];

  function flushArray() {
    if (currentKey !== null && currentArray.length > 0) {
      meta[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }
  }

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      flushArray();
      continue;
    }
    const arrayItemMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayItemMatch && currentKey) {
      currentArray.push(arrayItemMatch[1].replace(/^["']|["']$/g, ''));
      continue;
    }
    const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      flushArray();
      const key = kvMatch[1];
      const rawValue = kvMatch[2].trim();
      if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        meta[key] = parseInlineArray(rawValue);
        continue;
      }
      if (rawValue === '' || rawValue === '[]') {
        currentKey = key;
        currentArray = [];
        continue;
      }
      meta[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
  flushArray();
  return meta;
}

function extractExcerpt(content, maxLen = 160) {
  const normalized = content.replace(/\r\n/g, '\n');
  const body = normalized.replace(/^---\n[\s\S]*?\n---\n/, '');
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxLen);
}

// ============ 收集文章 ============

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(mdx?|md)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function collectFrom(dir, type) {
  const files = walk(dir);
  const items = [];
  for (const filePath of files) {
    // 跳过明显的测试/占位文件
    if (path.basename(filePath, path.extname(filePath)) === 'kkk') continue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm.title) continue; // 必须有标题才收录

    const baseName = path.basename(filePath, path.extname(filePath));
    let url;
    if (type === 'blog') {
      const slug = fm.slug || baseName;
      url = `/blog/${slug}`;
    } else {
      const id = fm.id || baseName;
      url = `/docs/${id}`;
    }

    items.push({
      type,
      title: fm.title,
      date: fm.date || '',
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      authors: Array.isArray(fm.authors) ? fm.authors : [],
      url,
      excerpt: fm.description || fm.excerpt || extractExcerpt(raw),
      sourcePath: path.relative(ROOT, filePath),
    });
  }
  return items;
}

// ============ 主流程 ============

const articles = [
  ...collectFrom(BLOG_DIR, 'blog'),
  ...collectFrom(DOCS_DIR, 'docs'),
];

// 按日期倒序（无日期的排最后）
articles.sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.localeCompare(a.date);
});

const total = articles.length;
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const yesterday = new Date(today.getTime() - 86400000);
const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

const todayCount = articles.filter((a) => a.date === todayStr).length;
const yesterdayCount = articles.filter((a) => a.date === yesterdayStr).length;

const payload = {
  generatedAt: new Date().toISOString(),
  total,
  todayCount,
  yesterdayCount,
  articles,
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`✅ 已生成文章数据：${total} 篇（今 ${todayCount} / 昨 ${yesterdayCount}）=> ${path.relative(ROOT, OUT_PATH)}`);
