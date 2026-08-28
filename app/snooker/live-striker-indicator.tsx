"use client";

import { useEffect } from "react";
import type { SnookerDashboardSnapshot, SnookerEvent, SnookerMatch } from "@/lib/snooker/domain";
import styles from "./snooker-data-center.module.css";
import dotStyles from "./live-striker-indicator.module.css";

type DashboardResponse = {
  ok?: boolean;
  snapshot?: SnookerDashboardSnapshot;
  databaseEvents?: SnookerEvent[];
};

type LivePayload = {
  snapshot: SnookerDashboardSnapshot;
  databaseEvents: SnookerEvent[];
};

const DOT_ATTR = "data-live-striker-dot";
const WINNER_ATTR = "data-frame-winner";
const STRIKER_PULSE_DURATION_MS = 1_800;

function visibleMatchIdentity() {
  const hero = document.querySelector<HTMLElement>(`.${styles.matchHero}`);
  const frameSection = document.querySelector<HTMLElement>(`.${styles.frameSection}`);
  if (!hero || !frameSection) return null;
  const eventName = hero.querySelector("h1")?.textContent?.trim() ?? "";
  const playerNames = Array.from(hero.querySelectorAll<HTMLElement>(`.${styles.versusPlayer} > strong`))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  if (!eventName || playerNames.length < 2) return null;
  return { eventName, player1Name: playerNames[0], player2Name: playerNames[1], frameSection };
}

function findVisibleMatch(payload: LivePayload, identity: NonNullable<ReturnType<typeof visibleMatchIdentity>>) {
  const playerNameById = new Map(payload.snapshot.players.map((player) => [player.id, player.nameZh]));
  const event = payload.databaseEvents.find((item) => item.nameZh === identity.eventName);
  if (!event) return null;
  return event.rounds
    .flatMap((round) => round.matches)
    .find((match) => playerNameById.get(match.player1Id) === identity.player1Name && playerNameById.get(match.player2Id) === identity.player2Name) ?? null;
}

function targetFrameRow(match: SnookerMatch, frameSection: HTMLElement) {
  const rows = Array.from(frameSection.querySelectorAll<HTMLElement>(`.${styles.frameRow}`));
  if (!rows.length) return null;
  if (match.liveFrameNo) {
    const exact = rows.find((row) => row.querySelector("b")?.textContent?.trim() === String(match.liveFrameNo));
    if (exact) return exact;
  }
  return rows.at(-1) ?? null;
}

function clearDot() {
  document.querySelectorAll<HTMLElement>(`[${DOT_ATTR}]`).forEach((node) => {
    node.parentElement?.classList.remove(dotStyles.scoreAnchor);
    node.remove();
  });
}

function clearWinnerHighlights() {
  document.querySelectorAll<HTMLElement>(`[${WINNER_ATTR}]`).forEach((node) => {
    node.classList.remove(dotStyles.frameWinnerScore);
    node.removeAttribute(WINNER_ATTR);
  });
}

function applyWinnerHighlights() {
  const hero = document.querySelector<HTMLElement>(`.${styles.matchHero}`);
  const frameSection = document.querySelector<HTMLElement>(`.${styles.frameSection}`);
  if (!hero || !frameSection) {
    clearWinnerHighlights();
    return;
  }

  const overallScore = Array.from(hero.querySelectorAll<HTMLElement>(`.${styles.bigScore} > strong > span`));
  if (overallScore.length < 2) {
    clearWinnerHighlights();
    return;
  }

  const score1 = Number(overallScore[0].textContent?.trim());
  const score2 = Number(overallScore[1].textContent?.trim());
  if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
    clearWinnerHighlights();
    return;
  }

  const completedFrameCount = score1 + score2;
  const winners = new Set<HTMLElement>();
  const rows = Array.from(frameSection.querySelectorAll<HTMLElement>(`.${styles.frameRow}`));

  for (const row of rows) {
    const frameNo = Number(row.querySelector("b")?.textContent?.trim());
    const frameScores = Array.from(row.querySelectorAll<HTMLElement>("strong"));
    if (!Number.isFinite(frameNo) || frameNo > completedFrameCount || frameScores.length < 2) continue;

    const left = Number(frameScores[0].textContent?.trim());
    const right = Number(frameScores[1].textContent?.trim());
    if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) continue;
    winners.add(left > right ? frameScores[0] : frameScores[1]);
  }

  document.querySelectorAll<HTMLElement>(`[${WINNER_ATTR}]`).forEach((node) => {
    if (!winners.has(node)) {
      node.classList.remove(dotStyles.frameWinnerScore);
      node.removeAttribute(WINNER_ATTR);
    }
  });

  winners.forEach((node) => {
    node.classList.add(dotStyles.frameWinnerScore);
    node.setAttribute(WINNER_ATTR, "true");
  });
}

function applyPulsePhase(dot: HTMLElement) {
  const phaseMs = Date.now() % STRIKER_PULSE_DURATION_MS;
  dot.style.animationDelay = `-${(phaseMs / 1000).toFixed(3)}s`;
}

function applyDot(payload: LivePayload | null) {
  const identity = visibleMatchIdentity();
  if (!identity || !payload) return;

  const match = findVisibleMatch(payload, identity);
  if (!match || match.status !== "live" || (match.currentPlayerSide !== "home" && match.currentPlayerSide !== "away")) {
    clearDot();
    return;
  }
  const row = targetFrameRow(match, identity.frameSection);
  const scores = row ? Array.from(row.querySelectorAll<HTMLElement>("strong")) : [];
  if (scores.length < 2) return;

  const side = match.currentPlayerSide;
  const target = side === "home" ? scores[0] : scores[1];
  const existing = document.querySelector<HTMLElement>(`[${DOT_ATTR}]`);
  if (existing?.parentElement === target && existing.dataset.side === side) return;

  clearDot();
  target.classList.add(dotStyles.scoreAnchor);
  const dot = document.createElement("span");
  dot.className = dotStyles.strikerDot;
  dot.setAttribute(DOT_ATTR, "true");
  dot.dataset.side = side;
  dot.setAttribute("aria-hidden", "true");
  dot.title = `${side === "home" ? identity.player1Name : identity.player2Name}正在击球`;
  applyPulsePhase(dot);
  target.append(dot);
}

export default function LiveStrikerIndicator() {
  useEffect(() => {
    let latest: LivePayload | null = null;
    let lastFetchedAt = 0;
    let fetching = false;
    let disposed = false;
    let mutationFrame = 0;

    const fetchLive = async () => {
      if (fetching || disposed) return;
      fetching = true;
      try {
        const response = await fetch("/api/snooker/v1/dashboard", { cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json() as DashboardResponse;
        if (response.ok && data.ok && data.snapshot && data.databaseEvents) {
          latest = { snapshot: data.snapshot, databaseEvents: data.databaseEvents };
          lastFetchedAt = Date.now();
          applyDot(latest);
        }
      } catch {
        // The main page already owns the user-facing fallback; keep this enhancer silent.
      } finally {
        fetching = false;
      }
    };

    const syncDom = () => {
      applyWinnerHighlights();
      const visible = visibleMatchIdentity();
      if (!visible) {
        clearDot();
        return;
      }
      if (Date.now() - lastFetchedAt > 5_000) void fetchLive();
      applyDot(latest);
    };

    const syncAfterMutation = () => {
      if (mutationFrame || disposed) return;
      mutationFrame = window.requestAnimationFrame(() => {
        mutationFrame = 0;
        if (disposed) return;
        applyWinnerHighlights();
        applyDot(latest);
      });
    };

    const observer = new MutationObserver(syncAfterMutation);
    observer.observe(document.body, { childList: true, subtree: true });

    applyWinnerHighlights();
    void fetchLive();
    const dataTimer = window.setInterval(() => {
      if (!document.hidden && visibleMatchIdentity()) void fetchLive();
    }, 30_000);
    const domTimer = window.setInterval(syncDom, 1_000);
    const onVisibility = () => {
      if (!document.hidden) {
        applyWinnerHighlights();
        if (visibleMatchIdentity()) void fetchLive();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      observer.disconnect();
      if (mutationFrame) window.cancelAnimationFrame(mutationFrame);
      window.clearInterval(dataTimer);
      window.clearInterval(domTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      clearDot();
      clearWinnerHighlights();
    };
  }, []);

  return null;
}
