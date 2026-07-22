import siteData from '../../../src/data/siteData.json';

const SITE_URL = (siteData.siteUrl || '').replace(/\/$/, '');

export interface AppNavItem {
  label?: string;
  to?: string;
  href?: string;
  position?: 'left' | 'right';
  className?: string;
  title?: string;
  type?: 'dropdown';
  items?: AppNavItem[];
}

export interface AppFooterCol {
  title?: string;
  items?: AppNavItem[];
}

/**
 * 把 Docusaurus 配置的链接解析到 next-app 命名空间（逻辑与主站 DLink 相反）：
 * - 外链（http/https）保持不变；
 * - /app/* 站内链接：剥离 /app 前缀，交 next/link 的 basePath 重新补回 /app；
 * - 主站路由（/blog/、/docs/ 等）：改为主站绝对外链，避免 next-app 下 404。
 */
export function transformToAppLink(item: AppNavItem): AppNavItem {
  const out: AppNavItem = { ...item };

  if (item.href) {
    out.href = item.href;
    delete out.to;
  } else if (item.to) {
    if (item.to.startsWith('/app/')) {
      out.to = item.to.slice('/app'.length) || '/';
      delete out.href;
    } else {
      out.href = SITE_URL + item.to;
      delete out.to;
    }
  }

  if (item.items && item.items.length) {
    out.items = item.items.map(transformToAppLink);
  }

  return out;
}

export function transformNavItems(items: AppNavItem[] = []): AppNavItem[] {
  return items.map(transformToAppLink);
}

export function transformFooterColumns(
  columns: AppFooterCol[] = [],
): AppFooterCol[] {
  return columns.map((col) => ({
    ...col,
    items: (col.items || []).map(transformToAppLink),
  }));
}
