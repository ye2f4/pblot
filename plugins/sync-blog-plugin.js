/**
 * Docusaurus 插件：自动同步 blog MDX → Supabase forum_posts
 *
 * 监听 blog 插件的内容加载完成事件，
 * 将每篇博客的 frontmatter + 正文写入数据库。
 *
 * 去重策略：按 slug 匹配，内容 hash 相同则跳过。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 尝试加载 Supabase 客户端（可能在客户端环境不可用）
let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL || 'https://xwhwcmorcmgpfpocmgez.supabase.co',
      process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw'
    );
    return supabase;
  } catch (e) {
    return null;
  }
}

function hashContent(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/** 从 tags 数组推断帖子分类（与 seed-blog.mjs 保持一致） */
function inferCategory(tags) {
  if (!tags || !tags.length) return 'general';
  const allTags = tags.map((t) => String(t).toLowerCase());
  const techTags = ['react', 'node.js', 'javascript', 'jsx', 'css', 'vscode', 'github', 'api', 'restful', 'express', '前端', '后端', '部署', 'ci/cd', 'ide', '开发工具', '效率工具', 'docusaurus', 'supabase', 'hooks', '前端框架', '前端开发', 'flex', 'grid', '响应式', '开源', '博客系统', 'vercel', '域名', 'typescript'];
  const gameTags = ['minecraft', '游戏模组', 'java', 'forge', '物品注册', '游戏', 'meshtastic', 'ios', 'tak', 'itak', 'atak', 'integration', 'situational awareness'];
  const lifeTags = ['生活', '日常'];

  if (allTags.some((t) => gameTags.includes(t))) return 'game';
  if (allTags.some((t) => techTags.includes(t))) return 'tech';
  if (allTags.some((t) => lifeTags.includes(t))) return 'life';
  return 'general';
}

module.exports = function syncBlogPlugin(_context, _options) {
  return {
    name: 'sync-blog-plugin',

    async allContentLoaded({ allContent }) {
      const client = getSupabase();
      if (!client) return;

      // 获取 blog 插件产出的内容
      const blogPosts = allContent['docusaurus-plugin-content-blog']?.blogPosts;
      if (!blogPosts || !blogPosts.length) return;

      console.log(`[sync-blog] 检测到 ${blogPosts.length} 篇博客，开始同步...`);

      for (const post of blogPosts) {
        const { metadata } = post;
        const slug = metadata.permalink?.replace(/^\//, '').replace(/\/$/, '') || metadata.slug;
        const title = metadata.title || slug;
        const date = metadata.date
          ? new Date(metadata.date).toISOString()
          : new Date().toISOString();
        const tags = Array.isArray(metadata.tags)
          ? metadata.tags.map((t) => (typeof t === 'string' ? t : t.label))
          : [];
        const authorName = Array.isArray(metadata.authors)
          ? metadata.authors[0]?.name || 'Mono'
          : metadata.authors?.name || 'Mono';
        const category = inferCategory(tags);
        // 内容 hash 基于原始文件内容（与 seed-blog.mjs 保持一致）
        let contentHash;
        if (metadata.source && fs.existsSync(metadata.source)) {
          const rawContent = fs.readFileSync(metadata.source, 'utf-8');
          contentHash = hashContent(rawContent);
        } else {
          const contentSig = `${title}|${metadata.description || ''}|${tags.join(',')}|${date}`;
          contentHash = hashContent(contentSig);
        }

        try {
          // 检查 slug 是否已存在
          const { data: existing } = await client
            .from('forum_posts')
            .select('id, content_hash')
            .eq('slug', slug)
            .maybeSingle();

          const basePayload = {
            title,
            slug,
            excerpt: metadata.description || '',
            tags,
            author_name: authorName,
            category,
            source_type: 'blog_mdx',
            source_path: metadata.source,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            if (existing.content_hash === contentHash) continue; // 跳过未变更
            await client
              .from('forum_posts')
              .update({ ...basePayload, content_hash: contentHash })
              .eq('id', existing.id);
            console.log(`[sync-blog] 已更新: ${slug}`);
          } else {
            await client.from('forum_posts').insert([
              { ...basePayload, content_hash: contentHash, created_at: date },
            ]);
            console.log(`[sync-blog] 已新增: ${slug} · ${title}`);
          }
        } catch (e) {
          // 静默处理错误，不影响构建
          console.warn(`[sync-blog] 同步失败 (${slug}): ${e.message}`);
        }
      }

      console.log('[sync-blog] 同步完成');
    },
  };
};
