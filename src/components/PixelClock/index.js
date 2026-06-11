import React, { memo } from 'react';
import styles from '../../pages/index.module.css';

const PixelClock = memo(({
    now = new Date(),
    weekJp = '水',
    weekEn = 'Wednesday',
    weekNum = 1
}) => {
    const openCalendar = () => {
        window.open('/calendar', '_blank');
    };

    const padZero = (num) => String(num).padStart(2, '0');

    return (
        <div className="pixel-clock-fixed" style={{
            padding: "12px 14px", // 还原原始内边距，恢复方框大小
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            position: "relative",
            width: '100%',
            boxSizing: 'border-box',
        }}>
            <p style={{
                margin: '0 0 3px 0',
                fontSize: 15,
                color: '#1ce306',
                fontWeight: 500
            }}>
                标准北京时间
            </p>

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
                    {padZero(now.getHours())}:{padZero(now.getMinutes())}:{padZero(now.getSeconds())}
                </div>
            </div>

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

            <div className={`pixel-font ${styles.dateText}`} style={{
                fontSize: 13,
                color: '#333',
                fontWeight: 600
            }}>
                {now.getFullYear()}-
                {padZero(now.getMonth() + 1)}-
                {padZero(now.getDate())}
                第{weekNum}周
            </div>
        </div>
    );
});

export default PixelClock;