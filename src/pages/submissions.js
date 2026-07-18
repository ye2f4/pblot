import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { supabase } from '../supabase/supabaseClient';
import { showAlert } from '@/utils/dialog';
import MarkdownView from '../components/MarkdownView';

const fmtDate = (s) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN');
};

function SubmissionCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer', background: 'var(--ifm-card-background-color)', borderRadius: 12,
        border: '1px solid var(--ifm-color-emphasis-300)', padding: 18, transition: 'all .2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
    >
      {item.cover_image && (
        <img src={item.cover_image} alt={item.title} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} />
      )}
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ifm-font-color-base)' }}>{item.title}</div>
      <div style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)' }}>
        {item.author_avatar ? '👤 ' : ''}{item.author_name || '匿名'} · {fmtDate(item.created_at)} · 👁 {item.view_count || 0}
      </div>
      {item.excerpt && (
        <div style={{ fontSize: 13.5, color: 'var(--ifm-color-emphasis-700)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {item.excerpt}
        </div>
      )}
      {item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {item.tags.map((t, i) => (
            <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--ifm-color-emphasis-100)', color: 'var(--ifm-color-emphasis-700)' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Submissions() {
  const location = useLocation();
  const id = new URLSearchParams(location.search).get('id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [list, setList] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) loadDetail(id);
    else loadList();
  }, [id]);

  const loadList = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('user_submissions')
        .select('*')
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(120);
      if (e) throw e;
      setList(data || []);
    } catch (e) {
      console.error(e);
      if (e.message && e.message.includes('relation') && e.message.includes('does not exist'))
        setError('数据库表尚未创建：请在 Supabase 控制台运行迁移 SQL（supabase/migrations/20260717_user_submissions.sql）。');
      else setError('加载失败：' + e.message);
    } finally { setLoading(false); }
  };

  const loadDetail = async (pid) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.from('user_submissions').select('*').eq('id', pid).maybeSingle();
      if (e) throw e;
      if (!data) { setError('投稿不存在或已删除'); setLoading(false); return; }
      // 浏览量 +1（失败不影响阅读）
      supabase.from('user_submissions').update({ view_count: (data.view_count || 0) + 1 }).eq('id', pid).then(() => {});
      setDetail(data);
    } catch (e) {
      console.error(e);
      setError('加载失败：' + e.message);
    } finally { setLoading(false); }
  };

  return (
    <Layout title="投稿广场" description="用户投稿的 Markdown 文章广场">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>
        {detail ? (
          <>
            <Link to="/submissions/" className="button button--secondary button--sm" style={{ marginBottom: 16 }}>← 返回投稿广场</Link>
            {detail.cover_image && (
              <img src={detail.cover_image} alt={detail.title} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
            )}
            <h1 style={{ fontSize: 30, margin: '0 0 8px' }}>{detail.title}</h1>
            <div style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)', marginBottom: 18 }}>
              {detail.author_avatar ? '👤 ' : ''}{detail.author_name || '匿名'} · 发布于 {fmtDate(detail.created_at)} · 👁 {detail.view_count || 0} 浏览
            </div>
            {detail.tags && detail.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {detail.tags.map((t, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: 'var(--ifm-color-emphasis-100)', color: 'var(--ifm-color-emphasis-700)' }}>#{t}</span>
                ))}
              </div>
            )}
            <MarkdownView content={detail.content} />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 28, margin: '0 0 4px' }}>📚 投稿广场</h1>
                <p style={{ color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>用户用 Markdown 写的教程、笔记与故事。</p>
              </div>
              <Link className="button button--primary" to="/contribute/">✍️ 我要投稿</Link>
            </div>

            <div style={{ marginTop: 24 }}>
              {loading && <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>加载中…</p>}
              {error && (
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--ifm-color-emphasis-100)', color: 'var(--ifm-color-emphasis-800)' }}>{error}</div>
              )}
              {!loading && !error && list.length === 0 && (
                <div style={{ textAlign: 'center', padding: 50, color: 'var(--ifm-color-emphasis-600)' }}>
                  还没有投稿，<Link to="/contribute/">来写第一篇吧</Link>！
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {list.map((item) => (
                  <SubmissionCard key={item.id} item={item} onClick={() => { window.location.href = '/submissions/?id=' + item.id; }} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
