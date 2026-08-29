"use client";

import { useEffect, useState } from "react";
import type { HomeLeadersPayload } from "@/lib/snooker/home-leaders";
import HomeSeasonLeaders from "./home-season-leaders";
import HomeAboutCard from "./home-about-card";
import styles from "./home-extras.module.css";
import dataStyles from "./snooker-data-center.module.css";

function isRootHomepageUrl() {
  if (typeof window === "undefined") return true;
  const params = new URL(window.location.href).searchParams;
  const view = params.get("view");
  return (!view || view === "home") && !params.has("player") && !params.has("section");
}

function isHomepage() {
  return isRootHomepageUrl() && !document.querySelector(`.${dataStyles.detailShell}`);
}

export default function HomeExtras({ leaders }: { leaders: HomeLeadersPayload }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const sync = () => setVisible(isHomepage());
    const scheduleSync = () => {
      if (firstFrame || secondFrame) return;
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          sync();
        });
      });
    };
    const syncRootView = () => {
      if (!isRootHomepageUrl()) {
        setVisible(false);
        return;
      }
      scheduleSync();
    };

    scheduleSync();
    document.addEventListener("click", scheduleSync, true);
    window.addEventListener("snooker-view-url-change", syncRootView);
    window.addEventListener("popstate", syncRootView);
    return () => {
      document.removeEventListener("click", scheduleSync, true);
      window.removeEventListener("snooker-view-url-change", syncRootView);
      window.removeEventListener("popstate", syncRootView);
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  if (!visible) return null;
  return <div className={styles.wrapper} data-home-extras>
    <HomeSeasonLeaders initialPayload={leaders} />
    <HomeAboutCard />
  </div>;
}
