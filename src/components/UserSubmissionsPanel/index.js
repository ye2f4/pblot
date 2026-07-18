import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import { supabase } from '../../supabase/supabaseClient';

// 在博客列表页 / 文档页复用：拉取已发布用户投稿 + 「全部文章」按钮
export default function UserSubmissionsPanel() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_submissions')
          .select('id,title,tags,created_at,author_name,excerpt,cover_image,view_count')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && active && data) setSubmissions(data);
      } catch {
        // 静默：不影响原有博客/文档展示
      }
    })();
    return () => { active = false; };
  }, []);

  const fmt = (s) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN');
  };

  return (
    <section style={{
      maxWidth: 1100, margin: '28px auto 0', padding: '0 16px', width: '100%', boxSizing: 'border-box',
    }}>
      {submissions.length > 0 && (
        <div style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-color-emphasis-200)',
          borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 16, margin: '0 0 14px', color: 'var(--ifm-heading-color)' }}>
            ✍️ 用户投稿
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ifm-color-emphasis-500)', marginLeft: 8 }}>
              ({submissions.length})
            </span>
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {submissions.map((s) => (
              <li key={s.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 10px',
                borderRadius: 8, transition: 'background 0.2s ease',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(125, 125, 125, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  fontSize: 11, color: '#fff', background: '#22c55e',
                  borderRadius: 4, padding: '1px 6px', flexShrink: 0, fontWeight: 600,
                }}>
                  投稿
                </span>
                <Link
                  to={`/submissions/?id=${s.id}`}
                  style={{
                    flex: 1, color: 'var(--ifm-color-emphasis-800)', textDecoration: 'none',
                    fontSize: 14, fontWeight: 500,
                  }}
                >
                  {s.title}
                </Link>
                <span style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-400)', flexShrink: 0 }}>
                  {s.author_name}{s.created_at ? ' · ' + fmt(s.created_at) : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Link
          to="/articles"
          style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 10,
            background: 'var(--ifm-color-primary)', color: '#fff', textDecoration: 'none',
            fontSize: 14, fontWeight: 500,
          }}
        >
          📚 全部文章
        </Link>
      </div>
    </section>
  );
}
