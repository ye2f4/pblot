import { useEffect, useRef } from 'react';

const SCROLL_THRESHOLD = 100;

export default function BackToTop() {
  const btnRef = useRef(null);

  // 注入样式（只一次）
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .back-to-top-btn {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #007bff;
        color: #fff;
        border: none;
        font-size: 18px;
        cursor: pointer;
        z-index: 999999;
        display: none;
        transition: opacity 0.3s;
      }
      .back-to-top-btn.show {
        display: block;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // 滚动监听：稍微下滑即显示按钮（阈值降到 100px）
  useEffect(() => {
    const onScroll = () => {
      const btn = btnRef.current;
      if (!btn) return;
      if (window.scrollY > SCROLL_THRESHOLD) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 点击：回到顶部
  const handleActivate = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      ref={btnRef}
      className="back-to-top-btn"
      aria-label="回到顶部"
      onClick={handleActivate}
    >
      ↑
    </button>
  );
}
