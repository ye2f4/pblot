import { useEffect } from 'react';

export default function NavScroll() {
  useEffect(() => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const scroll = () => {
      nav.style.transition = 'background 0.3s';
      nav.style.background = window.scrollY > 50 ? '#fff' : 'transparent';
    };

    window.addEventListener('scroll', scroll);
    return () => window.removeEventListener('scroll', scroll);
  }, []);

  return null;
}
