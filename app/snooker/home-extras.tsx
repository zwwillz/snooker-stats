"use client";

import { useEffect, useState } from "react";
import type { HomeLeadersPayload } from "@/lib/snooker/home-leaders";
import HomeSeasonLeaders from "./home-season-leaders";
import HomeAboutCard from "./home-about-card";
import styles from "./home-extras.module.css";

function isHomepage() {
  if (typeof window === "undefined") return true;
  const view = new URL(window.location.href).searchParams.get("view");
  return !view || view === "home";
}

export default function HomeExtras({ leaders }: { leaders: HomeLeadersPayload }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(isHomepage());
    sync();
    window.addEventListener("snooker-view-url-change", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("snooker-view-url-change", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  if (!visible) return null;
  return <div className={styles.wrapper} data-home-extras>
    <HomeSeasonLeaders initialPayload={leaders} />
    <HomeAboutCard />
  </div>;
}
