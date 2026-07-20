import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import articlesData from '../../data/articles.json';

export default function RankList({ siteData }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('hot'); // hot | latest

    useEffect(() => {
        const all = (articlesData?.articles || []).filter((a) => a.date);

        // 最新：按日期倒序
        const latest = [...all].sort((a, b) => b.date.localeCompare(a.date));

        // 热门：以标签数量作为热度代理（覆盖主题越广，通常越受欢迎），再按日期兜底
        const hot = [...all].sort((a, b) => {
            const ta = (b.tags?.length || 0) - (a.tags?.length || 0);
            if (ta !== 0) return ta;
            return b.date.localeCompare(a.date);
        });

        const picked = (activeFilter === 'hot' ? hot : latest).slice(0, 7);

        setPosts(picked.length > 0 ? picked.map((p) => ({
            title: p.title,
            link: p.url,
            date: p.date,
            views: (p.tags?.length || 0) * 100, // 仅作展示用的热度代理
        })) : (siteData.rankList || []));
        setLoading(false);
    }, [activeFilter, siteData.rankList]);

    return (
        <div style={{
            backgroundColor: 'var(--ifm-card-background-color)',
            padding: 15,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: 15,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            border: '1px solid var(--ifm-toc-border-color)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{
                    margin: 0, fontSize: 16, position: 'relative',
                    paddingBottom: 8, borderBottom: '2px solid var(--ifm-toc-border-color)', flex: 1,
                    minWidth: 0,
                    color: 'var(--ifm-color-emphasis-900)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {activeFilter === 'hot' ? '🔥 热门主题' : '📝 最新主题'}
                </h4>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 8 }}>
                    <button
                        onClick={() => setActiveFilter('hot')}
                        style={{
                            padding: '3px 8px', border: 'none', borderRadius: '10px',
                            background: activeFilter === 'hot' ? '#4285f4' : 'var(--ifm-background-surface-color)',
                            color: activeFilter === 'hot' ? '#fff' : 'var(--ifm-color-emphasis-600)',
                            fontSize: 11, cursor: 'pointer', fontWeight: activeFilter === 'hot' ? 600 : 400,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        热门
                    </button>
                    <button
                        onClick={() => setActiveFilter('latest')}
                        style={{
                            padding: '3px 8px', border: 'none', borderRadius: '10px',
                            background: activeFilter === 'latest' ? '#4285f4' : 'var(--ifm-background-surface-color)',
                            color: activeFilter === 'latest' ? '#fff' : 'var(--ifm-color-emphasis-600)',
                            fontSize: 11, cursor: 'pointer', fontWeight: activeFilter === 'latest' ? 600 : 400,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        最新
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ifm-color-emphasis-400)' }}>
                    <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
                </div>
            ) : (
                <div>
                    {posts.map((item, i) => {
                        const numColor = i === 0 ? '#ea4335' : i === 1 ? '#fbbc05' : i === 2 ? '#34a853' : '#999';
                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px 0',
                                    borderBottom: i < posts.length - 1 ? '1px solid var(--ifm-toc-border-color)' : 'none',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    paddingLeft: '6px',
                                    paddingRight: '6px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateX(5px)';
                                    e.currentTarget.style.backgroundColor = 'var(--ifm-background-surface-color)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <span style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    backgroundColor: numColor, color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, marginRight: 10, flexShrink: 0, fontWeight: 700,
                                }}>{i + 1}</span>
                                <Link
                                    to={item.link}
                                    style={{
                                        flex: 1, fontSize: 14,
                                        color: 'var(--ifm-color-emphasis-800)',
                                        textDecoration: 'none',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        padding: '4px 0', minWidth: 0,
                                    }}
                                    title={item.title}
                                >
                                    {item.title}
                                </Link>
                                <span style={{
                                    fontSize: 11, color: 'var(--ifm-color-emphasis-400)',
                                    whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0,
                                }}>
                                    {activeFilter === 'hot' && item.views ? `🔥${item.views}` : item.date}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
