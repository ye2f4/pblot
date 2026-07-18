import { useEffect, useRef } from 'react';

export default function NavScroll() {
  const tickingRef = useRef(false);
  const prevOpaqueRef = useRef(false);

  useEffect(() => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const updateBg = () => {
      const shouldOpaque = window.scrollY > 50;
      if (shouldOpaque === prevOpaqueRef.current) {
        tickingRef.current = false;
        return;
      }
      prevOpaqueRef.current = shouldOpaque;

      if (shouldOpaque) {
        // 滚动时：叠加模糊与半透明，仍可见内容
        nav.style.setProperty('--navbar-bg', 'var(--background)');
        nav.style.backdropFilter = 'blur(12px)';
        nav.style.background = '';
      } else {
        // 顶部：恢复 CSS 默认背景，不透明不透明
        nav.style.setProperty('--navbar-bg', 'var(--background)');
        nav.style.backdropFilter = '';
        nav.style.background = '';
      }
      tickingRef.current = false;
    };

    const scroll = () => {
      if (!tickingRef.current) {
        requestAnimationFrame(updateBg);
        tickingRef.current = true;
      }
    };

    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', scroll);
      // 恢复默认
      nav.style.setProperty('--navbar-bg', '');
      nav.style.backdropFilter = '';
      nav.style.background = '';
    };
  }, []);

  return null;
}
