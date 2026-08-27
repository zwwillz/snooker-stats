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

function updateRootUrl(view: RootView) {
  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", view);

  if (view !== "data") detailParams.forEach((key) => url.searchParams.delete(key));
  else url.searchParams.delete("player");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
  notifyViewUrlChange();
}

export default function SnookerViewUrlSync() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const brand = target.closest("main[data-theme] > div > header:first-child > button:first-child");
      if (brand) {
        updateRootUrl("home");
        return;
      }

      const button = target.closest("nav button");
      const nav = button?.closest("nav");
      if (!button || !nav || !(nav instanceof HTMLElement) || !isMainNavigation(nav)) return;

      const label = button.querySelector("b")?.textContent?.trim() ?? "";
      const view = viewByLabel[label];
      if (!view) return;
      updateRootUrl(view);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
