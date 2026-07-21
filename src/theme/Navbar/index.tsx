import React from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import ColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import { SiteHeader, type LinkComponentProps } from '@mono/ui';
import siteData from '../../data/siteData.json';

const DLink = (props: LinkComponentProps) => {
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
  // /app/* 属于 Next 应用（Vercel 反向代理），必须走整页导航才能命中 rewrite，
  // 否则 Docusaurus 的客户端 <Link> 会把它当成自身路由 → 404。
  if (props.to && props.to.startsWith('/app')) {
    return (
      <a href={props.to} className={props.className} title={props.title}>
        {props.children}
      </a>
    );
  }
  return (
    <Link to={props.to} className={props.className} title={props.title}>
      {props.children}
    </Link>
  );
};

export default function Navbar(): React.ReactElement {
  const { pathname } = useLocation();
  const cfg = siteData.navbarConfig;
  return (
    <SiteHeader
      brand={{ title: siteData.siteTitle, href: '/' }}
      items={cfg.items}
      linkComponent={DLink}
      pathname={pathname}
      hideOnScroll={cfg.hideOnScroll}
      slots={{
        search: <SearchBar />,
        colorMode: <ColorModeToggle />,
      }}
    />
  );
}
