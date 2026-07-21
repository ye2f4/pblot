<<<<<<< HEAD
import React, { useEffect, useRef, useState } from 'react';

/* ============================================================
 * 全站精致度特效（绿色主题，贴合站点品牌色 hsl(152 75% 28%)）
 * - SplashScreen：开场动画（每会话一次，reduced-motion 跳过）
 * - ClickEffect：点击粒子（浮层，不挡操作）
 * - PageTransition：页面切换淡入（劫持 history，不依赖 Router 层级）
 * 注意：纯 React + CSS，无 framer-motion 依赖（主站 Docusaurus 未装）。
 * ============================================================ */

const GREEN = '#1a8a50';
const GREEN_LIGHT = '#22c55e';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- 开场动画 ----------
function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem('site_splash_seen');
    if (prefersReducedMotion() || seen) {
      setRemoved(true);
      return;
    }
    sessionStorage.setItem('site_splash_seen', '1');
    const t = setTimeout(() => setHidden(true), 2000);
    const r = setTimeout(() => setRemoved(true), 2450);
    return () => { clearTimeout(t); clearTimeout(r); };
  }, []);

  if (removed) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'var(--ifm-background-color, #fff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity .45s ease',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes splashRing { to { transform: rotate(360deg); } }
        @keyframes splashPop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes splashProgress { from { width: 0%; } to { width: 100%; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'splashPop .6s ease both' }}>
          <div style={{ position: 'absolute', inset: 0, border: `3px solid ${GREEN}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'splashRing 1s linear infinite' }} />
          <div style={{ fontWeight: 800, fontSize: 22, color: GREEN, letterSpacing: 1 }}>M</div>
        </div>
        <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, color: GREEN, letterSpacing: 1, fontWeight: 600 }}>System initializing</div>
          <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(26,138,80,.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: GREEN, animation: 'splashProgress 2s linear forwards' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 点击粒子 ----------
function ClickEffect() {
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    const layer = layerRef.current;
    if (!layer) return;

    const COLORS = [GREEN, GREEN_LIGHT, '#16a34a'];
    const onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('a,button,input,textarea,select')) return;
      const x = e.clientX, y = e.clientY;
      const n = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const dot = document.createElement('span');
        const size = 4 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${COLORS[i % COLORS.length]};pointer-events:none;z-index:99998;opacity:.9;transition:transform .6s ease-out,opacity .6s ease-out;`;
        layer.appendChild(dot);
        requestAnimationFrame(() => {
          dot.style.transform = `translate(${dx}px, ${dy}px) scale(.2)`;
          dot.style.opacity = '0';
        });
        setTimeout(() => dot.remove(), 650);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  return <div ref={layerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99998 }} aria-hidden="true" />;
}

// ---------- 页面切换淡入（劫持 history 感知路由，仅重播动画、不重挂载 children） ----------
function PageTransition({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    let last = window.location.pathname;
    const play = () => {
      const el = ref.current;
      if (!el) return;
      el.style.animation = 'none';
      // 强制重排以重启动画
      void el.offsetWidth;
      el.style.animation = 'sitePageFade .32s ease both';
    };
    const onChange = () => {
      if (window.location.pathname !== last) {
        last = window.location.pathname;
        play();
      }
    };
    window.addEventListener('popstate', onChange);
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    const wrap = (fn) => function (...a) { const r = fn.apply(this, a); onChange(); return r; };
    window.history.pushState = wrap(origPush);
    window.history.replaceState = wrap(origReplace);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  return (
    <div ref={ref} style={{ animation: 'sitePageFade .32s ease both' }}>
      <style>{`@keyframes sitePageFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      {children}
    </div>
  );
}

export function SitePolish() {
  return (
    <>
      <SplashScreen />
      <ClickEffect />
    </>
  );
}

export { PageTransition };
export default SitePolish;
=======
import React, { useEffect, useRef, useState } from 'react';

/* ============================================================
 * 全站精致度特效（绿色主题，贴合站点品牌色 hsl(152 75% 28%)）
 * - SplashScreen：开场动画（每会话一次，reduced-motion 跳过）
 * - ClickEffect：点击粒子（浮层，不挡操作）
 * - PageTransition：页面切换淡入（劫持 history，不依赖 Router 层级）
 * 注意：纯 React + CSS，无 framer-motion 依赖（主站 Docusaurus 未装）。
 * ============================================================ */

const GREEN = '#1a8a50';
const GREEN_LIGHT = '#22c55e';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- 开场动画 ----------
function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem('site_splash_seen');
    if (prefersReducedMotion() || seen) {
      setRemoved(true);
      return;
    }
    sessionStorage.setItem('site_splash_seen', '1');
    const t = setTimeout(() => setHidden(true), 2000);
    const r = setTimeout(() => setRemoved(true), 2450);
    return () => { clearTimeout(t); clearTimeout(r); };
  }, []);

  if (removed) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'var(--ifm-background-color, #fff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity .45s ease',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes splashRing { to { transform: rotate(360deg); } }
        @keyframes splashPop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes splashProgress { from { width: 0%; } to { width: 100%; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'splashPop .6s ease both' }}>
          <div style={{ position: 'absolute', inset: 0, border: `3px solid ${GREEN}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'splashRing 1s linear infinite' }} />
          <div style={{ fontWeight: 800, fontSize: 22, color: GREEN, letterSpacing: 1 }}>M</div>
        </div>
        <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, color: GREEN, letterSpacing: 1, fontWeight: 600 }}>System initializing</div>
          <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(26,138,80,.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: GREEN, animation: 'splashProgress 2s linear forwards' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 点击粒子 ----------
function ClickEffect() {
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    const layer = layerRef.current;
    if (!layer) return;

    const COLORS = [GREEN, GREEN_LIGHT, '#16a34a'];
    const onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('a,button,input,textarea,select')) return;
      const x = e.clientX, y = e.clientY;
      const n = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const dot = document.createElement('span');
        const size = 4 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${COLORS[i % COLORS.length]};pointer-events:none;z-index:99998;opacity:.9;transition:transform .6s ease-out,opacity .6s ease-out;`;
        layer.appendChild(dot);
        requestAnimationFrame(() => {
          dot.style.transform = `translate(${dx}px, ${dy}px) scale(.2)`;
          dot.style.opacity = '0';
        });
        setTimeout(() => dot.remove(), 650);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  return <div ref={layerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99998 }} aria-hidden="true" />;
}

// ---------- 页面切换淡入（劫持 history 感知路由，仅重播动画、不重挂载 children） ----------
function PageTransition({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    let last = window.location.pathname;
    const play = () => {
      const el = ref.current;
      if (!el) return;
      el.style.animation = 'none';
      // 强制重排以重启动画
      void el.offsetWidth;
      el.style.animation = 'sitePageFade .32s ease both';
    };
    const onChange = () => {
      if (window.location.pathname !== last) {
        last = window.location.pathname;
        play();
      }
    };
    window.addEventListener('popstate', onChange);
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    const wrap = (fn) => function (...a) { const r = fn.apply(this, a); onChange(); return r; };
    window.history.pushState = wrap(origPush);
    window.history.replaceState = wrap(origReplace);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  return (
    <div ref={ref} style={{ animation: 'sitePageFade .32s ease both' }}>
      <style>{`@keyframes sitePageFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      {children}
    </div>
  );
}

export function SitePolish() {
  return (
    <>
      <SplashScreen />
      <ClickEffect />
    </>
  );
}

export { PageTransition };
export default SitePolish;
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
