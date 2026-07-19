import React, { useEffect, useRef, useState } from 'react';
import type { NavItem, SiteHeaderProps, LinkComponent } from './types';

function norm(p: string): string {
  return p.replace(/\/+$/, '') || '/';
}

function isActive(pathname: string, to?: string): boolean {
  if (!to) return false;
  const t = norm(to);
  const p = norm(pathname);
  return p === t || p.startsWith(t + '/');
}

function itemIsActive(pathname: string, item: NavItem): boolean {
  if (item.items && item.items.length) {
    return item.items.some((c) => itemIsActive(pathname, c));
  }
  return isActive(pathname, item.to);
}

function linkClass(item: NavItem, active: boolean): string {
  return ['navbar__link', item.className ?? '', active ? 'navbar__link--active' : '']
    .filter(Boolean)
    .join(' ');
}

function NavLink({
  item,
  L,
}: {
  item: NavItem;
  L: LinkComponent;
}) {
  const cls = linkClass(item, false);
  if (item.href) {
    const isHttp = item.href.startsWith('http');
    return (
      <L href={item.href} className={cls} title={item.title}>
        {item.label}
      </L>
    );
  }
  return (
    <L to={item.to} className={cls} title={item.title}>
      {item.label}
    </L>
  );
}

function DesktopItem({
  item,
  L,
  pathname,
}: {
  item: NavItem;
  L: LinkComponent;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (item.items && item.items.length) {
    const active = itemIsActive(pathname, item);
    return (
      <div
        ref={ref}
        className={`dropdown ${open ? 'dropdown--show' : ''} ${active ? 'is-active' : ''}`}
      >
        <button
          type="button"
          className={`navbar__link dropdown__link ${active ? 'navbar__link--active' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          {item.label}
        </button>
        <div className="dropdown__menu" role="menu" onClick={() => setOpen(false)}>
          {item.items.map((c, i) => (
            <NavLink key={i} item={c} L={L} />
          ))}
        </div>
      </div>
    );
  }
  return <NavLink item={item} L={L} />;
}

function MobileItem({
  item,
  L,
  pathname,
}: {
  item: NavItem;
  L: LinkComponent;
  pathname: string;
}) {
  if (item.items && item.items.length) {
    const [open, setOpen] = useState(false);
    return (
      <div className={`mobile-nav-dropdown ${open ? 'mobile-nav-dropdown--open' : ''}`}>
        <button
          type="button"
          className="mobile-nav-dropdown__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="mobile-nav-item__label">{item.label}</span>
          <span className="mobile-nav-dropdown__arrow">▾</span>
        </button>
        {open && (
          <div className="mobile-nav-submenu">
            {item.items.map((c, i) => (
              <NavLink key={i} item={c} L={L} />
            ))}
          </div>
        )}
      </div>
    );
  }
  const active = itemIsActive(pathname, item);
  // 注意：不能带 navbar__link 类，否则会被 ui.css 的 @media(width<600px){.navbar__link{display:none}} 隐藏；
  // 保留 item.className（绿色按钮）与 navbar__link--active（高亮）
  const cls = ['mobile-nav-item__link', item.className ?? '', active ? 'navbar__link--active' : '']
    .filter(Boolean)
    .join(' ');
  if (item.href) {
    const isHttp = item.href.startsWith('http');
    return (
      <div className="mobile-nav-item">
        <a
          className={cls}
          href={item.href}
          target={isHttp ? '_blank' : undefined}
          rel={isHttp ? 'noopener noreferrer' : undefined}
        >
          <span className="mobile-nav-item__label">{item.label}</span>
          {isHttp && <span className="mobile-nav-item__external">↗</span>}
        </a>
      </div>
    );
  }
  return (
    <div className="mobile-nav-item">
      <L to={item.to} className={cls}>
        <span className="mobile-nav-item__label">{item.label}</span>
      </L>
    </div>
  );
}

export function SiteHeader({
  brand,
  items,
  linkComponent,
  pathname,
  hideOnScroll,
  slots,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!hideOnScroll) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const leftItems = items.filter((i) => (i.position ?? 'left') === 'left');
  const rightItems = items.filter((i) => i.position === 'right');
  const L = linkComponent;
  const navbarHidden = !!hideOnScroll && hidden && !mobileOpen;

  const nav = (
    <nav className={`navbar ${navbarHidden ? 'navbar--hidden' : ''}`}>
      <div className="navbar__inner">
        <button
          type="button"
          className="navbar__toggle"
          aria-label="切换导航菜单"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        <a className="navbar__brand" href={brand.href}>
          <b className="navbar__title">{brand.title}</b>
        </a>
        <div className="navbar__items navbar__items--left">
          {leftItems.map((it, i) => (
            <DesktopItem key={i} item={it} L={L} pathname={pathname} />
          ))}
        </div>
        <div className="navbar__items navbar__items--right">
          {rightItems.map((it, i) => (
            <DesktopItem key={i} item={it} L={L} pathname={pathname} />
          ))}
          {slots?.auth}
          {slots?.search}
          {slots?.colorMode}
          {slots?.right}
        </div>
      </div>
    </nav>
  );

  const sidebar = mobileOpen ? (
    <div className="navbar-sidebar navbar-sidebar--show" role="dialog" aria-modal="true">
      <div className="navbar-sidebar__backdrop" onClick={() => setMobileOpen(false)} />
      <div className="navbar-sidebar__brand">
        <b className="navbar__title">{brand.title}</b>
        <button
          type="button"
          className="navbar-sidebar__close"
          aria-label="关闭菜单"
          onClick={() => setMobileOpen(false)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mobile-nav-menu">
        {leftItems.map((it, i) => (
          <MobileItem key={i} item={it} L={L} pathname={pathname} />
        ))}
        {rightItems.map((it, i) => (
          <MobileItem key={`r${i}`} item={it} L={L} pathname={pathname} />
        ))}
        {slots?.auth}
      </div>
    </div>
  ) : null;

  // 侧边栏作为 nav 的兄弟节点渲染，避免被 navbar 的 translate/sticky 包含块裁剪（导致移动端打不开）
  return (
    <>
      {nav}
      {sidebar}
    </>
  );
}
