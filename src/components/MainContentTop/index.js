import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import { useMusic } from '../../utils/musicContext';

export default function MainContentTop({ siteData }) {
    const [isMobile, setIsMobile] = useState(false);
    const { share } = useMusic();
    // 播放音乐且有歌词时显示当前歌词行（居中静态），否则显示公告跑马灯
    const playingLyric = share.isPlaying && share.lyrics && share.activeLyric >= 0 ? (share.lyrics[share.activeLyric]?.text || '♪') : null;
    const marqueeAnimation = {
        animation: 'marquee 18s linear infinite',
        whiteSpace: 'nowrap',
        top: '50%',
        transform: 'translateY(-50%)'
    };
    const marqueeHover = {
        animationPlayState: 'paused'
    };

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes marquee {
                0% { transform: translateX(100%) translateY(-50%); }
                100% { transform: translateX(-100%) translateY(-50%); }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    return (
        <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: isMobile ? 'center' : 'flex-start',
            width: '100%',
            flexWrap: 'wrap',
            minWidth: 0,
            justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
            {/* 标签按钮组：五大功能 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: 0, flexWrap: 'wrap', flex: isMobile ? '1 1 100%' : '0 1 auto', minWidth: 0, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {siteData.tabs.map((tab, i) => (
                    <Link
                        key={i}
                        to={tab.link}
                        className={styles.btnHover}
                        aria-label={`查看${tab.name}内容`}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: tab.color,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none',
                            minWidth: 48,
                            minHeight: 48,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>

            {/* 滚动通知栏：播放音乐时显示当前歌词行（居中静态），否则显示公告跑马灯 */}
            <div style={{
                height: 40,
                backgroundColor: '#E3F2FD',
                borderRadius: 8,
                overflow: 'hidden',
                flex: isMobile ? '1 1 100%' : 1,
                padding: '0 12px',
                minWidth: isMobile ? 0 : 250,
                width: isMobile ? '100%' : 'auto',
                position: 'relative'
            }}>
                {playingLyric ? (
                    <span
                        style={{
                            color: '#004085',
                            fontSize: 14,
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                        }}
                    >
                        {playingLyric}
                    </span>
                ) : (
                    <span
                        style={{
                            color: '#004085',
                            fontSize: 14,
                            position: 'absolute',
                            ...marqueeAnimation
                        }}
                        onMouseEnter={(e) => Object.assign(e.target.style, marqueeHover)}
                        onMouseLeave={(e) => Object.assign(e.target.style, marqueeAnimation)}
                    >
                        {siteData.texts.notification}
                    </span>
                )}
            </div>

            {/* 操作按钮组 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: 0, flexWrap: 'wrap', flex: isMobile ? '1 1 100%' : '0 1 auto', minWidth: 0, justifyContent: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
                <Link
                    to="/signin"
                    className={styles.btnHover}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4285f4',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        minWidth: 48,
                        minHeight: 48,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ✅ 签到
                </Link>
                <a
                    href="/forum?tab=random"
                    className={styles.btnHover}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#ff9800',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        minWidth: 48,
                        minHeight: 48,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    🎲 抽贴
                </a>
                <Link
                    to="/visit-map"
                    className={styles.btnHover}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#34a853',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        minWidth: 48,
                        minHeight: 48,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    🌍 访问地图
                </Link>
            </div>
        </div>
    );
}
