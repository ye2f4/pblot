import { useState, useEffect } from 'react';

export default function SiteTimer() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const start = new Date('2025-01-01').getTime(); // 修改你的建站时间
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = now - start;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTime(`${d}天 ${h}时 ${m}分`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div style={{ fontSize: 12, marginTop: 10 }}>🪐 已运行 {time}</div>;
}