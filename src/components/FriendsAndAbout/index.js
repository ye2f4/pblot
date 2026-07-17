import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { supabase } from '../../supabase/supabaseClient';

function FriendAvatar({ friend }) {
  const [err, setErr] = useState(false);
  const initial = (friend.name || '?').trim().charAt(0).toUpperCase();
  if (friend.avatar && !err) {
    return (
      <img
        src={friend.avatar}
        alt={friend.name}
        onError={() => setErr(true)}
        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 12, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      background: 'linear-gradient(135deg, var(--ifm-color-primary-lighter), var(--ifm-color-primary))',
    }}>{initial}</span>
  );
}

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

        // 优先读取新的 friend_links 表（后台可管理），失败降级到静态数据
        try {
          const { data: friendData } = await supabase
            .from('friend_links')
            .select('name, url, avatar')
            .eq('is_approved', true)
            .order('sort_order', { ascending: true })
            .limit(8);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>{siteData.texts.friendsTitle}</h3>
          <Link to="/friends" style={{ fontSize: 13, color: 'var(--ifm-color-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            查看全部 →
          </Link>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#ccc' }}>⏳ 加载中...</div>
        ) : (
          <div className={styles.friendList} style={{ marginTop: 14 }}>
            {friends.map((friend, i) => (
              <a
                key={i}
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.friendLink}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
                title={friend.name}
              >
                <FriendAvatar friend={friend} />
                <span>{friend.name}</span>
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
