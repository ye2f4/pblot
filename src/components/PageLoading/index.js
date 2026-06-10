import { useEffect } from 'react';

export default function PageLoading() {
  useEffect(() => {
    const bar = document.createElement('div');
    bar.style = 'position:fixed;top:0;left:0;width:100%;height:3px;background:#007bff;z-index:9999;transition:width .3s';
    document.body.appendChild(bar);

    let w = 0;
    const timer = setInterval(() => {
      w += Math.random() * 8;
      bar.style.width = w + '%';
      if (w >= 100) {
        clearInterval(timer);
        bar.remove();
      }
    }, 100);

    return () => { clearInterval(timer); bar.remove(); };
  }, []);

  return null;
}
