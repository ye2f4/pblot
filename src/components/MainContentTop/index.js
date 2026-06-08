import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';

export default function MainContentTop({ siteData }) {
    return (
        <div style={{
            display: 'flex',
            gap: 15,
            alignItems: 'center',
            width: '100%',
            flexWrap: 'wrap'
        }}>
            {/* 标签按钮组 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
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

            {/* 滚动通知栏 - 修复完成 */}
            <div style={{
                height: 40,
                backgroundColor: '#E3F2FD',
                borderRadius: 8,
                display: 'flex', // ✅ 修复：加引号
                alignItems: 'center',
                overflow: 'hidden',
                flex: 1,
                padding: '0 12px',
                minWidth: 250
            }}>
                <span
                    className="scroll-text"
                    style={{
                        color: '#004085',
                        fontSize: 14
                    }}
                >
                    {siteData.texts.notification}
                </span>
            </div>

            {/* 操作按钮组 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
                <Link
                    to="/pblot/signin"
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
                    to="/pblot/draw"
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