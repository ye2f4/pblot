import React from "react";
import clsx from "clsx";
import { ThemeClassNames } from "@docusaurus/theme-common";
import { useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";

export default function NavbarMobileSidebarLayout({
  header,
  primaryMenu,
  secondaryMenu,
}: {
  header: React.ReactNode;
  primaryMenu: React.ReactNode;
  secondaryMenu: React.ReactNode;
}): React.ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  return (
    <>
      {/* 全屏遮罩：阻止页面内容穿透、点击可关闭 sidebar */}
      {mobileSidebar.shown && (
        <div
          className="navbar-sidebar__backdrop"
          role="button"
          aria-label="关闭导航菜单"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            mobileSidebar.toggle();
          }}
        />
      )}
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.mobileSidebar.container,
          "navbar-sidebar",
        )}
      >
        {header}
        <div className="navbar-sidebar__items">
          <div
            className={clsx(
              ThemeClassNames.layout.navbar.mobileSidebar.panel,
              "navbar-sidebar__item menu",
            )}
          >
            {primaryMenu}
          </div>
        </div>
      </div>
    </>
  );
}

