"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";
import PublicSiteHeader from "../snooker/public-site-header";
import styles from "./about.module.css";

const RETURN_MARKER = "snooker-about-return";
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
  return <>
    <PublicSiteHeader />
    <header className={`${styles.topbar} ${styles.mobileTopbar}`}>
      <HomeAnchor className={styles.brand} ariaLabel="返回147数据局首页">
        <span className={styles.brandMark}>S</span>
        <span className={styles.brandText}>
          <strong>147数据局</strong>
          <small>中文斯诺克数据平台 · CN SNOOKER STATS</small>
        </span>
      </HomeAnchor>
      <HomeAnchor className={styles.back}>返回首页 <span aria-hidden="true">→</span></HomeAnchor>
    </header>
  </>;
}
