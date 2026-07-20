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

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

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
        <a href="/contribute" className={styles.ctaBtn}>申请友链 →</a>
      </div>
    </main>
  );
}
