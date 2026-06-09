import { useEffect } from 'react';

export default function BackToTop() {
  useEffect(() => {
    // 只在客户端运行一次，永不重渲染
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
        z-index: 999;
        display: none;
        transition: opacity 0.3s;
      }
      .back-to-top-btn.show {
        display: block;
      }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.className = 'back-to-top-btn';
    btn.innerText = '↑';
    document.body.appendChild(btn);

    // 滚动只操作 class，不触发 React 渲染
    const scrollHandler = () => {
      if (window.scrollY > 400) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    };

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', scrollHandler);
    scrollHandler();

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      btn.remove();
      style.remove();
    };
  }, []);

  // 组件本身不渲染任何 DOM，完全不卡
  return null;
}