"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./home-about-card.module.css";

const navLabels = ["首页", "赛事", "球员", "数据"];
const RETURN_MARKER = "snooker-about-return";

function isMainNav(nav: Element) {
  const labels = Array.from(nav.querySelectorAll(":scope > button b"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  return navLabels.every((label) => labels.includes(label));
}

function findContentTarget() {
  const nav = Array.from(document.querySelectorAll("nav")).find(isMainNav) ?? null;
  const content = nav?.previousElementSibling;
  return content instanceof HTMLElement ? content : null;
}

function isHomeUrl() {
  const view = new URL(window.location.href).searchParams.get("view");
  return !view || view === "home";
}

function rememberHomepageReturn() {
  try { window.sessionStorage.setItem(RETURN_MARKER, "home"); } catch { /* ignore unavailable storage */ }
}

export default function HomeAboutCard() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [homeActive, setHomeActive] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPortalTarget((current) => {
        const next = findContentTarget();
        return current === next ? current : next;
      });
      setHomeActive(isHomeUrl());
    };
    sync();

    const mutation = new MutationObserver(() => {
      setPortalTarget((current) => {
        const next = findContentTarget();
        return current === next ? current : next;
      });
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("snooker-view-url-change", sync);
    window.addEventListener("popstate", sync);
    return () => {
      mutation.disconnect();
      window.removeEventListener("snooker-view-url-change", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  if (!portalTarget || !homeActive) return null;

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
