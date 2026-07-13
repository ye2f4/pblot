import React, { useState, useEffect } from 'react';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

export default function FriendsAndAbout({ siteData }) {
  const [friends, setFriends] = useState(siteData.friends || []);
  const [about, setAbout] = useState(siteData.about || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          setFriends(siteData.friends || []);
          setAbout(siteData.about || '');
          setLoading(false);
          return;
        }

        // 尝试读取数据库中的友情链接
        try {
          const { data: friendData } = await supabase
            .from('site_links')
            .select('name, url')
            .eq('type', 'friend')
            .order('sort_order', { ascending: true })
            .limit(6);

          if (friendData && friendData.length > 0) {
            setFriends(friendData);
          } else {
            setFriends(siteData.friends || []);
          }
        } catch (e) {
          // 表不存在时降级
          setFriends(siteData.friends || []);
        }

        // 尝试读取数据库中的关于信息
        try {
          const { data: aboutData } = await supabase
            .from('site_config')
            .select('value')
            .eq('key', 'about_text')
            .maybeSingle();

          if (aboutData?.value) {
            setAbout(aboutData.value);
          } else {
            setAbout(siteData.about || '');
          }
        } catch (e) {
          setAbout(siteData.about || '');
        }
      } catch (e) {
        console.log('FriendsAndAbout 数据库读取失败，使用静态数据', e.message);
        setFriends(siteData.friends || []);
        setAbout(siteData.about || '');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [siteData.friends, siteData.about]);

  return (
    <div className={styles.friendAndAboutWrap}>
      {/* 友情链接 */}
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>{siteData.texts.friendsTitle}</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#ccc' }}>⏳ 加载中...</div>
        ) : (
          <div className={styles.friendList}>
            {friends.map((friend, i) => (
              <a
                key={i}
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.friendLink}
              >
                {friend.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 关于本站 */}
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>{siteData.texts.aboutTitle}</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#ccc' }}>⏳ 加载中...</div>
        ) : (
          <p className={styles.aboutText}>{about}</p>
        )}
      </div>
    </div>
  );
}
