'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './friends.module.css';

function Avatar({ friend }: { friend: any }) {
  const [err, setErr] = useState(false);
  const initial = (friend.name || '?').trim().charAt(0).toUpperCase();
  if (friend.avatar && !err) {
    return (
      <img
        src={friend.avatar}
        alt={friend.name}
        onError={() => setErr(true)}
        className={styles.avatar}
      />
    );
  }
  return <span className={styles.avatarFallback}>{initial}</span>;
}

// 申请表单预填模板
const REQUEST_TEMPLATE = `名称：Monoの小窝
简介：个人随笔、技术分享、开源教程
链接：https://monoblog.cc.cd
头像：https://monoblog.cc.cd/img/pblot_logo.png`;

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // 申请表单
  const [showForm, setShowForm] = useState(false);
  const [reqText, setReqText] = useState(REQUEST_TEMPLATE);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMsg, setReqMsg] = useState<{ type: '' | 'error' | 'success'; text: string }>({ type: '', text: '' });

  function parseRequest(text: string) {
    const map: Record<string, string> = {};
    text.split('\n').forEach((line) => {
      const m = line.match(/^\s*(名称|简介|链接|头像)\s*[:：]\s*(.+)$/);
      if (m) map[m[1]] = m[2].trim();
    });
    return map;
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqBusy(true);
    setReqMsg({ type: '', text: '' });
    const f = parseRequest(reqText);
    if (!f['名称'] || !f['链接']) {
      setReqMsg({ type: 'error', text: '请至少填写「名称」和「链接」字段' });
      setReqBusy(false);
      return;
    }
    try {
      if (!supabase) throw new Error('服务未连接');
      const { error } = await supabase.from('friend_link_requests').insert({
        name: f['名称'],
        url: f['链接'],
        avatar: f['头像'] || null,
        description: f['简介'] || null,
        tag: '朋友',
        status: 'pending',
      });
      if (error) throw error;
      setReqMsg({ type: 'success', text: '申请已提交，等待站长审核～' });
      setReqText(REQUEST_TEMPLATE);
      setShowForm(false);
    } catch (err: any) {
      setReqMsg({ type: 'error', text: '提交失败：' + (err?.message || String(err)) });
    } finally {
      setReqBusy(false);
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('friend_links')
            .select('name, url, avatar, description, tag')
            .eq('is_approved', true)
            .order('sort_order', { ascending: true });
          if (!error && data && data.length > 0) {
            setFriends(data);
          } else {
            setFriends([]);
          }
        } else {
          setFriends([]);
        }
      } catch {
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const g: Record<string, any[]> = {};
    friends.forEach((f) => {
      const tag = f.tag || '朋友';
      if (!g[tag]) g[tag] = [];
      g[tag].push(f);
    });
    setGroups(g);
  }, [friends]);

  const tagList = Object.keys(groups);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>🤝 友情链接</h1>
        <p className={styles.subtitle}>
          感谢这些站点与主站互联，点击即可前往拜访～
        </p>
      </header>

      {loading ? (
        <div className={styles.loading}><img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} /></div>
      ) : (
        <div className={styles.groups}>
          {tagList.length === 0 && (
            <div className={styles.empty}>暂无友链，欢迎申请交换～</div>
          )}
          {tagList.map((tag) => (
            <section key={tag} className={styles.group}>
              <h2 className={styles.groupTitle}>{tag}</h2>
              <div className={styles.grid}>
                {groups[tag].map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.card}
                    title={f.description || f.name}
                  >
                    <Avatar friend={f} />
                    <div className={styles.cardInfo}>
                      <div className={styles.cardName}>{f.name}</div>
                      {f.description && (
                        <div className={styles.cardDesc}>{f.description}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className={styles.cta}>
        <span>想和我交换友链？</span>
        <button type="button" className={styles.ctaBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? '收起申请' : '申请友链 →'}
        </button>
      </div>

      {showForm && (
        <form className={styles.reqForm} onSubmit={submitRequest}>
          <h3 className={styles.reqTitle}>提交友链申请</h3>
          <p className={styles.reqHint}>
            请按下方格式填写，把示例替换为你的站点信息（名称、简介、链接、头像四项）：
          </p>
          <textarea
            className={styles.reqTextarea}
            value={reqText}
            onChange={(e) => setReqText(e.target.value)}
            rows={6}
            spellCheck={false}
          />
          {reqMsg.text && (
            <div className={reqMsg.type === 'error' ? styles.reqError : styles.reqSuccess}>
              {reqMsg.text}
            </div>
          )}
          <div className={styles.reqActions}>
            <button type="submit" className={styles.reqSubmit} disabled={reqBusy}>
              {reqBusy ? '提交中…' : '提交申请'}
            </button>
            <button type="button" className={styles.reqCancel} onClick={() => { setShowForm(false); setReqMsg({ type: '', text: '' }); }}>
              取消
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
