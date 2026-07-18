import React, { useMemo, useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';
import articlesData from '../data/articles.json';
import { supabase } from '../supabase/supabaseClient';

export default function AllArticles() {
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
        // 静默：不影响原有文章展示
      }
    })();
    return () => { active = false; };
  }, []);

  const fmt = (s) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN');
  };

  // 按标签自动分类
  const grouped = useMemo(() => {
    const map = new Map();
    (articlesData?.articles || []).forEach((a) => {
      const tags = a.tags && a.tags.length > 0 ? a.tags : ['未分类'];
      tags.forEach((tag) => {
        if (!map.has(tag)) map.set(tag, []);
        map.get(tag).push(a);
      });
    });
    // 按文章数量倒序，热门标签靠前
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, []);

  const total = articlesData?.total ?? 0;

  return (
    <Layout
      title="全部文章"
      description="Monoの小窝全部文章——按标签自动分类的博客与文档聚合页"
    >
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px', width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 30, margin: '0 0 8px', color: 'var(--ifm-heading-color)' }}>
            📚 全部文章
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
            共 {total} 篇文章，按标签自动分类（博客 + 文档）。创建新文章后重新构建即自动更新。
          </p>
        </div>

        {submissions.length > 0 && (
          <section className={styles.sectionCard} style={{ marginBottom: 22 }}>
            <h3 className={styles.sectionTitle}>
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ifm-background-surface-color)')}
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
          </section>
        )}

        {grouped.map(([tag, list]) => (
          <section key={tag} className={styles.sectionCard} style={{ marginBottom: 22 }}>
            <h3 className={styles.sectionTitle}>
              🏷️ {tag}
              <span style={{
                fontSize: 12, fontWeight: 400, color: 'var(--ifm-color-emphasis-500)', marginLeft: 8,
              }}>
                ({list.length})
              </span>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map((a, i) => (
                <li key={`${a.url}-${i}`} style={{
                  display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 10px',
                  borderRadius: 8, transition: 'background 0.2s ease',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ifm-background-surface-color)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    fontSize: 11, color: '#fff', background: a.type === 'blog' ? '#4285f4' : '#8b5cf6',
                    borderRadius: 4, padding: '1px 6px', flexShrink: 0, fontWeight: 600,
                  }}>
                    {a.type === 'blog' ? '博客' : '文档'}
                  </span>
                  <Link
                    to={a.url}
                    style={{
                      flex: 1, color: 'var(--ifm-color-emphasis-800)', textDecoration: 'none',
                      fontSize: 14, fontWeight: 500,
                    }}
                  >
                    {a.title}
                  </Link>
                  {a.date && (
                    <span style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-400)', flexShrink: 0 }}>
                      {a.date}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link
            to="/"
            style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 10,
              background: 'var(--ifm-color-primary)', color: '#fff', textDecoration: 'none', fontSize: 14,
            }}
          >
            🏠 返回首页
          </Link>
        </div>
      </div>
    </Layout>
  );
}
