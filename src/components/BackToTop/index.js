import { useEffect, useRef, useState } from 'react';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';

const SCROLL_THRESHOLD = 100;
// 必须高于侧边栏遮罩的 z-index: 999998，否则提示/按钮会被遮罩盖住
const Z_ABOVE_BACKDROP = 1000000;

export default function BackToTop() {
  const { shown } = useNavbarMobileSidebar();
  const btnRef = useRef(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const [hintVisible, setHintVisible] = useState(false);

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
        z-index: ${Z_ABOVE_BACKDROP};
        display: none;
        transition: opacity 0.3s;
      }
      .back-to-top-btn.show {
        display: block;
      }
      .menu-open-hint {
        position: fixed;
        right: 76px;
        bottom: 24px;
        z-index: ${Z_ABOVE_BACKDROP};
        background: #007bff;
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.3;
        box-shadow: 0 4px 12px rgba(0,0,0,.25);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: 200px;
        animation: hint-pop .25s ease;
      }
      .menu-open-hint::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-left-color: #007bff;
      }
      @keyframes hint-pop {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: none; }
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
      if (window.scrollY > SCROLL_THRESHOLD || shownRef.current) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 菜单已打开（被遮挡）时：强制显示按钮 + 显示提示
  useEffect(() => {
    const btn = btnRef.current;
    if (btn && shown) btn.classList.add('show');
    setHintVisible(!!shown);
  }, [shown]);

  // 点击：回到顶部并展开菜单（与按钮行为一致）
  const handleActivate = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <button
        ref={btnRef}
        className="back-to-top-btn"
        aria-label="回到顶部"
        onClick={handleActivate}
      >
        ↑
      </button>
      {hintVisible && (
        <div
          className="menu-open-hint"
          role="status"
          onClick={handleActivate}
        >
          ☰ 菜单已展开，点此查看
        </div>
      )}
    </>
  );
}
