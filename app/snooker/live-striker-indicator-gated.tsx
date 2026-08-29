"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import styles from "./snooker-data-center.module.css";

const LiveStrikerIndicator = dynamic(() => import("./live-striker-indicator"));

function matchDetailVisible() {
  return Boolean(
    document.querySelector(`.${styles.matchHero}`)
    && document.querySelector(`.${styles.frameSection}`),
  );
}

export default function LiveStrikerIndicatorGated() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const sync = () => setActive((current) => {
      const next = matchDetailVisible();
      return current === next ? current : next;
    });
    const schedule = () => {
      if (firstFrame || secondFrame) return;
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          sync();
        });
      });
    };

    sync();
    document.addEventListener("click", schedule, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("snooker-view-url-change", schedule);
    return () => {
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("snooker-view-url-change", schedule);
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return active ? <LiveStrikerIndicator /> : null;
}
