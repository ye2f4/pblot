import React, { useState, useCallback } from "react";
import Link from "@docusaurus/Link";
import { useThemeConfig } from "@docusaurus/theme-common";
import type { NavbarItem } from "@docusaurus/theme-common/lib/utils/useThemeConfig";
import { useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";

export default function PrimaryMenu(): React.ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const { navbar } = useThemeConfig();
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);

  const navItems = navbar.items.filter(
    (item: NavbarItem) =>
      item.type !== "localeDropdown" && item.type !== "search",
  );

// 为导航项匹配图标
const getNavIcon = (label: string) => {
  const map: Record<string, string> = {
    博客: '📝',
    文章: '📖',
    资源: '📚',
    工具箱: '🧰',
    关于: 'ℹ️',
    更多: '⋯',
    聊天: '💬',
    GitHub: '🔗',
  };
  return map[label] || '';
};

// 为子项匹配小图标
const getSubIcon = (label: string) => {
  const map: Record<string, string> = {
    资料下载: '📥',
    开源项目: '🚀',
    开发工具: '🔧',
    硬件监控: '💻',
    代码片段: '💡',
    PCB元器件: '📦',
    时光胶囊: '🕐',
    排行榜: '🏆',
    更新日志: '📋',
    系列项目: '✨',
    隐私政策: '🔒',
    用户协议: '📄',
    'RSS订阅': '📡',
  };
  return map[label] || '•';
};

  // 点击下拉菜单项时，使用内联展开/收起（不依赖不稳定的 Docusaurus 内部 API）
  const handleDropdownClick = useCallback((item: NavbarItem) => {
    const label = item.label as string;
    setExpandedDropdown(prev => prev === label ? null : label);
  }, []);

  // 渲染单个导航项：下拉类型展开二级菜单，普通链接直接跳转
  const renderItem = (item: NavbarItem) => {
    const isDropdownWithItems =
      item.type === "dropdown" && Array.isArray(item.items) && item.items.length > 0;

    if (isDropdownWithItems) {
      const label = item.label as string;
      const isExpanded = expandedDropdown === label;
      const subItems = (item.items || []) as NavbarItem[];

        return (
        <li key={label} className="menu__list-item mobile-nav-dropdown">
          <button
            className="menu__link mobile-nav-dropdown__toggle"
            type="button"
            onClick={() => handleDropdownClick(item)}
          >
            <span className="mobile-nav-item__icon">{getNavIcon(label)}</span>
            <span className="mobile-nav-item__label">{label}</span>
            <span
              className="mobile-nav-dropdown__arrow"
              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              ▶
            </span>
          </button>
          {/* 降级模式：内联展开子菜单 */}
          {isExpanded && (
            <ul className="menu__list mobile-nav-submenu">
              {subItems
                .filter((si) => si.label && (si.to || si.href))
                .map((si) => (
                  <li key={si.label as string} className="menu__list-item mobile-nav-submenu__item">
                    <Link
                      className="menu__link mobile-nav-submenu__link"
                      to={(si as any).to ?? si.href ?? ""}
                      onClick={() => mobileSidebar.toggle()}
                    >
                      <span className="mobile-nav-submenu__dot">{getSubIcon(si.label as string)}</span>
                      <span>{si.label}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </li>
      );
    }

    // 嵌套在 dropdown 内的子项（如 Navbar 中 dropdown 的子项）
    if (item.to || item.href) {
      return (
        <li key={item.label as string} className="menu__list-item mobile-nav-item">
          <Link
            className="menu__link mobile-nav-item__link"
            to={(item as any).to ?? item.href ?? ""}
            onClick={() => mobileSidebar.toggle()}
          >
            <span className="mobile-nav-item__icon">{getNavIcon(item.label as string)}</span>
            <span className="mobile-nav-item__label">{item.label}</span>
            {item.href && (
              <span className="mobile-nav-item__external">↗</span>
            )}
          </Link>
        </li>
      );
    }

    return null;
  };

  return (
    <>
      <div className="mobile-nav-section-title">
        <span className="mobile-nav-section-title__icon">📍</span>
        <span>导航</span>
        <span className="mobile-nav-section-title__line" />
      </div>
      <ul className="menu__list mobile-nav-menu">
        {navItems.map(renderItem)}
      </ul>
    </>
  );
}

