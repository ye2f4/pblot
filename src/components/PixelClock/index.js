import React from 'react';
import styles from '../../pages/index.module.css';

export default function PixelClock({
    now = new Date(),
    weekJp = '水',
    weekEn = 'Wednesday',
    weekNum = 1
}) {
    // 打开日历的函数（固定正确路径）
    const openCalendar = () => {
        window.open('/pblot/calendar', '_blank');
    };

    return (
        <div style={{
            padding: "12px 14px",
            background: "rgba(75, 157, 205, 0.9)",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            position: "relative",
            width: '100%',
            boxSizing: 'border-box',
        }}>
            {/* 时钟标题 */}
            <p style={{
                margin: '0 0 3px 0',
                fontSize: 15,
                color: '#1ce306',
                fontWeight: 500
            }}>
                标准北京时间
            </p>

            {/* 时间显示 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                marginBottom: 5
            }}>
                <span style={{ fontSize: 17 }}>⏰</span>
                <div className={`pixel-font ${styles.clockText}`} style={{
                    fontSize: 19,
                    color: '#1a1a1a',
                    letterSpacing: 2,
                }}>
                    {now.toLocaleTimeString()}
                </div>
            </div>

            {/* 日历按钮 → 新标签页打开老黄历 */}
            <button onClick={openCalendar} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                margin: '0 auto 5px auto', padding: '2px 8px',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                border: 'none', borderRadius: 18, cursor: 'pointer',
                fontSize: 11, color: '#0060fc', fontWeight: 500,
            }}>
                <span style={{ fontSize: 12 }}>📅</span>
                <span>{weekJp}曜日 · {weekEn}</span>
            </button>

            {/* 日期和周数 */}
            <div className={`pixel-font ${styles.dateText}`} style={{
                fontSize: 13,
                color: '#333',
                fontWeight: 600
            }}>
                {now.getFullYear()}-
                {(now.getMonth() + 1 + '').padStart(2, '0')}-
                {(now.getDate() + '').padStart(2, '0')}
                第{weekNum}周
            </div>
        </div>
    );
}