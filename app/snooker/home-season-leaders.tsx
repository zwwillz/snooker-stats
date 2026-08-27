"use client";

import { useEffect, useRef, useState } from "react";
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

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function isMainNav(nav: Element) {
  const labels = Array.from(nav.querySelectorAll(":scope > button b"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  return navLabels.every((label) => labels.includes(label));
}

function findContentTarget() {
  const nav = Array.from(document.querySelectorAll("nav")).find(isMainNav);
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

export default function HomeSeasonLeaders() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [homeActive, setHomeActive] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [payload, setPayload] = useState<HomeLeadersResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      applyHeaderPolish();
      setPortalTarget((current) => {
        const next = findContentTarget();
        return current === next ? current : next;
      });
      setHomeActive(isHomeUrl());
    };

    sync();
    const mutation = new MutationObserver(sync);
    mutation.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onNavClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("nav button");
      const nav = button?.closest("nav");
      if (!button || !nav || !isMainNav(nav)) return;
      const label = button.querySelector("b")?.textContent?.trim();
      setHomeActive(label === "首页");
      window.requestAnimationFrame(sync);
    };
    const onPopState = () => window.requestAnimationFrame(sync);

    document.addEventListener("click", onNavClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      mutation.disconnect();
      document.removeEventListener("click", onNavClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!homeActive || !portalTarget || shouldLoad || payload || failed) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "520px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [homeActive, portalTarget, shouldLoad, payload, failed]);

  useEffect(() => {
    if (!shouldLoad || payload || failed) return;
    const controller = new AbortController();
    void fetch("/api/snooker/v1/home-leaders", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<HomeLeadersResponse>;
      })
      .then((data) => {
        if (!data?.ok || !data.leaders || data.leaders.length < 4) {
          setFailed(true);
          return;
        }
        setPayload(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [shouldLoad, payload, failed]);

  if (!portalTarget || !homeActive || failed) return null;

  if (!payload) {
    return createPortal(
      <div className={styles.sentinel} ref={sentinelRef}>
        {shouldLoad ? <section className={`${styles.card} ${styles.loadingCard}`} aria-label="加载本赛季数据榜">
          <div className={styles.loadingHeader} />
          <div className={styles.loadingGrid}>{[0, 1, 2, 3].map((index) => <span key={index} />)}</div>
        </section> : null}
      </div>,
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
        {payload.leaders!.slice(0, 4).map((leader) => <a className={styles.item} href={`?view=data&section=technical&metric=${encodeURIComponent(leader.key)}`} key={leader.key}>
          <span className={styles.metric}>{leader.labelZh}</span>
          <div className={styles.player}>
            <span className={styles.avatar}>{leader.player.avatarUrl ? <img src={leader.player.avatarUrl} alt="" loading="lazy" decoding="async" /> : initials(leader.player.nameEn)}</span>
            <strong>{leader.player.nameZh}</strong>
          </div>
          <b className={styles.value}>{formatValue(leader)}</b>
          <small className={styles.caption}>{captionFor(leader.key)}</small>
        </a>)}
      </div>
      <a className={styles.action} href="?view=data&section=technical&metric=centuries">查看完整数据榜 <span>›</span></a>
    </section>,
    portalTarget,
  );
}
