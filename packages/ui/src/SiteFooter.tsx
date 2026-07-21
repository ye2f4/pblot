<<<<<<< HEAD
import React from 'react';
import type { SiteFooterProps, LinkComponent } from './types';

export function SiteFooter({
  columns,
  copyright,
  beian,
  linkComponent: L,
  brand,
}: SiteFooterProps) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {columns.map((col, ci) => (
          <div className="footer__col" key={ci}>
            <div className="footer__title">{col.title}</div>
            <ul className="footer__items">
              {col.items.map((it, ii) => (
                <li key={ii}>
                  {it.href ? (
                    <a
                      className="footer__link-item"
                      href={it.href}
                      target={it.href.startsWith('http') ? '_blank' : undefined}
                      rel={it.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {it.label}
                    </a>
                  ) : (
                    <L to={it.to} className="footer__link-item">
                      {it.label}
                    </L>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {copyright && <div className="footer__copyright">{copyright}</div>}
      {beian && (
        <div className="footer__beian">
          <a href={beian.href} target="_blank" rel="noopener noreferrer">
            {beian.label}
          </a>
        </div>
      )}
    </footer>
  );
}
=======
import React from 'react';
import type { SiteFooterProps, LinkComponent } from './types';

export function SiteFooter({
  columns,
  copyright,
  beian,
  linkComponent: L,
  brand,
}: SiteFooterProps) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {columns.map((col, ci) => (
          <div className="footer__col" key={ci}>
            <div className="footer__title">{col.title}</div>
            <ul className="footer__items">
              {col.items.map((it, ii) => (
                <li key={ii}>
                  {it.href ? (
                    <a
                      className="footer__link-item"
                      href={it.href}
                      target={it.href.startsWith('http') ? '_blank' : undefined}
                      rel={it.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {it.label}
                    </a>
                  ) : (
                    <L to={it.to} className="footer__link-item">
                      {it.label}
                    </L>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {copyright && <div className="footer__copyright">{copyright}</div>}
      {beian && (
        <div className="footer__beian">
          <a href={beian.href} target="_blank" rel="noopener noreferrer">
            {beian.label}
          </a>
        </div>
      )}
    </footer>
  );
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
