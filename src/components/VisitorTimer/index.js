import { useState, useEffect } from 'react';

export default function VisitorTimer() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return <div style={{ fontSize: 12 }}>👀 已浏览 {m}分{s}秒</div>;
}
