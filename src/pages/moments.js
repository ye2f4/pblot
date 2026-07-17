import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/supabaseClient';
import styles from './moments.module.css';

function Avatar({ name, url }) {
  const [err, setErr] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url && !err) {
    return <img src={url} alt={name} onError={() => setErr(true)} className={styles.avatar} />;
  }
  return <span className={styles.avatarFallback}>{initial}</span>;
}

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-CN');
}

export default function MomentsPage() {
  const { siteConfig } = useDocusaurusContext();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function publish() {
    const text = content.trim();
    if (!text) return;
    if (text.length > 500) { alert('内容过长（上限 500 字）'); return; }
    setPosting(true);
    const meta = user?.user_metadata || {};
    const author_name = meta.full_name || meta.name || user?.email?.split('@')[0] || '我';
    const author_avatar = meta.avatar_url || null;
    const { error } = await supabase
      .from('moments')
      .insert({ content: text, user_id: user.id, author_name, author_avatar });
    setPosting(false);
    if (error) { alert('发布失败：' + error.message); return; }
    setContent('');
    load();
  }

  async function removeOwn(m) {
    if (!confirm('删除这条说说？')) return;
    const { error } = await supabase
      .from('moments')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', m.id);
    if (error) { alert('删除失败：' + error.message); return; }
    load();
  }

  return (
    <Layout title="说说" description="日常碎碎念">
      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>💬 说说</h1>
          <p className={styles.subtitle}>记录每一天的碎碎念</p>
        </header>

        <section className={styles.composer}>
          {user ? (
            <>
              <div className={styles.composerTop}>
                <Avatar name={user.user_metadata?.full_name || user.email} url={user.user_metadata?.avatar_url} />
                <textarea
                  className={styles.textarea}
                  placeholder="此刻在想什么？"
                  value={content}
                  maxLength={500}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                />
              </div>
              <div className={styles.composerBottom}>
                <span className={styles.counter}>{content.length}/500</span>
                <button className={styles.postBtn} disabled={posting || !content.trim()} onClick={publish}>
                  {posting ? '发布中…' : '发布'}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.loginTip}>
              登录后即可发布说说
              <Link className={styles.loginBtn} to="/login">前往登录中心</Link>
            </div>
          )}
        </section>

        {loading ? (
          <div className={styles.loading}>⏳ 加载中...</div>
        ) : list.length === 0 ? (
          <div className={styles.empty}>还没有人说点什么，来抢沙发吧～</div>
        ) : (
          <ul className={styles.feed}>
            {list.map((m) => {
              const mine = user && m.user_id === user.id;
              return (
                <li key={m.id} className={`${styles.item} ${m.is_pinned ? styles.pinned : ''}`}>
                  <Avatar name={m.author_name} url={m.author_avatar} />
                  <div className={styles.body}>
                    <div className={styles.meta}>
                      <span className={styles.name}>
                        {m.author_name}{m.is_pinned && <span className={styles.pinTag}>📌置顶</span>}
                      </span>
                      <span className={styles.time}>{timeAgo(m.created_at)}</span>
                    </div>
                    <div className={styles.text}>{m.content}</div>
                    {mine && (
                      <button className={styles.delBtn} onClick={() => removeOwn(m)}>删除</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </Layout>
  );
}
