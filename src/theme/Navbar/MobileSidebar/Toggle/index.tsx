/**
 * 自定义汉堡菜单切换按钮：点击后先滚动到顶部，再弹出侧边栏。
 * Swizzled from @docusaurus/theme-classic Navbar/MobileSidebar/Toggle
 */
import React, { type ReactNode, useCallback } from 'react';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';
import { translate } from '@docusaurus/Translate';
import IconMenu from '@theme/Icon/Menu';

export default function MobileSidebarToggle(): ReactNode {
  const { toggle, shown } = useNavbarMobileSidebar();

  const handleClick = useCallback(() => {
    // instant 即时回到顶部（smooth 动画耗时数百毫秒，rAF 等不到结束）
    window.scrollTo({ top: 0, behavior: 'instant' });
    // 一帧后 DOM 已更新到顶部，再弹出菜单
    requestAnimationFrame(() => {
      toggle();
    });
  }, [toggle]);

  return (
    <button
      onClick={handleClick}
      aria-label={translate({
        id: 'theme.docs.sidebar.toggleSidebarButtonAriaLabel',
        message: 'Toggle navigation bar',
        description:
          'The ARIA label for hamburger menu button of mobile navigation',
      })}
      aria-expanded={shown}
      className="navbar__toggle clean-btn"
      type="button"
    >
      <IconMenu />
    </button>
  );
}
