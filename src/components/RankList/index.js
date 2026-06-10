import React from 'react';
import Link from '@docusaurus/Link';
// 所有子组件：TopBanner / AdSection / CommentSection / TagCloud 等第一行加这个
import styles from '../../pages/index.module.css';

export default function RankList({ siteData }) {
    return (
        <div style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 15,
            width: '100%'
        }}>
            <h4 style={{
                margin: '0 0 15px 0',
                fontSize: 16,
                position: 'relative',
                paddingBottom: 8,
                borderBottom: '2px solid #f0f0f0',
            }}>
                {siteData.texts.rankTitle}
                <span style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    fontSize: 12,
                    color: '#4285f4',
                }}>🔥</span>
            </h4>
            <div>
                {siteData.rankList.map((item, i) => {
                    const numColor = i === 0 ? '#ea4335' : i === 1 ? '#fbbc05' : i === 2 ? '#34a853' : '#999';
                    return (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderBottom: i < 6 ? '1px solid #f0f0f0' : 'none',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(5px)';
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: numColor,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                marginRight: 10,
                            }}>{i + 1}</span>
                            <Link
                                to={item.link}
                                style={{
                                    flex: 1,
                                    fontSize: 14,
                                    color: '#333',
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '4px 0',
                                }}
                            >
                                {item.title}
                            </Link>
                            <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>
                                {item.date}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
