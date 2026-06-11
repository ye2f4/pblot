import React, { memo, useState, useEffect, useRef } from 'react';
import styles from '../../pages/index.module.css';

// 入参：外部传入 时区时间戳 + 地点名称
const PixelClock = memo(({
    timeEpoch = Math.floor(Date.now() / 1000),
    locationName = '北京'
}) => {
    const openCalendar = () => {
        window.open('/calendar', '_blank');
    };

    const padZero = (num) => String(num).padStart(2, '0');
    // 基准时间容器（useRef 避免重渲染，存储API时区时间）
    const baseDateRef = useRef(new Date(timeEpoch * 1000));

    // 页面渲染数据
    const [display, setDisplay] = useState({
        time: '00:00:00',
        weekJp: '水',
        weekEn: 'Wednesday',
        weekNum: 1,
        year: 2026,
        month: 1,
        day: 1
    });

    // 中日星期严格映射：0=周日 1=周一 ... 5=周五(金) 6=周六(土)
    const weekJpMap = ['日', '月', '火', '水', '木', '金', '土'];
    const weekEnMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    /**
     * 【修复】ISO 8601 标准周数计算（替代原错误简易算法）
     */
    const getISOWeekNumber = (dateObj) => {
        const date = new Date(dateObj);
        date.setHours(0, 0, 0, 0);
        const day = (date.getDay() + 6) % 7;
        date.setDate(date.getDate() - day + 3);
        const firstThursday = date.getTime();

        const firstYear = new Date(date.getFullYear(), 0, 1);
        const firstYearDay = (firstYear.getDay() + 6) % 7;
        const firstThursdayYear = new Date(
            firstYear.getTime() - firstYearDay * 86400000 + 3 * 86400000
        );
        return 1 + Math.round((firstThursday - firstThursdayYear) / 604800000);
    };

    /**
     * 统一刷新页面展示数据
     */
    const refreshDisplay = (dateObj) => {
        const h = padZero(dateObj.getHours());
        const m = padZero(dateObj.getMinutes());
        const s = padZero(dateObj.getSeconds());
        const weekIndex = dateObj.getDay();

        setDisplay({
            time: `${h}:${m}:${s}`,
            weekJp: weekJpMap[weekIndex],
            weekEn: weekEnMap[weekIndex],
            weekNum: getISOWeekNumber(dateObj),
            year: dateObj.getFullYear(),
            month: dateObj.getMonth() + 1,
            day: dateObj.getDate()
        });
    };

    // 外部时间戳/地点变更 → 重置基准时间并刷新界面
    useEffect(() => {
        baseDateRef.current = new Date(timeEpoch * 1000);
        refreshDisplay(new Date(baseDateRef.current));
    }, [timeEpoch]);

    // 每秒自动走时（独立定时器，卸载自动销毁）
    useEffect(() => {
        const timer = setInterval(() => {
            baseDateRef.current.setSeconds(baseDateRef.current.getSeconds() + 1);
            refreshDisplay(new Date(baseDateRef.current));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // ========== 以下 DOM / 样式 完全沿用你原始代码，无任何改动 ==========
    return (
        <div className="pixel-clock-fixed" style={{
            padding: "12px 14px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            position: "relative",
            width: '100%',
            boxSizing: 'border-box',
        }}>
            {/* 动态标题：原「标准北京时间」→ 自动变为 地点+当地时间 */}
            <p style={{
                margin: '0 0 3px 0',
                fontSize: 15,
                color: '#1ce306',
                fontWeight: 500
            }}>
                {locationName}当地时间
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
                    {display.time}
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
                <span>{display.weekJp}曜日 · {display.weekEn}</span>
            </button>

            <div className={`pixel-font ${styles.dateText}`} style={{
                fontSize: 13,
                color: '#333',
                fontWeight: 600
            }}>
                {display.year}-
                {padZero(display.month)}-
                {padZero(display.day)}
                第{display.weekNum}周
            </div>
        </div>
    );
});

export default PixelClock;