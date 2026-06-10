import { useEffect } from 'react';

export default function MouseFollower() {
  useEffect(() => {
    const f = document.createElement('div');
    f.style = `width:160px;height:160px;background:radial-gradient(circle,rgba(0,119,255,0.2),transparent);border-radius:50%;position:fixed;pointer-events:none;transition:transform 0.1s ease;z-index:-1`;
    document.body.appendChild(f);

    const move = (e) => {
      f.style.transform = `translate(${e.clientX - 80}px, ${e.clientY - 80}px)`;
    };

    window.addEventListener('mousemove', move);
    return () => { window.removeEventListener('mousemove', move); f.remove(); };
  }, []);

  return null;
}
