"use client";

import Link from "next/link";
import { useEffect, type MouseEvent, type ReactNode } from "react";
import styles from "./about.module.css";

const RETURN_MARKER = "snooker-about-return";
const websiteNav = [
  { href: "/", label: "首页", labelEn: "HOME" },
  { href: "/?view=matches", label: "赛事", labelEn: "TOURNAMENTS" },
  { href: "/?view=players", label: "球员", labelEn: "PLAYERS" },
  { href: "/?view=data", label: "数据", labelEn: "DATA" },
];

function cameFromHomepage() {
  try {
    if (window.sessionStorage.getItem(RETURN_MARKER) === "home") return true;
    if (!document.referrer) return false;
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin && referrer.pathname === "/";
  } catch {
    return false;
  }
}

function HomeAnchor({ className, ariaLabel, children }: { className: string; ariaLabel?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!cameFromHomepage() || window.history.length <= 1) return;
    event.preventDefault();
    try { window.sessionStorage.removeItem(RETURN_MARKER); } catch { /* ignore unavailable storage */ }
    window.history.back();
  };

  return <Link className={className} href="/" aria-label={ariaLabel} onClick={onClick}>{children}</Link>;
}

export default function AboutChrome() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("snooker-theme");
      if (stored === "green" || stored === "red") document.documentElement.dataset.snookerTheme = stored;
    } catch {
      // Keep the default green theme when storage is unavailable.
    }
  }, []);

  return (
    <header className={styles.topbar}>
      <HomeAnchor className={styles.brand} ariaLabel="返回147数据局首页">
        <span className={styles.brandMark}>S</span>
        <span className={styles.brandText}>
          <strong>147数据局</strong>
          <small>中文斯诺克数据平台 · CN SNOOKER STATS</small>
        </span>
      </HomeAnchor>
      <nav className={styles.desktopNav} aria-label="主要导航">
        {websiteNav.map((item) => <Link href={item.href} key={item.href}><span>{item.label}</span><small>{item.labelEn}</small></Link>)}
      </nav>
      <HomeAnchor className={styles.back}>返回首页 <span aria-hidden="true">→</span></HomeAnchor>
    </header>
  );
}
