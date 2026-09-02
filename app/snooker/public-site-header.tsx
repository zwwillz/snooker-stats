"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import styles from "./public-site-header.module.css";

export type PublicNavId = "home" | "matches" | "players" | "data";
export type PublicTheme = "green" | "red";

const items: Array<{ id: PublicNavId; href: string; label: string; labelEn: string }> = [
  { id: "home", href: "/", label: "首页", labelEn: "HOME" },
  { id: "matches", href: "/?view=matches", label: "赛事", labelEn: "TOURNAMENTS" },
  { id: "players", href: "/?view=players", label: "球员", labelEn: "PLAYERS" },
  { id: "data", href: "/?view=data", label: "数据", labelEn: "DATA" },
];

export default function PublicSiteHeader({
  active = null,
  theme: controlledTheme,
  onThemeChange,
  onNavigate,
  onWarm,
}: {
  active?: PublicNavId | null;
  theme?: PublicTheme;
  onThemeChange?: (theme: PublicTheme) => void;
  onNavigate?: (view: PublicNavId) => void;
  onWarm?: (view: PublicNavId) => void;
}) {
  const [localTheme, setLocalTheme] = useState<PublicTheme>("green");
  const theme = controlledTheme ?? localTheme;

  useEffect(() => {
    if (controlledTheme) return;
    let frame = 0;
    try {
      const stored = window.localStorage.getItem("snooker-theme");
      if (stored === "green" || stored === "red") frame = window.requestAnimationFrame(() => setLocalTheme(stored));
    } catch {
      // Keep the default theme when storage is unavailable.
    }
    return () => window.cancelAnimationFrame(frame);
  }, [controlledTheme]);

  useEffect(() => {
    document.documentElement.dataset.snookerTheme = theme;
    try { window.localStorage.setItem("snooker-theme", theme); } catch { /* ignore unavailable storage */ }
  }, [theme]);

  const selectTheme = (next: PublicTheme) => {
    if (onThemeChange) onThemeChange(next);
    else setLocalTheme(next);
  };

  const navigate = (event: MouseEvent<HTMLAnchorElement>, id: PublicNavId) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(id);
  };

  return <header className={styles.header} data-public-site-header="true">
    <Link className={styles.brand} href="/" onClick={(event) => navigate(event, "home")} aria-label="返回147数据局首页">
      <span className={styles.brandMark}>S</span>
      <span className={styles.brandText}><strong>147数据局</strong><small>中文斯诺克数据平台 · CN SNOOKER STATS</small></span>
    </Link>
    <nav className={styles.nav} aria-label="主要导航">
      {items.map((item) => <Link
        aria-current={active === item.id ? "page" : undefined}
        className={active === item.id ? styles.active : ""}
        href={item.href}
        key={item.id}
        onPointerEnter={() => onWarm?.(item.id)}
        onFocus={() => onWarm?.(item.id)}
        onTouchStart={() => onWarm?.(item.id)}
        onClick={(event) => navigate(event, item.id)}
      ><span>{item.label}</span><small>{item.labelEn}</small></Link>)}
    </nav>
    <div className={styles.themeSwitch} role="group" aria-label="主题颜色">
      <button className={theme === "green" ? styles.themeActive : ""} type="button" onClick={() => selectTheme("green")} aria-pressed={theme === "green"}>绿</button>
      <button className={theme === "red" ? styles.themeActive : ""} type="button" onClick={() => selectTheme("red")} aria-pressed={theme === "red"}>红</button>
    </div>
  </header>;
}
