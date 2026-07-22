'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { safeGetUser } from '@/lib/supabase/safe';
import { SiteHeader, type LinkComponentProps } from '@mono/ui';
import siteData from '../../../src/data/siteData.json';
import { useLocale } from '@/lib/i18n';
import AppLocaleToggle from './AppLocaleToggle';
import { transformNavItems } from '@/lib/docusaurusLinks';

const NextLink = (props: LinkComponentProps) => {
  if (props.href) {
    const external = props.href.startsWith('http');
    return (
      <a
        href={props.href}
        className={props.className}
        title={props.title}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {props.children}
      </a>
    );
  }
  return (
    <Link href={props.to ?? '/'} className={props.className} title={props.title}>
      {props.children}
    </Link>
  );
};

function AppSearchBox() {
  // 点击跳转主站搜索页（app 无本地文档搜索）；仅图标 + Ctrl K，对齐主站 DocSearch 外观
  return (
    <a
      className="navbar__search"
      href="https://monoblog.cc.cd/search"
      title="搜索"
      aria-label="搜索"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <kbd className="navbar__search-kbd">Ctrl K</kbd>
    </a>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15rem"
      height="1.15rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15rem"
      height="1.15rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function AppColorModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark =
      stored === 'dark' ||
      (stored === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      aria-label="切换主题"
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '2.25rem',
        minHeight: '2.25rem',
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        borderRadius: '0.375rem',
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function AppNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const pathname = usePathname() ?? '/'; // Next usePathname 不含 basePath，如 /chat
  const { t } = useLocale();

  useEffect(() => {
    let active = true;
    safeGetUser()
      .then(({ user }) => {
        if (active) setLoggedIn(!!user);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/app/login';
  };

  const cfg = siteData.navbarConfig;
  const items = transformNavItems(cfg.items);

  const authSlot: ReactNode =
    loggedIn === null ? null : loggedIn ? (
      <>
        <NextLink to="/profile" className="navbar__link">
          {t('profile')}
        </NextLink>
        <button type="button" className="navbar__link" onClick={handleLogout}>
          {t('logout')}
        </button>
      </>
    ) : (
      <NextLink to="/login" className="navbar__link navbar-contribute-btn">
        {t('login')}
      </NextLink>
    );

  return (
    <SiteHeader
      brand={{ title: siteData.siteTitle, href: siteData.siteUrl }}
      items={items}
      linkComponent={NextLink}
      pathname={pathname}
      hideOnScroll={cfg.hideOnScroll}
      slots={{
        auth: authSlot,
        search: <AppSearchBox />,
        colorMode: <AppColorModeToggle />,
        locale: <AppLocaleToggle />,
      }}
    />
  );
}
