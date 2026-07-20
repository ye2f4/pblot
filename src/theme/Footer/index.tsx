import React from 'react';
import Link from '@docusaurus/Link';
import { SiteFooter, type LinkComponentProps } from '@mono/ui';
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

export default function Footer(): React.ReactElement {
  const cfg = siteData.footerConfig;
  const currentYear = new Date().getFullYear();
  const copyright = `Copyright © ${currentYear} ${siteData.siteTitle}. Powered by Docusaurus & Vercel.`;
  return (
    <SiteFooter
      columns={cfg.links}
      copyright={copyright}
      beian={cfg.beian}
      brand={{ title: siteData.siteTitle, href: '/' }}
      linkComponent={DLink}
    />
  );
}
