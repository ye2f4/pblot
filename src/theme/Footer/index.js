import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { useBaseUrl } from '@docusaurus/useBaseUrl';
import { useThemeConfig } from '@docusaurus/theme-common';

function FooterLink({ to, href, label, prependBaseUrlToHref, ...props }) {
  if (to) {
    return <Link to={to} {...props}>{label}</Link>;
  }
  if (href) {
    return (
      <a href={prependBaseUrlToHref ? useBaseUrl(href) : href} {...props}>
        {label}
      </a>
    );
  }
  return <span {...props}>{label}</span>;
}

export default function Footer() {
  const { footer } = useThemeConfig();
  const { copyright, links, style } = footer;
  return (
    <footer
      className={clsx('footer', {
        'footer--dark': style === 'dark',
      })}>
      {links && links.length > 0 && (
        <div className="container container-fluid">
          <div className="row footer__links">
            {links.map((linkItem) => (
              <div key={linkItem.title} className="col footer__col">
                <div className="footer__title">{linkItem.title}</div>
                <ul className="footer__items">
                  {linkItem.items.map((item) => (
                    <li key={item.label} className="footer__item">
                      <FooterLink className="footer__link-item" {...item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {copyright && (
        <div className="footer__bottom text--center">
          <div className="container">
            <div className="footer__copyright">{copyright}</div>
            <div className="footer__copyright footer__beian">
              <a
                href="https://icp.gov.moe/?keyword=20265033"
                target="_blank"
                rel="noopener noreferrer">
                萌ICP备20265033号
              </a>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
