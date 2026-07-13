import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

const TAG_COLORS = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#ff6d01',
  '#46bdc6', '#ab47bc', '#26a69a', '#ef5350', '#7c4dff',
];

export default function TagCloud({ siteData }) {
  const [tags, setTags] = useState(siteData.tags || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        if (!supabase) {
          setTags(siteData.tags || []);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from('forum_posts')
          .select('tags');

        if (data && data.length > 0) {
          // 统计 tags 出现次数
          const tagCount = {};
          data.forEach(post => {
            const postTags = post.tags;
            if (Array.isArray(postTags)) {
              postTags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
              });
            }
          });

          // 转为数组并排序
          const sortedTags = Object.entries(tagCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          if (sortedTags.length > 0) {
            setTags(sortedTags.map((t, i) => ({
              ...t,
              color: TAG_COLORS[i % TAG_COLORS.length]
            })));
          } else {
            setTags(siteData.tags || []);
          }
        } else {
          setTags(siteData.tags || []);
        }
      } catch (e) {
        console.log('TagCloud 数据库读取失败，使用静态数据', e.message);
        setTags(siteData.tags || []);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
    const timer = setInterval(fetchTags, 180000);
    return () => clearInterval(timer);
  }, [siteData.tags]);

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>{siteData.texts.tagsTitle}</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#ccc' }}>⏳ 加载中...</div>
      ) : (
        <div className={styles.tagCloud}>
          {tags.map((tag, i) => (
            <Link
              key={i}
              to={`/tags/${tag.name.toLowerCase()}`}
              className={styles.tagItem}
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`
              }}
            >
              {tag.name}
              <span className={styles.tagCount}>({tag.count})</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
