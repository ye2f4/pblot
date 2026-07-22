import type React from 'react';

/** 导航项：普通项用 to(内部) 或 href(外链)，下拉项用 type:'dropdown' + items */
export interface NavItem {
  label: string;
  to?: string;
  href?: string;
  position?: 'left' | 'right';
  className?: string;
  title?: string;
  type?: 'dropdown';
  items?: NavItem[];
}

/** 页脚列 */
export interface FooterCol {
  title: string;
  items: { label: string; to?: string; href?: string }[];
}

/**
 * 共享组件通过此接口渲染链接，由宿主框架提供实现。
 * - 外链（href 存在）渲染 <a>
 * - 内部链接（to 存在）渲染框架 Router Link
 */
export interface LinkComponentProps {
  to?: string;
  href?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}
export type LinkComponent = React.ComponentType<LinkComponentProps>;

/** 框架专属插槽（搜索、暗色切换、登录态等），共享组件不感知框架 API */
export interface SiteHeaderSlots {
  search?: React.ReactNode;
  colorMode?: React.ReactNode;
  auth?: React.ReactNode;
  /** 语言切换（主站用 Docusaurus LocaleDropdown，/app 用 AppLocaleToggle），保证两端位置一致 */
  locale?: React.ReactNode;
  right?: React.ReactNode;
}

export interface SiteHeaderProps {
  brand: { title: string; href: string; className?: string };
  items: NavItem[];
  linkComponent: LinkComponent;
  /** 当前路径（已适配到与 item.to 同一命名空间），用于 active 判定 */
  pathname: string;
  hideOnScroll?: boolean;
  slots?: SiteHeaderSlots;
}

export interface SiteFooterProps {
  columns: FooterCol[];
  copyright?: string;
  /** 备案号链接（如萌ICP备），渲染在版权下方 */
  beian?: { href: string; label: string };
  linkComponent: LinkComponent;
  brand?: { title: string; href: string };
}
