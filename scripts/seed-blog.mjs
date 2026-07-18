/**
 * 种子脚本：将 blog/ 中已有的 MDX 文章导入 Supabase forum_posts 表
 *
 * 用法：
 *   node scripts/seed-blog.mjs
 *
 * 功能：
 *   1. 扫描 blog/ 下所有 .mdx 文件
 *   2. 解析 frontmatter（title, date, slug, tags, description/excerpt, authors）
 *   3. 按 slug 去重（已存在则跳过，内容变化才更新）
 *   4. 写入 forum_posts 表
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ============ 配置 ============
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xwhwcmorcmgpfpocmgez.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '..', 'blog');
const AUTHORS_PATH = path.join(BLOG_DIR, 'authors.yml');

// ============ 工具函数 ============

/** 解析 inline YAML 数组，如 [a, b, c] 或 ["a", "b", "c"] */
function parseInlineArray(str) {
  const inner = str.slice(1, -1).trim();
  if (!inner) return [];
  // 以逗号分割，处理引号内可能含逗号的情况（简单场景不涉及）
  return inner.split(',').map(s => {
    const trimmed = s.trim();
    return trimmed.replace(/^["'](.*)["']$/, '$1');
  });
}

/** 解析 MDX frontmatter（YAML 格式，在 --- 之间） */
function parseFrontmatter(content) {
  // 统一换行为 \n，兼容 Windows \r\n
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
    // 跳过空行和纯注释行
    if (line.trim() === '' || line.trim().startsWith('#')) {
      flushArray();
      continue;
    }

    // 多行数组项（以 "  - " 开头）
    const arrayItemMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayItemMatch && currentKey) {
      currentArray.push(arrayItemMatch[1].replace(/^["']|["']$/g, ''));
      continue;
    }

    // 键值对
    const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      flushArray();

      const key = kvMatch[1];
      const rawValue = kvMatch[2].trim();

      // inline 数组 [a, b, c] 或 ["a", "b"]
      if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        meta[key] = parseInlineArray(rawValue);
        continue;
      }

      // 空值：可能是多行数组开始
      if (rawValue === '' || rawValue === '[]') {
        currentKey = key;
        currentArray = [];
        continue;
      }

      // 带引号的单值
      const cleanValue = rawValue.replace(/^["']|["']$/g, '');
      meta[key] = cleanValue;
    }
  }

  flushArray();
  return meta;
}

/** 提取正文内容（去掉 frontmatter） */
function extractBody(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

/** 生成内容哈希 */
function hashContent(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/** 解析 authors.yml 获取作者显示名称映射 */
function loadAuthorMap() {
  if (!fs.existsSync(AUTHORS_PATH)) return {};
  const content = fs.readFileSync(AUTHORS_PATH, 'utf-8');
  const map = {};
  const lines = content.split('\n');
  let currentId = null;
  for (const line of lines) {
    // 顶层 key（author id）
    const topKey = line.match(/^(\w+):$/);
    if (topKey) {
      currentId = topKey[1];
      map[currentId] = currentId; // 默认用 ID
      continue;
    }
    // name 子属性
    if (currentId) {
      const nameMatch = line.match(/^\s+name:\s*(.+)$/);
      if (nameMatch) {
        map[currentId] = nameMatch[1].replace(/^["']|["']$/g, '');
      }
    }
  }
  return map;
}

/** 根据 authors id 数组解析作者显示名 */
function resolveAuthorName(authorIds, authorMap) {
  if (!authorIds || !Array.isArray(authorIds) || authorIds.length === 0) return 'Mono';
  const resolved = authorIds.map(id => authorMap[id] || id);
  return resolved[0]; // 取第一作者作为主显示名
}

/** 标签分类映射：根据 tags 推断 category */
function inferCategory(tags) {
  if (!tags || !Array.isArray(tags)) return 'general';
  const techTags = ['React', 'Node.js', 'JavaScript', 'JSX', 'CSS', 'VSCode', 'GitHub', 'API', 'RESTful', 'Express', '前端', '后端', '部署', 'CI/CD', 'IDE', '开发工具', '效率工具', 'Docusaurus', 'Supabase', 'Hooks', '前端框架', '前端开发', 'Flex', 'Grid', '响应式', '开源', '博客系统', 'Vercel', '域名', 'TypeScript'];
  const gameTags = ['Minecraft', '游戏模组', 'Java', 'Forge', '物品注册', '游戏', 'Meshtastic', 'iOS', 'TAK', 'iTAK', 'ATAK', 'integration', 'situational awareness'];
  const lifeTags = ['生活', '日常'];

  const allTags = tags.map(t => t.toLowerCase());

  if (allTags.some(t => gameTags.map(g => g.toLowerCase()).includes(t))) return 'game';
  if (allTags.some(t => techTags.map(g => g.toLowerCase()).includes(t))) return 'tech';
  if (allTags.some(t => lifeTags.map(g => g.toLowerCase()).includes(t))) return 'life';

  return 'general';
}

// ============ 主流程 ============

/** 探测 forum_posts 表中实际存在的列 */
async function detectColumns(supabase) {
  // 先试试能不能查 content_hash，以此判断迁移是否已执行
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('id, slug, content_hash')
      .limit(1);
    if (!error) {
      return {
        hasContentHash: true,
        hasExcerpt: true,
        hasSourceType: true,
        hasSourcePath: true,
        hasSlug: true,
      };
    }
    // 降级：逐个字段探测
  } catch (_) { /* ignore */ }

  // 降级探测
  const features = {
    hasSlug: false,
    hasContentHash: false,
    hasExcerpt: false,
    hasSourceType: false,
    hasSourcePath: false,
  };

  // 尝试 select 各种字段组合
  try {
    const { error } = await supabase.from('forum_posts').select('slug').limit(1);
    if (!error) features.hasSlug = true;
  } catch (_) { /* ignore */ }

  try {
    const { error } = await supabase.from('forum_posts').select('excerpt').limit(1);
    if (!error) features.hasExcerpt = true;
  } catch (_) { /* ignore */ }

  try {
    const { error } = await supabase.from('forum_posts').select('source_type').limit(1);
    if (!error) features.hasSourceType = true;
  } catch (_) { /* ignore */ }

  try {
    const { error } = await supabase.from('forum_posts').select('source_path').limit(1);
    if (!error) features.hasSourcePath = true;
  } catch (_) { /* ignore */ }

  return features;
}

async function main() {
  console.log('🔍 扫描 blog 目录:', BLOG_DIR);
  console.log('⏳ 连接 Supabase...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const authorMap = loadAuthorMap();
  const cols = await detectColumns(supabase);

  console.log('📋 检测到的表字段:', JSON.stringify(cols));
  console.log('');

  // 收集所有 .mdx 文件
  const mdxFiles = [];
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.mdx')) {
        mdxFiles.push(fullPath);
      }
    }
  }
  walkDir(BLOG_DIR);

  console.log(`📄 找到 ${mdxFiles.length} 个 MDX 文件\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of mdxFiles) {
    const relPath = path.relative(BLOG_DIR, filePath);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(rawContent);
    const bodyText = extractBody(rawContent);

    const slug = frontmatter.slug || path.basename(filePath, '.mdx');
    const title = frontmatter.title || slug;
    const date = frontmatter.date
      ? (frontmatter.date.length === 10
        ? `${frontmatter.date}T12:00:00+08:00`
        : new Date(frontmatter.date).toISOString())
      : new Date().toISOString();
    const excerpt = frontmatter.description || frontmatter.excerpt || '';
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const authorName = resolveAuthorName(frontmatter.authors, authorMap);
    const category = frontmatter.category || inferCategory(tags);
    const contentHash = hashContent(rawContent);

    try {
      // 构建查询选择字段（只选存在的字段）
      const selectFields = ['id'];
      if (cols.hasContentHash) selectFields.push('content_hash');
      if (cols.hasSlug) {
        // 按 slug 查询
        const { data: existing } = await supabase
          .from('forum_posts')
          .select(selectFields.join(','))
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          // 内容没变，跳过（除非 --force）
          const forceUpdate = process.argv.includes('--force');
          if (!forceUpdate && cols.hasContentHash && existing.content_hash === contentHash) {
            console.log(`⏭️  跳过（未变更）: ${slug}`);
            skipped++;
            continue;
          }

          // 构建更新 payload（只含存在的字段）
          const updatePayload = { title, content: bodyText, author_name: authorName, category, tags, updated_at: new Date().toISOString() };
          if (cols.hasExcerpt) updatePayload.excerpt = excerpt;
          if (cols.hasContentHash) updatePayload.content_hash = contentHash;
          if (cols.hasSourceType) updatePayload.source_type = 'blog_mdx';
          if (cols.hasSourcePath) updatePayload.source_path = relPath;
          updatePayload.created_at = date; // 确保创建时间正确

          const { error: updateErr } = await supabase
            .from('forum_posts').update(updatePayload).eq('id', existing.id);

          if (updateErr) {
            console.error(`❌ 更新失败: ${slug} — ${updateErr.message}`);
            errors++;
            continue;
          }
          console.log(`🔄 已更新: ${slug}`);
          updated++;
        } else {
          // 插入新记录
          const insertPayload = { title, slug, content: bodyText, author_name: authorName, category, tags, created_at: date, updated_at: new Date().toISOString() };
          if (cols.hasExcerpt) insertPayload.excerpt = excerpt;
          if (cols.hasContentHash) insertPayload.content_hash = contentHash;
          if (cols.hasSourceType) insertPayload.source_type = 'blog_mdx';
          if (cols.hasSourcePath) insertPayload.source_path = relPath;

          const { error: insertErr } = await supabase
            .from('forum_posts').insert([insertPayload]);

          if (insertErr) {
            console.error(`❌ 插入失败: ${slug} — ${insertErr.message}`);
            errors++;
            continue;
          }
          console.log(`✅ 已导入: ${slug} · ${title}`);
          inserted++;
        }
      } else {
        // 没有 slug 列，按 title 匹配
        const { data: existing } = await supabase
          .from('forum_posts')
          .select(selectFields.join(','))
          .eq('title', title)
          .maybeSingle();

        if (existing) {
          const updatePayload = { title, content: bodyText, author_name: authorName, category, tags, updated_at: new Date().toISOString() };
          if (cols.hasExcerpt) updatePayload.excerpt = excerpt;
          if (cols.hasContentHash) updatePayload.content_hash = contentHash;
          if (cols.hasSourceType) updatePayload.source_type = 'blog_mdx';
          if (cols.hasSourcePath) updatePayload.source_path = relPath;

          const { error: updateErr } = await supabase
            .from('forum_posts').update(updatePayload).eq('id', existing.id);

          if (updateErr) {
            console.error(`❌ 更新失败: ${slug} — ${updateErr.message}`);
            errors++;
            continue;
          }
          console.log(`🔄 已更新（按标题）: ${slug}`);
          updated++;
        } else {
          const insertPayload = { title, content: bodyText, author_name: authorName, category, tags, created_at: date, updated_at: new Date().toISOString() };
          if (cols.hasExcerpt) insertPayload.excerpt = excerpt;
          if (cols.hasContentHash) insertPayload.content_hash = contentHash;
          if (cols.hasSourceType) insertPayload.source_type = 'blog_mdx';
          if (cols.hasSourcePath) insertPayload.source_path = relPath;

          const { error: insertErr } = await supabase
            .from('forum_posts').insert([insertPayload]);

          if (insertErr) {
            console.error(`❌ 插入失败: ${slug} — ${insertErr.message}`);
            errors++;
            continue;
          }
          console.log(`✅ 已导入（按标题）: ${slug} · ${title}`);
          inserted++;
        }
      }
    } catch (e) {
      console.error(`❌ 处理异常: ${slug} — ${e.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 总结: ✅ 新增 ${inserted} | 🔄 更新 ${updated} | ⏭️ 跳过 ${skipped} | ❌ 失败 ${errors}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
