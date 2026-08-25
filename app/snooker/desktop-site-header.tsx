"use client";

import type { ReactNode } from "react";

type DesktopView = "home" | "matches" | "players" | "data";

const navItems: Array<{ id: DesktopView; label: string; href: string }> = [
  { id: "home", label: "首页", href: "/" },
  { id: "matches", label: "赛事", href: "/?view=matches" },
  { id: "players", label: "球员", href: "/?view=players" },
  { id: "data", label: "数据", href: "/?view=data" },
];

export default function DesktopSiteHeader({ activeView }: { activeView: DesktopView }) {
  return (
    <header className="desktopSiteHeader">
      <div className="desktopSiteHeaderInner">
        <a className="desktopSiteBrand" href="/" aria-label="返回147数据局首页">
          <span className="desktopSiteBrandMark">S</span>
          <span className="desktopSiteBrandCopy">
            <strong>世界斯诺克数据中心</strong>
            <small>WORLD SNOOKER DATA</small>
          </span>
        </a>

        <nav className="desktopSiteNav" aria-label="主导航">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={activeView === item.id ? "page" : undefined}
              className={activeView === item.id ? "desktopSiteNavActive" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="desktopSiteMeta" aria-label="站点信息">
          <span>147数据局</span>
          <small>专业斯诺克数据</small>
        </div>
      </div>
    </header>
  );
}
