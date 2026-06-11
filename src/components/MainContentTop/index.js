import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';

export default function MainContentTop({ siteData }) {
    const marqueeAnimation = {
        animation: 'marquee 18s linear infinite',
        whiteSpace: 'nowrap',
        // 提前把垂直居中写死在动画容器，避免transform叠加冲突
        top: '50%',
        transform: 'translateY(-50%)'
    };
    const marqueeHover = {
        animationPlayState: 'paused'
    };

    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes marquee {
                /* 只做水平位移，垂直位置不动 */
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
            alignItems: 'center',
            width: '100%',
            flexWrap: 'wrap'
        }}>
            {/* 标签按钮组 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: 0 }}>
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

            {/* 滚动通知栏 */}
            <div style={{
                height: 40,
                backgroundColor: '#E3F2FD',
                borderRadius: 8,
                overflow: 'hidden',
                flex: 1,
                padding: '0 12px',
                minWidth: 250,
                position: 'relative'
            }}>
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
            </div>

            {/* 操作按钮组 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: 0 }}>
                <Link
                    to="/signin"
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
                    {siteData.texts.buttons.signIn}
                </Link>
                <Link
                    to="/draw"
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
                    {siteData.texts.buttons.drawPost}
                </Link>
            </div>
        </div>
    );
}