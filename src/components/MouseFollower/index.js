import { useEffect, useRef } from 'react';

// 检测是否为触摸设备（移动端禁用鼠标跟随，避免性能损耗）
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export default function MouseFollower() {
  const rafRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isTouchDevice()) return;

    const f = document.createElement('div');
    f.style.cssText = 'width:160px;height:160px;background:radial-gradient(circle,rgba(0,119,255,0.2),transparent);border-radius:50%;position:fixed;pointer-events:none;z-index:-1;will-change:transform';
    document.body.appendChild(f);

    const move = () => {
      f.style.transform = `translate(${mousePos.current.x - 80}px, ${mousePos.current.y - 80}px)`;
      rafRef.current = null;
    };

    const onMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(move);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      f.remove();
    };
  }, []);

  return null;
}
