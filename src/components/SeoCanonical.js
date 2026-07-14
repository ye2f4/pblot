import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/**
 * 全局注入 <link rel="canonical">，覆盖所有路由（含 ssr:false 的 JS 渲染页）。
 * 搜索引擎执行 JS 后会采用该 canonical，避免 /forum?tab=、/chat 等动态页产生重复内容。
 * 规则：固定去掉结尾斜杠，与 docusaurus.config.js 的 trailingSlash:false 保持一致。
 */
export default function SeoCanonical() {
  const { siteConfig } = useDocusaurusContext();
  const { pathname } = useLocation();

  useEffect(() => {
    const base = (siteConfig.url || '').replace(/\/+$/, '');
    const path = (pathname || '/').replace(/\/+$/, '') || '/';
    const canonical = base + path;

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }, [pathname, siteConfig.url]);

  return null;
}
