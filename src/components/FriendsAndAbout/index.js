import React from 'react';
import styles from '../../pages/index.module.css';

export default function FriendsAndAbout({ siteData }) {
    return (
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
            {/* 友情链接 */}
            <div className={styles.sectionCard} style={{ flex: 1 }}>
                <h3 className={styles.sectionTitle}>{siteData.texts.friendsTitle}</h3>
                <div className={styles.friendList}>
                    {siteData.friends.map((friend, i) => (
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
            </div>

            {/* 关于本站 */}
            <div className={styles.sectionCard} style={{ flex: 1 }}>
                <h3 className={styles.sectionTitle}>{siteData.texts.aboutTitle}</h3>
                <p className={styles.aboutText}>{siteData.about}</p>
            </div>
        </div>
    );
}
