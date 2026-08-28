"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HomeLeaderItem, HomeLeaderMetricKey, HomeLeadersPayload } from "@/lib/snooker/home-leaders";
import { findHomepagePortalTarget, findMainNav } from "./home-portal-target";
import styles from "./home-season-leaders.module.css";

function applyHeaderPolish() {
  const shellHeader = document.querySelector<HTMLElement>("main[data-theme] > div > header:first-child");
  if (!shellHeader) return;
  const brand = shellHeader.querySelector<HTMLButtonElement>(":scope > button:first-child");
  const title = brand?.querySelector<HTMLElement>("div > strong");
  const subtitle = brand?.querySelector<HTMLElement>("div > small");
  if (title && title.textContent !== "147数据局") title.textContent = "147数据局";
  if (subtitle && subtitle.textContent !== "中文斯诺克数据平台 · CN SNOOKER STATS") subtitle.textContent = "中文斯诺克数据平台 · CN SNOOKER STATS";

  const version = shellHeader.querySelector<HTMLElement>(":scope > div:last-child > span:first-child");
  if (version?.textContent?.includes("DATA v")) version.style.display = "none";
}

function applyHomepageEnglishLabels(content: HTMLElement | null) {
  if (!content) return;
  Array.from(content.querySelectorAll("h2")).forEach((heading) => {
    const title = heading.textContent?.trim();
    const eyebrow = heading.parentElement?.querySelector<HTMLElement>(":scope > small");
    if (!eyebrow) return;
    if (title === "世界排名" && eyebrow.textContent !== "OFFICIAL WORLD RANKING") eyebrow.textContent = "OFFICIAL WORLD RANKING";
    if (title === "中国球员" && eyebrow.textContent !== "CHINA PLAYERS") eyebrow.textContent = "CHINA PLAYERS";
  });
}

function formatValue(leader: HomeLeaderItem) {
  if (leader.value === null) return "—";
  if (leader.unit === "percent") return `${leader.value.toFixed(1)}%`;
  if (leader.unit === "seconds") return `${leader.value.toFixed(1)}s`;
  return Math.round(leader.value).toLocaleString("en-GB");
}

function captionFor(key: HomeLeaderMetricKey) {
  switch (key) {
    case "maximums": return "本赛季147";
    case "centuries": return "本赛季破百";
    case "win_rate": return "比赛胜率";
    case "shot_time": return "平均出杆时间";
  }
}

function openTechnical(key: HomeLeaderMetricKey) {
  const nav = findMainNav();
  const dataButton = Array.from(nav?.querySelectorAll<HTMLButtonElement>(":scope > button") ?? [])
    .find((button) => button.querySelector("b")?.textContent?.trim() === "数据");
  if (!dataButton) return;

  const returnState = { ...(window.history.state ?? {}), snookerReturnView: "home" };
  window.history.replaceState(returnState, "", window.location.href);

  const url = new URL(window.location.href);
  url.searchParams.set("view", "data");
  url.searchParams.delete("player");
  url.searchParams.set("section", "technical");
  url.searchParams.set("metric", key);
  url.searchParams.delete("honour");
  url.searchParams.delete("list");
  url.searchParams.delete("group");
  window.history.pushState(
    { ...returnState, snookerTechnicalDetail: key },
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  dataButton.click();
}

export default function HomeSeasonLeaders({ initialPayload }: { initialPayload: HomeLeadersPayload }) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      applyHeaderPolish();
      const next = findHomepagePortalTarget();
      applyHomepageEnglishLabels(next);
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
    };
  }, []);

  if (!portalTarget) return null;

  return createPortal(
    <section className={styles.card} aria-label="本赛季数据榜">
      <div className={styles.header}>
        <div><small>SEASON LEADERS</small><h2>本赛季数据榜</h2></div>
        <span>{initialPayload.seasonLabel || "当前赛季"}</span>
      </div>
      <div className={styles.grid}>
        {initialPayload.leaders.map((leader) => <button
          type="button"
          className={styles.item}
          onClick={() => leader.available && openTechnical(leader.key)}
          disabled={!leader.available}
          key={leader.key}
        >
          <div className={styles.copy}>
            <span className={styles.metric}>{leader.labelZh}</span>
            <div className={styles.player}>
              <strong>{leader.player?.nameZh ?? "暂无数据"}</strong>
              <small>{leader.player?.nameEn ?? leader.labelEn}</small>
            </div>
            <b className={styles.value}>{formatValue(leader)}</b>
            <small className={styles.caption}>{captionFor(leader.key)}</small>
          </div>
          {leader.player?.avatarUrl ? <img className={styles.portrait} src={leader.player.avatarUrl} alt="" loading="lazy" decoding="async" /> : null}
        </button>)}
      </div>
      <button className={styles.action} type="button" onClick={() => openTechnical("centuries")}>查看完整数据榜</button>
    </section>,
    portalTarget,
  );
}
