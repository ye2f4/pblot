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
        <li key={label} className="menu__list-item">
          <button
            className="menu__link"
            type="button"
            style={{
              background: "none",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "inherit",
              fontFamily: "inherit",
              padding: "var(--ifm-menu-link-padding-vertical) var(--ifm-menu-link-padding-horizontal)",
              color: "var(--ifm-menu-color)",
              borderRadius: "var(--ifm-global-radius)",
              lineHeight: "var(--ifm-menu-link-padding-vertical)",
            }}
            onClick={() => handleDropdownClick(item)}
          >
            <span>{label}</span>
            <span style={{ fontSize: "1.2em", opacity: 0.5, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              ›
            </span>
          </button>
          {/* 降级模式：内联展开子菜单 */}
          {isExpanded && (
            <ul className="menu__list" style={{ paddingLeft: "12px" }}>
              {subItems
                .filter((si) => si.label && (si.to || si.href))
                .map((si) => (
                  <li key={si.label as string} className="menu__list-item">
                    <Link
                      className="menu__link"
                      to={(si as any).to ?? si.href ?? ""}
                      onClick={() => mobileSidebar.toggle()}
                    >
                      {si.label}
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
        <li key={item.label as string} className="menu__list-item">
          <Link
            className="menu__link"
            to={(item as any).to ?? item.href ?? ""}
            onClick={() => mobileSidebar.toggle()}
          >
            {item.label}
          </Link>
        </li>
      );
    }

    return null;
  };

  return (
    <>
      <div className="mt-2 border-t border-[var(--ifm-toc-border-color)] px-[var(--ifm-menu-link-padding-horizontal)] pt-3 text-md font-bold uppercase tracking-wide text-[var(--ifm-color-emphasis-600)]">
        Navigation
      </div>
      <ul className="menu__list">
        {navItems.map(renderItem)}
      </ul>
    </>
  );
}

