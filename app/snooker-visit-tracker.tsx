"use client";

import { useEffect } from "react";
import type { VisitorGeoPayload } from "@/lib/snooker/visitor";

const VISITOR_KEY = "snooker_stats_visitor_v1";
const GEO_KEY = "snooker_stats_geo_v1";
const EXCLUDED_PREFIXES = ["/api", "/snooker/site-monitor", "/snooker/data-ops"];

function createVisitorId() {
  try {
    const current = window.localStorage.getItem(VISITOR_KEY);
    if (current && /^[a-zA-Z0-9._-]{8,80}$/.test(current)) return current;
    const next = globalThis.crypto?.randomUUID?.() || `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function excludedPath(pathname: string) {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function loadGeo(): Promise<VisitorGeoPayload> {
  try {
    const cached = window.sessionStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached) as VisitorGeoPayload;
    const response = await fetch("/api/visitor-geo", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return {};
    const data = await response.json() as VisitorGeoPayload;
    window.sessionStorage.setItem(GEO_KEY, JSON.stringify(data));
    return data;
  } catch {
    return {};
  }
}

function text(element: Element | null) {
  return element?.textContent?.trim() || "";
}

function currentPageContext() {
  const pathname = window.location.pathname;
  const main = document.querySelector("main");
  const headerStrong = text(main?.querySelector("header strong") ?? null);
  const h1Values = Array.from(main?.querySelectorAll("h1") ?? []).map((item) => text(item)).filter(Boolean);
  const directoryHeading = h1Values.find((value) => value === "赛事" || value === "球员" || value === "数据");
  let pageLabel = "147数据局 · 首页";
  let eventLabel = "";

  if (headerStrong === "比赛详情") {
    eventLabel = h1Values[0] || "";
    pageLabel = "147数据局 · 比赛详情";
  } else if (headerStrong === "球员详情") {
    const playerName = h1Values[0] || "";
    pageLabel = `147数据局 · 球员详情${playerName ? ` · ${playerName}` : ""}`;
  } else if (headerStrong && headerStrong !== "世界斯诺克数据中心") {
    eventLabel = headerStrong;
    pageLabel = `147数据局 · 赛事 · ${headerStrong}`;
  } else if (directoryHeading) {
    pageLabel = `147数据局 · ${directoryHeading}`;
  }

  return {
    path: `${pathname}${window.location.search}`,
    pageLabel,
    eventLabel,
    key: `${pathname}|${window.location.search}|${pageLabel}|${eventLabel}`,
  };
}

export default function SnookerVisitTracker() {
  useEffect(() => {
    if (excludedPath(window.location.pathname)) return;

    const visitorId = createVisitorId();
    const geoPromise = loadGeo();
    let lastKey = "";
    let lastTrackedAt = 0;
    let timer = 0;

    const track = () => {
      if (excludedPath(window.location.pathname)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const context = currentPageContext();
        const now = Date.now();
        if (context.key === lastKey && now - lastTrackedAt < 20_000) return;
        lastKey = context.key;
        lastTrackedAt = now;
        const geo = await geoPromise;
        void fetch("/api/snooker/v1/visit", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, ...context, referrer: document.referrer || "", geo }),
        }).catch(() => undefined);
      }, 120);
    };

    const observer = new MutationObserver(track);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("popstate", track);
    timer = window.setTimeout(track, 500);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("popstate", track);
    };
  }, []);

  return null;
}
