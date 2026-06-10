import { useEffect } from 'react';

export default function ClickLove() {
  useEffect(() => {
    const click = (e) => {
      const heart = document.createElement('div');
      heart.textContent = '❤️';
      heart.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;pointer-events:none;font-size:16px;animation:fly 1s forwards;color:red`;
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
    };

    const style = document.createElement('style');
    style.innerHTML = '@keyframes fly{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-50px);opacity:0}}';
    document.head.appendChild(style);

    window.addEventListener('click', click);
    return () => window.removeEventListener('click', click);
  }, []);

  return null;
}
