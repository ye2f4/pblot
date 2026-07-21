'use client';

import Link from 'next/link';
import { SiteFooter, type LinkComponentProps } from '@mono/ui';
import siteData from '../../../src/data/siteData.json';

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

export default function AppFooter() {
  const cfg = siteData.appFooterConfig;
  const year = new Date().getFullYear();
  const copyright = `© ${year} ${cfg.copyright.replace(/^©\s*/, '')}`;

  return (
    <SiteFooter
      columns={cfg.columns}
      copyright={copyright}
      beian={cfg.beian}
      brand={cfg.brand}
      linkComponent={NextLink}
    />
  );
}
