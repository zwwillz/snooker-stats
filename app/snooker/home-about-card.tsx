"use client";

import Link from "next/link";
import styles from "./home-about-card.module.css";

const RETURN_MARKER = "snooker-about-return";

function rememberHomepageReturn() {
  try { window.sessionStorage.setItem(RETURN_MARKER, "home"); } catch { /* ignore unavailable storage */ }
}

export default function HomeAboutCard() {
  return <aside className={styles.card} aria-label="关于147数据局">
    <div className={styles.copy}>
      <small>ABOUT</small>
      <strong>关于147数据局</strong>
      <p>因为喜欢斯诺克，所以想把它的数据认真整理下来。一个由斯诺克爱好者创建和持续维护的独立中文数据网站。</p>
    </div>
    <Link className={styles.action} href="/about" prefetch={false} onClick={rememberHomepageReturn}>了解147数据局 <span aria-hidden="true">→</span></Link>
  </aside>;
}
