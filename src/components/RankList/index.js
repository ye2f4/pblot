import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import { supabase } from '../../supabase/supabaseClient';
import styles from '../../pages/index.module.css';

export default function RankList({ siteData }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('hot'); // hot | latest

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            try {
                if (!supabase) {
                    // 降级使用静态数据
                    setPosts(siteData.rankList || []);
                    setLoading(false);
                    return;
                }

                let query = supabase.from('forum_posts').select('title, view_count, reply_count, created_at');

                if (activeFilter === 'hot') {
                    query = query.order('view_count', { ascending: false });
                } else {
                    query = query.order('created_at', { ascending: false });
                }

                query = query.limit(7);

                const { data, error } = await query;

                if (error) throw error;

                if (data && data.length > 0) {
                    setPosts(data.map(p => ({
                        title: p.title,
                        link: `/forum?tab=${activeFilter}`,
                        date: new Date(p.created_at).toLocaleDateString('zh-CN'),
                        views: p.view_count || 0,
                        replies: p.reply_count || 0,
                    })));
                } else {
                    setPosts(siteData.rankList || []);
                }
            } catch (e) {
                // 表不存在时降级为静态数据
                console.log('RankList 数据库读取失败，使用静态数据', e.message);
                setPosts(siteData.rankList || []);
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
        const timer = setInterval(fetchRankings, 60000);
        return () => clearInterval(timer);
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
                    ⏳ 加载中...
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
                                    {activeFilter === 'hot' && item.views ? `👁${item.views}` : item.date}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
