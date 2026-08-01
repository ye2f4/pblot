import React, { useState, useEffect } from 'react';
import OriginalBlogListPage from '@theme-original/BlogListPage';
import Link from '@docusaurus/Link';
import { supabase } from '@site/src/supabase/supabaseClient';

// 用户投稿在博客列表顶部以独立区块呈现（轻量卡片，点击进入投稿详情）。
// 注意：Docusaurus 3.10 的 BlogListPage 通过 modules.items 自行渲染官方博客，
// props 中不含 blogPosts，故这里不覆盖官方渲染，仅追加投稿区块，确保 SSG 稳定。

function SubmissionSection() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_submissions')
          .select('id,title,tags,created_at,author_name,excerpt,cover_image,view_count')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(20);
        if (!error && active && data) setSubs(data);
      } catch {
        // 静默：不影响原有博客展示
      }
    })();
    return () => { active = false; };
  }, []);

  if (subs.length === 0) return null;

  return (
    <section className="offgrid-submission-section" style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>社区投稿</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
        {subs.map((s) => {
          const d = new Date(s.created_at);
          const valid = !isNaN(d.getTime());
          return (
            <li key={s.id}>
              <Link
                to={`/submissions/?id=${s.id}`}
                style={{
                  display: 'block',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--ifm-color-emphasis-300))',
                  background: 'hsl(var(--ifm-color-emphasis-100))',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>
                  {s.author_name || '投稿者'}
                  {valid ? ` · ${d.toLocaleDateString('zh-CN')}` : ''}
                  {s.view_count ? ` · ${s.view_count} 浏览` : ''}
                </div>
                {s.excerpt ? (
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.85 }}>{s.excerpt}</div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function BlogListPage(props) {
  return (
    <>
      <SubmissionSection />
      <OriginalBlogListPage {...props} />
    </>
  );
}
