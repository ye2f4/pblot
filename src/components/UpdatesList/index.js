import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

export default function UpdatesList({ siteData }) {
  const [updates, setUpdates] = useState(siteData.updates || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        if (!supabase) {
          setUpdates(siteData.updates || []);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from('forum_posts')
          .select('title, created_at')
          .order('created_at', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          setUpdates(data.map(p => ({
            date: new Date(p.created_at).toLocaleDateString('zh-CN'),
            content: p.title,
            link: `/forum?tab=latest`
          })));
        } else {
          setUpdates(siteData.updates || []);
        }
      } catch (e) {
        console.log('UpdatesList 数据库读取失败，使用静态数据', e.message);
        setUpdates(siteData.updates || []);
      } finally {
        setLoading(false);
      }
    };
    fetchUpdates();
    const timer = setInterval(fetchUpdates, 120000);
    return () => clearInterval(timer);
  }, [siteData.updates]);

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>{siteData.texts.updatesTitle}</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#ccc' }}>⏳ 加载中...</div>
      ) : (
        <ul className={styles.updateList}>
          {updates.map((item, i) => (
            <li key={i} className={styles.updateItem}>
              <span className={styles.updateDate}>{item.date}</span>
              {item.link ? (
                <Link to={item.link} className="update-content" style={{ color: '#333', textDecoration: 'none' }}>
                  {item.content}
                </Link>
              ) : (
                <span className="update-content">{item.content}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
