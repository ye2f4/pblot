import React from 'react';

export default function FriendsAndAbout({ siteData }) {
    return (
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
            {/* 友情链接 */}
            <div className="section-card" style={{ flex: 1 }}>
                <h3 className="section-title">{siteData.texts.friendsTitle}</h3>
                <div className="friend-list">
                    {siteData.friends.map((friend, i) => (
                        <a
                            key={i}
                            href={friend.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="friend-link"
                        >
                            {friend.name}
                        </a>
                    ))}
                </div>
            </div>

            {/* 关于本站 */}
            <div className="section-card" style={{ flex: 1 }}>
                <h3 className="section-title">{siteData.texts.aboutTitle}</h3>
                <p className="about-text">{siteData.about}</p>
            </div>
        </div>
    );
}