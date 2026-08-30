"use client";

import { useEffect, useState } from "react";
import LiveStrikerIndicator from "./live-striker-indicator";
import styles from "./snooker-data-center.module.css";

function matchDetailVisible() {
  return Boolean(
    document.querySelector(`.${styles.matchHero}`)
    && document.querySelector(`.${styles.frameSection}`),
  );
}

export default function LiveStrikerIndicatorGated() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setActive((current) => {
          const next = matchDetailVisible();
          return current === next ? current : next;
        });
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", sync);
    window.addEventListener("snooker-view-url-change", sync);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("snooker-view-url-change", sync);
    };
  }, []);

  return active ? <LiveStrikerIndicator /> : null;
}
