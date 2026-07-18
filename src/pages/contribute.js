import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/supabaseClient';
import { showAlert } from '@/utils/dialog';
import MarkdownView from '../components/MarkdownView';

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', margin: '6px 0 14px',
  borderRadius: 8, border: '1px solid var(--ifm-color-emphasis-300)',
  background: 'var(--ifm-card-background-color)', color: 'var(--ifm-font-color-base)', fontSize: 14,
};
const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--ifm-color-emphasis-700)' };

export default function Contribute() {
  const { user, isSessionChecked, handleGitHubLogin } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('# 在这里写你的故事\n\n支持 **Markdown** 语法，左侧编写、右侧实时预览。\n\n- 列表项一\n- 列表项二\n\n```js\nconsole.log("Hello, 投稿！");\n```\n');
  const [tags, setTags] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const publish = async () => {
    if (!user) { showAlert('请先登录后再投稿'); return; }
    const t = title.trim();
    const c = content.trim();
    if (!t) { showAlert('请填写标题'); return; }
    if (!c) { showAlert('正文不能为空'); return; }
    setSubmitting(true);
    try {
      const meta = user.user_metadata || {};
      const tagArr = tags.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
      const autoExcerpt = c.replace(/[#>*`\-\s]/g, '').slice(0, 120);
      const payload = {
        author_id: user.id,
        author_name: meta.preferred_username || meta.name || meta.full_name || (user.email ? user.email.split('@')[0] : '匿名'),
        author_avatar: meta.avatar_url || '',
        title: t,
        content: c,
        excerpt: excerpt.trim() || autoExcerpt,
        tags: tagArr,
        cover_image: cover.trim() || null,
        status: 'published',
      };
      const { data, error } = await supabase.from('user_submissions').insert([payload]).select('id').single();
      if (error) throw error;
      showAlert('🎉 投稿发布成功！');
      window.location.href = '/submissions/' + (data ? '?id=' + data.id : '');
    } catch (e) {
      console.error('投稿失败', e);
      if (e.message && e.message.includes('relation') && e.message.includes('does not exist')) {
        showAlert('数据库表尚未创建：请在 Supabase 控制台运行迁移 SQL（supabase/migrations/20260717_user_submissions.sql）');
      } else {
        showAlert('发布失败：' + (e.message || e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="投稿" description="在线编写并发布 Markdown 文章">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>✍️ 投稿 · 在线编写 Markdown</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginTop: 0 }}>
          用 Markdown 写下你的教程、笔记或故事，发布后会出现在 <Link to="/submissions/">投稿广场</Link>。
        </p>

        {!isSessionChecked ? null : !user ? (
          <div style={{ textAlign: 'center', padding: 40, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 12, background: 'var(--ifm-card-background-color)' }}>
            <p style={{ fontSize: 16 }}>投稿需要先登录</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
              <button onClick={handleGitHubLogin} className="button button--primary">GitHub 登录</button>
              <Link className="button button--secondary" to="/login/">邮箱登录</Link>
            </div>
          </div>
        ) : (
          <div className="contribute-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
            {/* 编辑区 */}
            <div>
              <label style={labelStyle} htmlFor="c-title">标题 *</label>
              <input id="c-title" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给你的文章起个标题" />

              <label style={labelStyle} htmlFor="c-tags">标签（逗号分隔，最多 8 个）</label>
              <input id="c-tags" style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="前端, 教程, 随笔" />

              <label style={labelStyle} htmlFor="c-excerpt">摘要（可选，留空自动截取）</label>
              <input id="c-excerpt" style={inputStyle} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="一句话简介" />

              <label style={labelStyle} htmlFor="c-cover">封面图 URL（可选）</label>
              <input id="c-cover" style={inputStyle} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />

              <label style={labelStyle} htmlFor="c-content">正文（Markdown / MDX）*</label>
              <textarea
                id="c-content"
                style={{ ...inputStyle, minHeight: 430, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.6 }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* 预览区 */}
            <div>
              <label style={labelStyle}>实时预览</label>
              <div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 12, padding: 16, minHeight: 480, background: 'var(--ifm-card-background-color)', overflow: 'auto' }}>
                <h2 style={{ marginTop: 0 }}>{title || '标题预览'}</h2>
                {cover.trim() && (
                  <img src={cover.trim()} alt="封面预览" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12 }} />
                )}
                <MarkdownView content={content} />
              </div>
            </div>
          </div>
        )}

        {user && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link className="button button--secondary" to="/submissions/">查看投稿广场</Link>
            <button onClick={publish} disabled={submitting} className="button button--primary" style={{ minWidth: 150 }}>
              {submitting ? '发布中…' : '🚀 发布投稿'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
