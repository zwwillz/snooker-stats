"use client";

import { useEffect } from "react";

type RootView = "home" | "matches" | "players" | "data";

const viewByLabel: Record<string, RootView> = {
  首页: "home",
  赛事: "matches",
  球员: "players",
  数据: "data",
};

const expectedLabels = Object.keys(viewByLabel);
const detailParams = ["player", "section", "list", "group", "metric", "honour"] as const;

function isMainNavigation(nav: HTMLElement) {
  const labels = Array.from(nav.querySelectorAll(":scope > button b"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  return expectedLabels.every((label) => labels.includes(label));
}

function notifyViewUrlChange() {
  window.dispatchEvent(new Event("snooker-view-url-change"));
}

function rootUrl(view: RootView) {
  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", view);

  if (view !== "data") detailParams.forEach((key) => url.searchParams.delete(key));
  else url.searchParams.delete("player");
  return `${url.pathname}${url.search}${url.hash}`;
}

function updateRootUrl(view: RootView) {
  const nextUrl = rootUrl(view);
  window.history.replaceState(window.history.state, "", nextUrl);
  notifyViewUrlChange();
}

export default function SnookerViewUrlSync({ serverLoadData = false }: { serverLoadData?: boolean }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const brand = target.closest("main[data-theme] > div > header:first-child > button:first-child");
      if (brand) {
        updateRootUrl("home");
        return;
      }

      const button = target.closest<HTMLButtonElement>("button");
      if (serverLoadData && button?.textContent?.replace(/\s+/g, "").includes("查看完整世界排名")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(rootUrl("data"));
        return;
      }

      const navButton = target.closest("nav button");
      const nav = navButton?.closest("nav");
      if (!navButton || !nav || !(nav instanceof HTMLElement) || !isMainNavigation(nav)) return;

      const label = navButton.querySelector("b")?.textContent?.trim() ?? "";
      const view = viewByLabel[label];
      if (!view) return;
      if (serverLoadData && view === "data") {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(rootUrl("data"));
        return;
      }
      updateRootUrl(view);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [serverLoadData]);

  return null;
}
