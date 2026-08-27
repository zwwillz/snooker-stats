"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";
import styles from "./home-season-leaders.module.css";

type LeaderUnit = "count" | "percent" | "seconds" | "points";

type HomeLeader = {
  key: SnookerTechnicalMetricKey;
  labelZh: string;
  labelEn: string;
  value: number;
  unit: LeaderUnit;
  player: {
    id: string;
    slug: string;
    nameZh: string;
    nameEn: string;
    avatarUrl: string | null;
    currentRank: number | null;
  };
};

type HomeLeadersResponse = {
  ok?: boolean;
  seasonLabel?: string;
  leaders?: HomeLeader[];
};

const navLabels = ["首页", "赛事", "球员", "数据"];
let homeLeadersCache: HomeLeadersResponse | null = null;
let homeLeadersInflight: Promise<HomeLeadersResponse | null> | null = null;
let technicalWarmInflight: Promise<void> | null = null;

function isMainNav(nav: Element) {
  const labels = Array.from(nav.querySelectorAll(":scope > button b"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  return navLabels.every((label) => labels.includes(label));
}

function findMainNav() {
  return Array.from(document.querySelectorAll("nav")).find(isMainNav) ?? null;
}

function findContentTarget() {
  const nav = findMainNav();
  const content = nav?.previousElementSibling;
  return content instanceof HTMLElement ? content : null;
}

function isHomeUrl() {
  const view = new URL(window.location.href).searchParams.get("view");
  return !view || view === "home";
}

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

async function loadHomeLeadersClient() {
  if (homeLeadersCache) return homeLeadersCache;
  if (homeLeadersInflight) return homeLeadersInflight;
  homeLeadersInflight = fetch("/api/snooker/v1/home-leaders", { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as HomeLeadersResponse;
      if (data.ok && data.leaders && data.leaders.length >= 4) homeLeadersCache = data;
      return data.ok ? data : null;
    })
    .catch(() => null)
    .finally(() => { homeLeadersInflight = null; });
  return homeLeadersInflight;
}

function warmTechnicalHub() {
  if (technicalWarmInflight) return technicalWarmInflight;
  technicalWarmInflight = fetch("/api/snooker/v1/technical", { headers: { Accept: "application/json" } })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => { technicalWarmInflight = null; });
  return technicalWarmInflight;
}

function formatValue(leader: HomeLeader) {
  if (leader.unit === "percent") return `${leader.value.toFixed(1)}%`;
  if (leader.unit === "seconds") return `${leader.value.toFixed(1)}s`;
  if (leader.unit === "points") return Math.round(leader.value).toLocaleString("en-GB");
  return Math.round(leader.value).toLocaleString("en-GB");
}

function captionFor(key: SnookerTechnicalMetricKey) {
  switch (key) {
    case "centuries": return "本赛季破百";
    case "win_rate": return "比赛胜率";
    case "matches_won": return "本赛季胜场";
    case "maximums": return "本赛季147";
    case "highest_break": return "本赛季最高单杆";
    case "points_scored": return "本赛季总得分";
    case "fifties": return "本赛季50+";
    case "average_break": return "本赛季平均单杆";
    default: return "本赛季数据";
  }
}

function openTechnical(key: SnookerTechnicalMetricKey) {
  void warmTechnicalHub();
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

export default function HomeSeasonLeaders() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [homeActive, setHomeActive] = useState(false);
  const [payload, setPayload] = useState<HomeLeadersResponse | null>(() => homeLeadersCache);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const sync = () => {
      applyHeaderPolish();
      const next = findContentTarget();
      applyHomepageEnglishLabels(next);
      setPortalTarget((current) => current === next ? current : next);
      setHomeActive(isHomeUrl());
    };

    sync();
    const mutation = new MutationObserver(() => {
      applyHeaderPolish();
      const next = findContentTarget();
      applyHomepageEnglishLabels(next);
      setPortalTarget((current) => current === next ? current : next);
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    const onRouteChange = () => sync();
    const onPopState = () => sync();
    window.addEventListener("snooker-view-url-change", onRouteChange);
    window.addEventListener("popstate", onPopState);
    return () => {
      mutation.disconnect();
      window.removeEventListener("snooker-view-url-change", onRouteChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!homeActive || payload) return;
    let cancelled = false;
    void warmTechnicalHub();
    void loadHomeLeadersClient().then((data) => {
      if (cancelled) return;
      if (data?.ok && data.leaders && data.leaders.length >= 4) {
        setPayload(data);
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) setRetryKey((value) => value + 1);
      }, Math.min(2500 + retryKey * 1000, 8000));
    });
    return () => { cancelled = true; };
  }, [homeActive, payload, retryKey]);

  if (!portalTarget || !homeActive) return null;

  if (!payload) {
    return createPortal(
      <section className={`${styles.card} ${styles.loadingCard}`} aria-label="加载本赛季数据榜">
        <div className={styles.loadingHeader} />
        <div className={styles.loadingGrid}>{[0, 1, 2, 3].map((index) => <span key={index} />)}</div>
      </section>,
      portalTarget,
    );
  }

  return createPortal(
    <section className={styles.card} aria-label="本赛季数据榜">
      <div className={styles.header}>
        <div><small>SEASON LEADERS</small><h2>本赛季数据榜</h2></div>
        <span>{payload.seasonLabel ?? "当前赛季"}</span>
      </div>
      <div className={styles.grid}>
        {payload.leaders!.slice(0, 4).map((leader) => <button type="button" className={styles.item} onClick={() => openTechnical(leader.key)} key={leader.key}>
          <div className={styles.copy}>
            <span className={styles.metric}>{leader.labelZh}</span>
            <div className={styles.player}>
              <strong>{leader.player.nameZh}</strong>
              <small>{leader.player.nameEn}</small>
            </div>
            <b className={styles.value}>{formatValue(leader)}</b>
            <small className={styles.caption}>{captionFor(leader.key)}</small>
          </div>
          {leader.player.avatarUrl ? <img className={styles.portrait} src={leader.player.avatarUrl} alt="" loading="lazy" decoding="async" /> : null}
        </button>)}
      </div>
      <button className={styles.action} type="button" onClick={() => openTechnical("centuries")}>查看完整数据榜 <span>›</span></button>
    </section>,
    portalTarget,
  );
}
