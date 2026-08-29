"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { findHomepagePortalTarget, findMainNav } from "./home-portal-target";
import styles from "./home-about-card.module.css";

const RETURN_MARKER = "snooker-about-return";

function rememberHomepageReturn() {
  try { window.sessionStorage.setItem(RETURN_MARKER, "home"); } catch { /* ignore unavailable storage */ }
}

function syncHomepageUpdateStatus(homeTarget: HTMLElement | null) {
  const nav = findMainNav();
  const content = nav?.previousElementSibling;
  if (!(content instanceof HTMLElement)) return;
  const status = Array.from(content.children).find((node) =>
    node instanceof HTMLElement
    && node.getAttribute("role") === "status"
    && node.textContent?.trim().startsWith("更新"),
  );
  if (status instanceof HTMLElement) status.hidden = Boolean(homeTarget);
}

export default function HomeAboutCard() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      const next = findHomepagePortalTarget();
      syncHomepageUpdateStatus(next);
      setPortalTarget((current) => current === next ? current : next);
    };
    sync();

    const mutation = new MutationObserver(sync);
    mutation.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("snooker-view-url-change", sync);
    window.addEventListener("popstate", sync);
    return () => {
      mutation.disconnect();
      window.removeEventListener("snooker-view-url-change", sync);
      window.removeEventListener("popstate", sync);
      syncHomepageUpdateStatus(null);
    };
  }, []);

  if (!portalTarget) return null;

  return createPortal(
    <aside className={styles.card} aria-label="关于147数据局">
      <div className={styles.copy}>
        <small>ABOUT</small>
        <strong>关于147数据局</strong>
        <p>因为喜欢斯诺克，所以想把它的数据认真整理下来。一个由斯诺克爱好者创建和持续维护的独立中文数据网站。</p>
      </div>
      <Link className={styles.action} href="/about" onClick={rememberHomepageReturn}>了解147数据局 <span aria-hidden="true">→</span></Link>
    </aside>,
    portalTarget,
  );
}
