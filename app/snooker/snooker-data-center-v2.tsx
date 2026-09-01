"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  PlayerEventStats,
  SnookerCalendarEvent,
  SnookerDashboardSnapshot,
  SnookerEvent,
  SnookerEventPlayerStats,
  SnookerHeadToHeadMeeting,
  SnookerMatch,
  SnookerMatchPlayerStatistics,
  SnookerPlayer,
  SnookerSeasonStatistics,
} from "@/lib/snooker/domain";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";
import type { HomeLeaderMetricKey, HomeLeadersPayload } from "@/lib/snooker/home-leaders";
import type { SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";
import { CURRENT_RANKING_KEYS, type SnookerCurrentRankingKey, type SnookerRankingHub, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";
import PlayerCompareTeaser from "./compare/player-compare-teaser";
import type { PlayerFilter } from "./players/player-directory";
import HomeSeasonLeaders from "./home-season-leaders";
import HomeAboutCard from "./home-about-card";

const loadDataContentModule = () => import("./data/data-ranking-content");
const loadPlayerDirectoryModule = () => import("./players/player-directory");

const DataHubContent = dynamic(() => loadDataContentModule().then((module) => module.DataHubContent), {
  loading: () => <RootViewLoading view="data" />,
});
const RankingDetailContent = dynamic(() => loadDataContentModule().then((module) => module.RankingDetailContent), {
  loading: () => <section className={styles.card}><div className={styles.emptyState}>正在加载排名数据…</div></section>,
});
const PlayerDirectoryContent = dynamic(() => loadPlayerDirectoryModule().then((module) => module.PlayerDirectoryContent), {
  loading: () => <RootViewLoading view="players" />,
});
const PlayerDetailInline = dynamic(() => import("./players/player-detail-inline"), {
  loading: () => <section className={styles.card}><div className={styles.emptyState}>正在加载球员资料…</div></section>,
});
import { prefetchPlayerDetail, prefetchPlayerExperience } from "./players/player-detail-client";
import { eventDetailTypeLabel, isQualificationEvent } from "@/lib/snooker/taxonomy";
import {
  COMPLETED_PROTECTION_MS,
  UPCOMING_PREHEAT_MS,
  matchDisplayStatus,
  mergeEventSnapshotsMonotonic,
  resolveCompletedAt,
  selectHomepageHeadlineMatches,
} from "@/lib/snooker/live-client";
import { dbMatchUuid, mergeHomeLiveEvent, type HomeLiveMatchRow } from "@/lib/snooker/home-live-overlay";
import styles from "./snooker-data-center.module.css";
import priority from "./snooker-priority.module.css";
import insight from "./snooker-insights.module.css";
import polish from "./snooker-ui-polish.module.css";
import liveIndicator from "./live-striker-indicator.module.css";
import shell from "./root-view-shell.module.css";

type MainView = "home" | "matches" | "players" | "data";
type NavId = MainView;
type Theme = "green" | "red";
type EventTab = "overview" | "schedule" | "data";
type EventListMode = "recent" | "calendar";
type MatchDataTab = "match" | "season" | "h2h";
type DetailState =
  | { type: "event"; slug: string; tab: EventTab }
  | { type: "match"; matchId: string; eventSlug: string }
  | { type: "player"; slug: string; returnView: MainView }
  | { type: "ranking"; section: SnookerRankingSection; key: SnookerCurrentRankingKey };

type MatchReturnState =
  | { kind: "event"; slug: string; tab: EventTab; scrollY: number }
  | { kind: "root"; view: MainView; scrollY: number };

type SourceHealth = {
  online: boolean;
  accepted: boolean;
  fetchedAt: string;
  message: string;
  sourceLabel?: string;
  cacheSeconds?: number;
};

type HomeLiveResponse = {
  ok?: boolean;
  matches?: HomeLiveMatchRow[];
  fetchedAt?: string;
};

type MatchDetailResponse = {
  ok?: boolean;
  match?: Partial<SnookerMatch> & { id: string };
  players?: SnookerPlayer[];
  fetchedAt?: string;
};

type CalendarResponse = {
  ok?: boolean;
  calendar?: SnookerCalendarEvent[];
};

type PlayerDirectoryPageResponse = {
  ok?: boolean;
  players?: SnookerPlayerListItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type SnookerHistoryState = {
  snookerView?: MainView;
  snookerOrigin?: boolean;
  snookerReturnView?: MainView;
  snookerReturnDetail?: DetailState | null;
  snookerPlayerDetail?: string;
  snookerRankingDetail?: boolean;
  snookerTechnicalDetail?: string;
};

const navItems: Array<{ id: NavId; label: string; labelEn: string; icon: string }> = [
  { id: "home", label: "首页", labelEn: "HOME", icon: "⌂" },
  { id: "matches", label: "赛事", labelEn: "TOURNAMENTS", icon: "◫" },
  { id: "players", label: "球员", labelEn: "PLAYERS", icon: "◎" },
  { id: "data", label: "数据", labelEn: "DATA", icon: "▥" },
];

const rootDetailParams = ["player", "section", "list", "group", "metric", "honour"] as const;

function RootViewLoading({ view, failed = false, onRetry }: { view: "players" | "data"; failed?: boolean; onRetry?: () => void }) {
  const isPlayers = view === "players";
  return <>
    <section className={styles.pageIntro}>
      <small>{isPlayers ? "PLAYER DATABASE" : "DATA CENTER"}</small>
      <h1>{isPlayers ? "球员" : "数据"}</h1>
      <p>{isPlayers ? "职业球员资料与排名信息。" : "世界斯诺克排名、赛季表现与历史纪录的数据入口。"}</p>
    </section>
    {isPlayers ? <>
      <div className={shell.playerToolbar} aria-hidden="true"><i /><span /><span /><span /><span /></div>
      <section className={`${styles.card} ${shell.shellCard}`} aria-busy={!failed}>
        <div className={shell.shellSummary}><span>按官方世界排名排列</span><b>{failed ? "加载失败" : "正在准备首屏球员"}</b></div>
        <div className={shell.rows}>{Array.from({ length: 7 }, (_, index) => <div className={shell.row} key={index}><i /><span><b /><small /></span><em /></div>)}</div>
        {failed && onRetry ? <button className={styles.fullButton} onClick={onRetry}>重新加载</button> : null}
      </section>
    </> : <>
      <section className={`${styles.card} ${shell.dataCard}`} aria-busy={!failed}>
        <div className={shell.dataHeading}><span /><b /></div><div className={shell.dataPanel} />
      </section>
      <section className={`${styles.card} ${shell.dataCard}`} aria-busy={!failed}>
        <div className={shell.dataHeading}><span /><b /></div><div className={shell.tabs}>{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
        <div className={shell.rows}>{Array.from({ length: 3 }, (_, index) => <div className={shell.row} key={index}><i /><span><b /><small /></span><em /></div>)}</div>
        {failed && onRetry ? <button className={styles.fullButton} onClick={onRetry}>重新加载</button> : null}
      </section>
    </>}
  </>;
}

function seasonOptionsFromCurrent(currentSeason: string) {
  const currentYear = Number(currentSeason.slice(0, 4));
  if (!Number.isFinite(currentYear)) return [currentSeason];
  return Array.from({ length: Math.max(1, currentYear - 2019 + 1) }, (_, index) => {
    const startYear = currentYear - index;
    return `${startYear}/${String(startYear + 1).slice(-2)}`;
  });
}

function rankingKeyFromParam(value: string | null | undefined): SnookerCurrentRankingKey {
  return CURRENT_RANKING_KEYS.find((key) => key === value) ?? "world_official";
}

function rankingSectionFromParam(value: string | null | undefined): SnookerRankingSection {
  return value === "qualification" || value === "history" ? value : "current";
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function mergeDirectoryPlayers(...groups: Array<SnookerPlayerListItem[] | null | undefined>) {
  const byId = new Map<string, SnookerPlayerListItem>();
  for (const group of groups) {
    for (const player of group ?? []) byId.set(player.id, { ...(byId.get(player.id) ?? {}), ...player } as SnookerPlayerListItem);
  }
  return [...byId.values()].sort((a, b) => (a.currentRank ?? 9999) - (b.currentRank ?? 9999) || a.nameEn.localeCompare(b.nameEn));
}

function isChina(player?: SnookerPlayer) {
  return player?.countryCode === "CN" || player?.countryCode === "CHN";
}

function formatDateRange(start: string, end: string) {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  return sm === em ? `${sm}月${sd}日—${ed}日` : `${sm}月${sd}日—${em}月${ed}日`;
}

function formatMonthDay(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${month}/${day}`;
}

function formatUpdatedAt(value?: string) {
  if (!value) return "更新时间待确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function bestOfLabel(bestOf: number) {
  return bestOf > 0 ? `${bestOf}局${Math.floor(bestOf / 2) + 1}胜` : "赛制待定";
}

function chinaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDateDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isActiveOn(item: SnookerCalendarEvent, today: string) {
  return item.startDate <= today && item.endDate >= today;
}

function eventStatusLabel(item: SnookerCalendarEvent) {
  return item.status === "live" ? "进行中" : item.status === "upcoming" ? "即将开始" : "已结束";
}

function eventStatusClass(status: SnookerCalendarEvent["status"]) {
  return status === "live" ? polish.eventStatusLive : status === "upcoming" ? polish.eventStatusUpcoming : polish.eventStatusCompleted;
}

function localizedRoundLabel(value?: string) {
  const source = String(value ?? "").trim();
  const key = source.toLowerCase();
  if (!source) return "";
  if (/semi[- ]?final/.test(key)) return "半决赛";
  if (/quarter[- ]?final/.test(key)) return "1/4决赛";
  if (key === "final") return "决赛";
  if (/league phase.*stage two/.test(key)) return "第二阶段循环赛";
  if (/league phase/.test(key)) return "循环赛";
  const round = key.match(/^round\s+(\d+)$/);
  if (round) return `第${round[1]}轮`;
  return source;
}

function localizedTournamentLabel(value: string | undefined, calendar: SnookerCalendarEvent[]) {
  const source = String(value ?? "").trim();
  if (!source) return "官方赛事";
  const key = source.toLowerCase();
  const calendarMatch = calendar.find((item) => {
    const english = item.nameEn.toLowerCase();
    return english.length > 5 && (key.includes(english) || english.includes(key));
  });
  if (calendarMatch) return calendarMatch.nameZh;
  const known: Array<[RegExp, string]> = [
    [/saudi arabia snooker masters/i, "沙特阿拉伯斯诺克大师赛"],
    [/shanghai masters/i, "上海大师赛"],
    [/german masters/i, "德国大师赛"],
    [/uk championship/i, "英国锦标赛"],
    [/international championship/i, "国际锦标赛"],
    [/world championship/i, "世界锦标赛"],
    [/world grand prix/i, "世界大奖赛"],
    [/players championship/i, "球员锦标赛"],
    [/tour championship/i, "巡回锦标赛"],
    [/championship league/i, "冠军联赛"],
    [/scottish open/i, "苏格兰公开赛"],
    [/english open/i, "英格兰公开赛"],
    [/british open/i, "英国公开赛"],
    [/northern ireland open/i, "北爱尔兰公开赛"],
    [/welsh open/i, "威尔士公开赛"],
    [/wuhan open/i, "武汉公开赛"],
    [/china open/i, "中国公开赛"],
    [/shoot out/i, "单局限时赛"],
    [/\bmasters\b/i, "大师赛"],
  ];
  return known.find(([pattern]) => pattern.test(source))?.[1] ?? source;
}

function allMatches(event: SnookerEvent) {
  return event.rounds.flatMap((round) => round.matches);
}

function scheduledTime(match: SnookerMatch) {
  const parsed = match.scheduledAt ? Date.parse(match.scheduledAt) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function orderedScheduleRounds(event: SnookerEvent) {
  const final = finalOf(event);
  const completedEvent = event.status === "completed" || final?.status === "completed" || final?.status === "walkover";
  const rounds = event.rounds.map((round) => ({
    ...round,
    matches: [...round.matches].sort((a, b) => {
      const aTime = scheduledTime(a);
      const bTime = scheduledTime(b);
      if (aTime !== null && bTime !== null && aTime !== bTime) return completedEvent ? bTime - aTime : aTime - bTime;
      if (aTime !== null && bTime === null) return -1;
      if (aTime === null && bTime !== null) return 1;
      return a.matchNo - b.matchNo || a.id.localeCompare(b.id);
    }),
  }));

  return rounds.sort((a, b) => {
    if (completedEvent) {
      if (a.key === "final" && b.key !== "final") return -1;
      if (b.key === "final" && a.key !== "final") return 1;
      const aTime = Math.max(...a.matches.map((match) => scheduledTime(match) ?? Number.NEGATIVE_INFINITY));
      const bTime = Math.max(...b.matches.map((match) => scheduledTime(match) ?? Number.NEGATIVE_INFINITY));
      if (aTime !== bTime) return bTime - aTime;
    } else {
      const aTimes = a.matches.map(scheduledTime).filter((value): value is number => value !== null);
      const bTimes = b.matches.map(scheduledTime).filter((value): value is number => value !== null);
      const aTime = aTimes.length ? Math.min(...aTimes) : Number.POSITIVE_INFINITY;
      const bTime = bTimes.length ? Math.min(...bTimes) : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
    }
    return a.labelZh.localeCompare(b.labelZh, "zh-CN");
  });
}

function scheduleFocusMatch(event: SnookerEvent, now = Date.now()) {
  const matches = allMatches(event);
  const ascending = (a: SnookerMatch, b: SnookerMatch) => {
    const aTime = scheduledTime(a) ?? Number.POSITIVE_INFINITY;
    const bTime = scheduledTime(b) ?? Number.POSITIVE_INFINITY;
    return aTime - bTime || a.matchNo - b.matchNo || a.id.localeCompare(b.id);
  };

  const live = matches
    .filter((match) => match.status === "live" || match.status === "session-break")
    .sort(ascending);
  if (live.length) return live[0];

  const upcoming = matches.filter((match) => match.status === "upcoming").sort(ascending);
  const future = upcoming.filter((match) => {
    const time = scheduledTime(match);
    return time !== null && time >= now;
  });
  if (future.length) return future[0];
  if (upcoming.length) return upcoming[0];

  return matches
    .filter((match) => match.status === "completed" || match.status === "walkover")
    .sort((a, b) => {
      const aTime = scheduledTime(a) ?? Number.NEGATIVE_INFINITY;
      const bTime = scheduledTime(b) ?? Number.NEGATIVE_INFINITY;
      return bTime - aTime || b.matchNo - a.matchNo || b.id.localeCompare(a.id);
    })[0];
}

function finalOf(event?: SnookerEvent) {
  return event?.rounds.find((round) => round.key === "final")?.matches[0];
}

function playerMap(snapshot: SnookerDashboardSnapshot) {
  return new Map(snapshot.players.map((player) => [player.id, player]));
}

function fallbackPlayer(id: string): SnookerPlayer {
  return {
    id,
    slug: "",
    nameEn: "Player",
    nameZh: "球员信息加载中",
    shortNameZh: "待加载",
    nationalityZh: "未知",
    countryCode: "",
    currentRank: null,
    rankingPoints: null,
  };
}

function shouldPollMatch(match: SnookerMatch, now: number) {
  if (match.status === "live" || match.status === "session-break") return true;
  const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
  if (match.status === "upcoming" && scheduled && scheduled >= now && scheduled - now <= UPCOMING_PREHEAT_MS) return true;
  const completedAt = resolveCompletedAt(match, now);
  return (match.status === "completed" || match.status === "walkover")
    && completedAt > 0
    && now - completedAt <= COMPLETED_PROTECTION_MS;
}

function mergeMatchPatchIntoEvent(event: SnookerEvent, patch: Partial<SnookerMatch> & { id: string }) {
  let changed = false;
  const rounds = event.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      if (match.id !== patch.id) return match;
      changed = true;
      return { ...match, ...patch };
    }),
  }));
  return changed ? { ...event, rounds, snapshotAt: patch.sourceUpdatedAt ?? event.snapshotAt } : event;
}

function rootUrl(view: MainView) {
  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  rootDetailParams.forEach((key) => url.searchParams.delete(key));
  return `${url.pathname}${url.search}${url.hash}`;
}

function currentEventStats(playerId: string, event: SnookerEvent): PlayerEventStats | null {
  const matches = allMatches(event).filter((match) => match.player1Id === playerId || match.player2Id === playerId);
  if (!matches.length) return null;
  let wins = 0;
  let losses = 0;
  let frameWins = 0;
  let frameLosses = 0;
  for (const match of matches) {
    const isP1 = match.player1Id === playerId;
    frameWins += Number(isP1 ? match.score1 ?? 0 : match.score2 ?? 0);
    frameLosses += Number(isP1 ? match.score2 ?? 0 : match.score1 ?? 0);
    if (match.winnerId === playerId) wins += 1;
    else if (match.status === "completed" || match.status === "walkover") losses += 1;
  }
  const roundProgressScore = (match: SnookerMatch) => {
    const round = `${match.roundKey} ${match.roundLabelZh}`;
    const semantic = roundIsFinal(match.roundKey, match.roundLabelZh)
      ? 4
      : roundIsSemifinal(match.roundKey, match.roundLabelZh)
        ? 3
        : /quarter[-_ ]?final|1\/4|四分之一/i.test(round)
          ? 2
          : 1;
    return semantic * 1_000_000 + match.matchNo;
  };
  const best = [...matches].sort((a, b) => roundProgressScore(b) - roundProgressScore(a) || (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""))[0];
  return {
    playerId,
    eventId: event.id,
    played: wins + losses,
    wins,
    losses,
    frameWins,
    frameLosses,
    bestRoundKey: best.roundKey,
    bestRoundLabelZh: best.roundLabelZh,
    isActive: matches.some((match) => match.status === "live" || match.status === "session-break" || match.status === "upcoming"),
    matches,
  };
}

function roundIsFinal(key: string, labelZh: string) {
  return key === "final" || labelZh.trim() === "决赛";
}

function roundIsSemifinal(key: string, labelZh: string) {
  return /semi[-_ ]?final/i.test(key) || labelZh.includes("半决赛");
}

function tournamentFinalFour(event: SnookerEvent) {
  const isLeague = /championship[-_ ]league|冠军联赛/i.test(`${event.slug} ${event.nameEn} ${event.nameZh}`);
  if (event.status !== "completed" || isQualificationEvent(event) || isLeague) return null;
  const finalRound = event.rounds.find((round) => roundIsFinal(round.key, round.labelZh));
  const semifinalRound = event.rounds.find((round) => roundIsSemifinal(round.key, round.labelZh));
  if (finalRound?.matches.length !== 1 || semifinalRound?.matches.length !== 2) return null;
  const final = finalRound.matches[0];
  if ((final.status !== "completed" && final.status !== "walkover") || !final.winnerId) return null;
  if (semifinalRound.matches.some((match) => match.status !== "completed" && match.status !== "walkover")) return null;
  const runnerUpId = final.winnerId === final.player1Id ? final.player2Id : final.player1Id;
  const finalistIds = new Set([final.winnerId, runnerUpId]);
  const semifinalistIds = [...new Set(semifinalRound.matches.flatMap((match) => [match.player1Id, match.player2Id]))]
    .filter((playerId) => !finalistIds.has(playerId));
  if (semifinalistIds.length !== 2) return null;
  const scoreFor = (playerId: string) => playerId === final.player1Id ? `${final.score1 ?? "-"}-${final.score2 ?? "-"}` : `${final.score2 ?? "-"}-${final.score1 ?? "-"}`;
  return [
    { playerId: final.winnerId, role: "冠军", roleEn: "CHAMPION", score: scoreFor(final.winnerId) },
    { playerId: runnerUpId, role: "亚军", roleEn: "RUNNER-UP", score: scoreFor(runnerUpId) },
    ...semifinalistIds.map((playerId) => ({ playerId, role: "四强", roleEn: "SEMI-FINALIST", score: "半决赛" })),
  ];
}

function eventRoundResult(roundKey: string, roundLabelZh: string) {
  const key = roundKey.trim().toLowerCase();
  const label = roundLabelZh.trim();
  const source = `${key} ${label}`;
  if (roundIsFinal(key, label)) return { label: "决赛", priority: 2 };
  if (roundIsSemifinal(key, label)) return { label: "四强", priority: 4 };
  if (/quarter[-_ ]?final|1\/4|四分之一/i.test(source)) return { label: "八强", priority: 8 };

  const field = label.match(/^(\d{1,3})\s*强$/);
  if (field) return { label: `${Number(field[1])}强`, priority: Number(field[1]) };
  const transition = label.match(/^(\d{1,3})\s*进\s*(\d{1,3})$/);
  if (transition) return { label: `${Number(transition[1])}强`, priority: Number(transition[1]) };
  const lastField = source.match(/(?:last|round[-_ ]of)[-_ ]?(\d{1,3})/i);
  if (lastField) return { label: `${Number(lastField[1])}强`, priority: Number(lastField[1]) };
  if (/wild[-_ ]?card|外卡/i.test(source)) return { label: "外卡轮", priority: 512 };
  if (/qualif|资格|选拔/i.test(source)) return { label: label || "资格赛", priority: 768 };
  return { label: label || "—", priority: 900 };
}

function eventPlayerBestResult(event: SnookerEvent, playerId: string) {
  const results = allMatches(event)
    .filter((match) => match.player1Id === playerId || match.player2Id === playerId)
    .map((match) => eventRoundResult(match.roundKey, match.roundLabelZh));
  return results.sort((a, b) => a.priority - b.priority)[0] ?? { label: "—", priority: 900 };
}

function eventResultLabel(event: SnookerEvent, stats: SnookerEventPlayerStats) {
  if (stats.isChampion) return "冠军";
  if (stats.isRunnerUp) return "亚军";
  const stage = eventPlayerBestResult(event, stats.playerId).label;
  if (event.status !== "completed" && stats.isActive) return stage ? `已晋级${stage}` : "仍在赛";
  return stage;
}

function eventResultPriority(event: SnookerEvent, stats: SnookerEventPlayerStats) {
  if (stats.isChampion) return 0;
  if (stats.isRunnerUp) return 1;
  return eventPlayerBestResult(event, stats.playerId).priority;
}

function fallbackEventPlayerStats(event: SnookerEvent): SnookerEventPlayerStats[] {
  const participantIds = [...new Set(allMatches(event).flatMap((match) => [match.player1Id, match.player2Id]))];
  const final = finalOf(event);
  return participantIds.flatMap((playerId) => {
    const stats = currentEventStats(playerId, event);
    if (!stats) return [];
    const runnerUpId = final?.winnerId === final?.player1Id ? final?.player2Id : final?.player1Id;
    return [{
      playerId,
      matchEntries: stats.matches.length,
      matchesPlayed: stats.played,
      matchesWon: stats.wins,
      matchesLost: stats.losses,
      matchesDrawn: 0,
      walkoversWon: 0,
      walkoversLost: 0,
      framesWon: stats.frameWins,
      framesLost: stats.frameLosses,
      breaks50Plus: 0,
      breaks100Plus: 0,
      maximums: 0,
      lastRoundKey: stats.bestRoundKey,
      lastRoundLabelZh: stats.bestRoundLabelZh,
      isChampion: final?.winnerId === playerId,
      isRunnerUp: Boolean(final?.winnerId && runnerUpId === playerId),
      isActive: stats.isActive,
    }];
  });
}

function money(value: number) {
  return `£${value.toLocaleString("en-GB")}`;
}

function rankingMoney(value: number) {
  return `€${value.toLocaleString("en-GB")}`;
}

function headlineEventName(value: string) {
  return value.replace(/\s*[（(][^（）()]*[）)]/g, "").replace(/\s{2,}/g, " ").trim();
}

function SectionHeader({ eyebrow, title, action, actionClassName }: { eyebrow?: string; title: string; action?: ReactNode; actionClassName?: string }) {
  return <div className={styles.sectionHeader}><div>{eyebrow ? <small>{eyebrow}</small> : null}<h2>{title}</h2></div>{action ? <span className={actionClassName}>{action}</span> : null}</div>;
}

function nearestRailItemIndex(rail: HTMLDivElement) {
  const items = Array.from(rail.children) as HTMLElement[];
  if (!items.length) return 0;
  const railStart = items[0].offsetLeft;
  return items.reduce((nearest, item, index) => Math.abs(item.offsetLeft - railStart - rail.scrollLeft) < Math.abs(items[nearest].offsetLeft - railStart - rail.scrollLeft) ? index : nearest, 0);
}

function scrollRailItem(rail: HTMLDivElement | null, index: number) {
  const item = rail?.children.item(index) as HTMLElement | null;
  if (!rail || !item) return;
  const firstItem = rail.children.item(0) as HTMLElement | null;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  rail.scrollTo({ left: item.offsetLeft - (firstItem?.offsetLeft ?? 0), behavior });
}

function PlayerAvatar({ player, size = "md" }: { player: SnookerPlayer; size?: "sm" | "md" | "lg" | "xl" }) {
  const image = player.avatarUrl || player.avatar?.url;
  return (
    <span className={`${styles.avatar} ${styles[`avatar_${size}`]} ${image ? polish.avatarPhoto : ""}`} aria-label={player.nameZh}>
      {image ? <img src={image} alt="" loading={size === "xl" ? "eager" : "lazy"} decoding="async" /> : initials(player.nameEn)}
    </span>
  );
}

function MatchupPlayer({ player }: { player: SnookerPlayer }) {
  const image = player.avatarUrl || player.avatar?.url;
  const shortNameEn = player.shortNameEn || player.nameEn.split(/\s+/).slice(-1)[0] || player.nameEn;
  return (
    <div className={polish.matchupPlayer}>
      <div className={polish.matchupPortrait} aria-label={player.nameZh}>
        {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span className={polish.matchupFallback}>{initials(player.nameEn)}</span>}
      </div>
      <div className={polish.matchupPlayerText}>
        <strong>{player.shortNameZh || player.nameZh}</strong>
        <small>{shortNameEn}</small>
      </div>
    </div>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const motion = status === "live" ? priority.liveStatusPill : status === "session-break" ? priority.breakStatusPill : "";
  return <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""} ${motion}`}>{label}</span>;
}

function MatchListRow({ match, players, onOpen }: { match: SnookerMatch; players: Map<string, SnookerPlayer>; onOpen: () => void }) {
  const p1 = players.get(match.player1Id) ?? fallbackPlayer(match.player1Id);
  const p2 = players.get(match.player2Id) ?? fallbackPlayer(match.player2Id);
  const score = match.status === "walkover" ? "W : O" : `${match.score1 ?? "-"} : ${match.score2 ?? "-"}`;
  return (
    <button className={`${styles.matchRow} ${priority.horizontalMatchRow}`} data-schedule-match-id={match.id} onClick={onOpen}>
      <div className={styles.matchRowMeta}>
        <span>{match.timeLabelZh ?? match.roundLabelZh}{match.matchNo ? ` · #${match.matchNo}` : ""}</span>
        <span>{bestOfLabel(match.bestOf)}</span>
        <StatusPill status={match.status} label={matchDisplayStatus(match)} />
      </div>
      <div className={priority.matchVersusRow}>
        <div className={polish.matchPlayerCell}>
          <PlayerAvatar player={p1} size="sm" />
          <span>{p1.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p1.id ? <em className={polish.withdrawnBadge}>退赛</em> : null}{match.winnerId === p1.id ? <em className={polish.matchWin}>胜</em> : null}</span>
        </div>
        <b className={match.status === "live" ? priority.liveScoreText : ""}>{score}</b>
        <div className={`${polish.matchPlayerCell} ${polish.matchPlayerRight}`}>
          <span>{match.winnerId === p2.id ? <em className={polish.matchWin}>胜</em> : null}{p2.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p2.id ? <span className={polish.withdrawnBadge}>退赛</span> : null}</span>
          <PlayerAvatar player={p2} size="sm" />
        </div>
      </div>
    </button>
  );
}

function EventCard({ item, onOpen, onPrefetch, interactive = true }: { item: SnookerCalendarEvent; onOpen?: () => void; onPrefetch?: () => void; interactive?: boolean }) {
  const nameZh = item.nameZh?.trim() || item.nameEn?.trim() || "赛事名称待确认";
  const nameEn = item.nameEn?.trim();
  const typeZh = item.typeZh?.trim() || "赛事";
  const place = [item.countryZh, item.cityZh].map((value) => value?.trim()).filter(Boolean).join(" ");
  const content = <>
    <div className={styles.calendarDate}><b>{formatMonthDay(item.startDate)}</b><small className={`${polish.eventStatusText} ${eventStatusClass(item.status)}`}>{eventStatusLabel(item)}</small></div>
    <div><span><StatusPill status="type" label={typeZh} /></span><strong>{nameZh}</strong>{nameEn ? <small>{nameEn}</small> : null}<p>{formatDateRange(item.startDate, item.endDate)}{place ? ` · ${place}` : ""}</p></div>
    {interactive ? <em>›</em> : null}
  </>;
  if (!interactive) return <article className={priority.calendarStaticCard}>{content}</article>;
  return <button className={item.status === "live" ? styles.calendarCurrent : ""} onPointerEnter={onPrefetch} onFocus={onPrefetch} onTouchStart={onPrefetch} onClick={onOpen}>{content}</button>;
}

function RecentEventCard({ item, onOpen, onPrefetch }: { item: SnookerCalendarEvent; onOpen: () => void; onPrefetch?: () => void }) {
  const nameZh = item.nameZh?.trim() || item.nameEn?.trim() || "赛事名称待确认";
  const nameEn = item.nameEn?.trim();
  const typeZh = item.typeZh?.trim() || "赛事";
  const place = [item.countryZh, item.cityZh].map((value) => value?.trim()).filter(Boolean).join(" ");
  return <button className={priority.recentEventCard} data-status={item.status} onPointerEnter={onPrefetch} onFocus={onPrefetch} onTouchStart={onPrefetch} onClick={onOpen}>
    <div className={priority.recentEventCardTop}><StatusPill status={item.status} label={eventStatusLabel(item)} /><small>{typeZh}</small></div>
    <strong>{nameZh}</strong>
    {nameEn ? <small className={priority.recentEventEnglish}>{nameEn}</small> : null}
    <p>{formatDateRange(item.startDate, item.endDate)}{place ? ` · ${place}` : ""}</p>
    <span>查看详情 ›</span>
  </button>;
}

function SeasonSelector({ seasons, value, onChange, onPrefetch }: { seasons: string[]; value: string; onChange: (season: string) => void; onPrefetch?: (season: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const desktopVisibleCount = 6;
  const hiddenCount = Math.max(0, seasons.length - desktopVisibleCount);
  const scroll = (direction: -1 | 1) => rail.current?.scrollBy({ left: direction * 180, behavior: "auto" });
  return <div className={priority.seasonSelector} data-expanded={expanded ? "true" : "false"} aria-label="赛季选择器">
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(-1)} aria-label="查看较新赛季">‹</button>
    <div className={priority.seasonRail} ref={rail}>
      {seasons.map((season, index) => {
        const older = index >= desktopVisibleCount && season !== value;
        return <button type="button" key={season} aria-label={`${season}赛季`} className={`${season === value ? priority.seasonActive : ""} ${older ? priority.seasonOlder : ""}`} onPointerEnter={() => onPrefetch?.(season)} onFocus={() => onPrefetch?.(season)} onTouchStart={() => onPrefetch?.(season)} onClick={() => onChange(season)}>{season}</button>;
      })}
    </div>
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(1)} aria-label="查看较早赛季">›</button>
    {hiddenCount > 0 ? <button type="button" className={priority.seasonMoreButton} onClick={() => setExpanded((current) => !current)}>{expanded ? "收起历史赛季" : `更多历史赛季（${hiddenCount}）`}</button> : null}
  </div>;
}

function statValue(stat: SnookerMatchPlayerStatistics | undefined, key: keyof SnookerMatchPlayerStatistics, suffix = "") {
  const value = stat?.[key];
  if (typeof value !== "number") return "—";
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text}${suffix}`;
}

function seasonValue(stat: SnookerSeasonStatistics | undefined, key: keyof SnookerSeasonStatistics, suffix = "") {
  const value = stat?.[key];
  if (typeof value !== "number") return "—";
  const formatted = key === "pointsScored" ? value.toLocaleString("en-GB") : Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted}${suffix}`;
}

function meetingDate(item: SnookerHeadToHeadMeeting) {
  if (!item.date) return "—";
  const date = item.date.slice(0, 10).split("-");
  return `${Number(date[1])}/${Number(date[2])}/${date[0]}`;
}

export default function SnookerDataCenterV2({
  initialSnapshot,
  initialDatabaseEvents,
  initialCurrentSeason,
  initialRankingHub,
  initialSourceHealth,
  buildMark,
  initialView = "home",
  initialPlayerSlug,
  initialDataSection,
  initialRankingKey,
  initialRankingSection = "current",
  initialPlayerCompare,
  initialHomeLeaders,
  initialHomeBootstrap = false,
}: {
  initialSnapshot: SnookerDashboardSnapshot;
  initialDatabaseEvents: SnookerEvent[];
  initialCurrentSeason: string;
  initialRankingHub: SnookerRankingHub;
  initialSourceHealth?: SourceHealth | null;
  buildMark: string;
  initialView?: MainView;
  initialPlayerSlug?: string | null;
  initialDataSection?: "rankings" | null;
  initialRankingKey?: SnookerCurrentRankingKey | null;
  initialRankingSection?: SnookerRankingSection;
  initialPlayerCompare?: PlayerCompareSnapshot | null;
  initialHomeLeaders: HomeLeadersPayload;
  initialHomeBootstrap?: boolean;
}) {
  const initialKey = initialRankingKey ?? "world_official";
  const initialDetail: DetailState | null = initialPlayerSlug
    ? { type: "player", slug: initialPlayerSlug, returnView: "players" }
    : initialDataSection === "rankings"
      ? { type: "ranking", section: initialRankingSection, key: initialKey }
      : null;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [databaseEvents, setDatabaseEvents] = useState(initialDatabaseEvents);
  const [eventScopedPlayers, setEventScopedPlayers] = useState<SnookerPlayer[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<SnookerCalendarEvent[]>(initialSnapshot.calendar);
  const [loadedCalendarSeasons, setLoadedCalendarSeasons] = useState<string[]>([initialCurrentSeason]);
  const [loadingCalendarSeasons, setLoadingCalendarSeasons] = useState<string[]>([]);
  const [calendarLoadErrorSeasons, setCalendarLoadErrorSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(initialCurrentSeason);
  const [loadingEventSlugs, setLoadingEventSlugs] = useState<string[]>([]);
  const [eventLoadErrorSlugs, setEventLoadErrorSlugs] = useState<string[]>([]);
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [matchLoadError, setMatchLoadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MainView>(initialPlayerSlug ? "players" : initialDataSection === "rankings" ? "data" : initialView);
  const [detail, setDetail] = useState<DetailState | null>(initialDetail);
  const [theme, setTheme] = useState<Theme>("green");
  const [sourceHealth, setSourceHealth] = useState<SourceHealth | null>(initialSourceHealth ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [eventListMode, setEventListMode] = useState<EventListMode>("recent");
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [matchDataTab, setMatchDataTab] = useState<MatchDataTab>("match");
  const [matchUpdatedAt, setMatchUpdatedAt] = useState<Record<string, string>>({});
  const [selectedRankingKey, setSelectedRankingKey] = useState<SnookerCurrentRankingKey>(initialKey);
  const [rankingSection, setRankingSection] = useState<SnookerRankingSection>(initialRankingSection);
  const [loadedDirectory, setLoadedDirectory] = useState<SnookerPlayerListItem[] | null>(null);
  const [rankingScopedPlayers, setRankingScopedPlayers] = useState<SnookerPlayerListItem[]>([]);
  const [directoryLoaded, setDirectoryLoaded] = useState(!initialHomeBootstrap);
  const [directoryHasMore, setDirectoryHasMore] = useState(true);
  const [directoryLoadingMore, setDirectoryLoadingMore] = useState(false);
  const [directoryModuleLoaded, setDirectoryModuleLoaded] = useState(false);
  const [directoryLoadError, setDirectoryLoadError] = useState(false);
  const [rankingHub, setRankingHub] = useState(initialRankingHub);
  const [rankingHubLoaded, setRankingHubLoaded] = useState(!initialHomeBootstrap);
  const [dataModuleLoaded, setDataModuleLoaded] = useState(false);
  const [rankingHubLoadError, setRankingHubLoadError] = useState(false);
  const [requestedTechnicalMetric, setRequestedTechnicalMetric] = useState<SnookerTechnicalMetricKey | null>(null);
  const [clientNow, setClientNow] = useState(() => Date.now());
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [chinaRailIndex, setChinaRailIndex] = useState(0);
  const playerDirectoryScrollY = useRef(0);
  const headlineRail = useRef<HTMLDivElement>(null);
  const chinaPlayersRail = useRef<HTMLDivElement>(null);
  const eventReturnState = useRef<{ view: MainView; mode: EventListMode; season: string; scrollY: number } | null>(null);
  const matchReturnState = useRef<MatchReturnState | null>(null);
  const scheduleAutoFocusedEvents = useRef(new Set<string>());
  const matchDetailInFlight = useRef(new Set<string>());
  const calendarLoadedSeasons = useRef(new Set([initialCurrentSeason]));
  const calendarInFlight = useRef(new Map<string, Promise<void>>());
  const eventDetailInFlight = useRef(new Map<string, Promise<void>>());
  const playerDirectoryInFlight = useRef<Promise<void> | null>(null);
  const playerArchiveInFlight = useRef<Promise<void> | null>(null);
  const playerArchiveCursor = useRef<string | null>(null);
  const playerArchiveComplete = useRef(false);
  const rankingHubInFlight = useRef<Promise<void> | null>(null);

  const ensureCalendarSeason = useCallback((season: string) => {
    if (calendarLoadedSeasons.current.has(season)) return Promise.resolve();
    const existing = calendarInFlight.current.get(season);
    if (existing) return existing;

    setLoadingCalendarSeasons((current) => current.includes(season) ? current : [...current, season]);
    setCalendarLoadErrorSeasons((current) => current.filter((item) => item !== season));
    const task = (async () => {
      try {
        const response = await fetch(`/api/snooker/v1/calendar?season=${encodeURIComponent(season)}`, { headers: { Accept: "application/json" } });
        const data = await response.json() as CalendarResponse;
        if (!response.ok || !data.ok || !data.calendar) throw new Error("EVENT_CALENDAR_UNAVAILABLE");
        setCalendarEvents((current) => {
          const bySlug = new Map(current.map((item) => [item.slug, item]));
          for (const item of data.calendar ?? []) bySlug.set(item.slug, item);
          return [...bySlug.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
        });
        calendarLoadedSeasons.current.add(season);
        setLoadedCalendarSeasons([...calendarLoadedSeasons.current]);
      } catch {
        setCalendarLoadErrorSeasons((current) => current.includes(season) ? current : [...current, season]);
      } finally {
        calendarInFlight.current.delete(season);
        setLoadingCalendarSeasons((current) => current.filter((item) => item !== season));
      }
    })();
    calendarInFlight.current.set(season, task);
    return task;
  }, []);

  useEffect(() => {
    let frame = 0;
    try {
      const stored = window.localStorage.getItem("snooker-theme");
      if (stored === "green" || stored === "red") frame = window.requestAnimationFrame(() => setTheme(stored));
    } catch {
      // Keep the default theme when storage is unavailable.
    }
    return () => { if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.snookerTheme = theme;
    try {
      window.localStorage.setItem("snooker-theme", theme);
    } catch {
      // Theme still applies for the current document.
    }
  }, [theme]);

  const effectiveCalendarEvents = useMemo(() => {
    const bySlug = new Map(calendarEvents.map((item) => [item.slug, item]));
    snapshot.calendar
      .filter((item) => item.season === initialCurrentSeason)
      .forEach((item) => bySlug.set(item.slug, item));
    return [...bySlug.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [calendarEvents, snapshot.calendar, initialCurrentSeason]);

  useEffect(() => {
    let frame = 0;
    try {
      const restoreUrl = window.sessionStorage.getItem("snooker-compare-restore");
      if (!restoreUrl) return;
      window.sessionStorage.removeItem("snooker-compare-restore");
      const target = new URL(restoreUrl);
      if (target.origin !== window.location.origin) return;

      const playerSlug = target.searchParams.get("player")?.trim();
      const viewParam = target.searchParams.get("view");
      if (playerSlug) {
        const returnView: MainView = viewParam === "matches" || viewParam === "data" ? viewParam : "players";
        frame = window.requestAnimationFrame(() => {
          setActiveView("players");
          setDetail({ type: "player", slug: playerSlug, returnView });
          window.scrollTo({ top: 0, behavior: "auto" });
        });
      } else {
        const restoredView: MainView = viewParam === "matches" || viewParam === "players" || viewParam === "data" ? viewParam : "home";
        frame = window.requestAnimationFrame(() => {
          setDetail(null);
          setActiveView(restoredView);
        });
      }
    } catch {
      // Keep the restored root state when the saved compare source is invalid.
    }
    return () => { if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  const mergeScopedPlayers = useCallback((incoming: SnookerPlayer[] | undefined) => {
    if (!incoming?.length) return;
    setEventScopedPlayers((current) => {
      const byId = new Map(current.map((player) => [player.id, player]));
      for (const player of incoming) byId.set(player.id, { ...(byId.get(player.id) ?? {}), ...player } as SnookerPlayer);
      return [...byId.values()];
    });
  }, []);

  const players = useMemo(() => {
    const map = playerMap(snapshot);
    for (const player of eventScopedPlayers) {
      const existing = map.get(player.id);
      map.set(player.id, existing ? { ...player, ...existing } : player);
    }
    return map;
  }, [snapshot, eventScopedPlayers]);
  const snapshotDirectoryPlayers = useMemo<SnookerPlayerListItem[]>(() => snapshot.players
    .map((player) => ({
      id: player.id,
      slug: player.slug,
      nameEn: player.nameEn,
      nameZh: player.nameZh,
      shortNameZh: player.shortNameZh || null,
      nationalityZh: player.nationalityZh || null,
      countryCode: player.countryCode || null,
      dateOfBirth: player.dateOfBirth ?? null,
      turnedPro: player.turnedPro ?? null,
      currentRank: player.currentRank,
      rankingPoints: player.rankingPoints,
      avatarUrl: player.avatarUrl || player.avatar?.url || null,
      isCurrentTour: player.isCurrentTour ?? player.currentRank !== null,
      tourStatus: player.tourStatus ?? (player.currentRank !== null ? "professional" : "unknown"),
      playerStatus: player.playerStatus ?? (player.currentRank !== null ? "tour" : player.turnedPro ? "former_pro" : "amateur"),
    }))
    .sort((a, b) => (a.currentRank ?? 9999) - (b.currentRank ?? 9999) || a.nameEn.localeCompare(b.nameEn)), [snapshot.players]);
  const directoryPlayers = loadedDirectory ?? snapshotDirectoryPlayers;
  const dataPlayers = useMemo(
    () => mergeDirectoryPlayers(snapshotDirectoryPlayers, rankingScopedPlayers, loadedDirectory),
    [snapshotDirectoryPlayers, rankingScopedPlayers, loadedDirectory],
  );
  const eventBySlug = useMemo(() => new Map(databaseEvents.map((event) => [event.slug, event])), [databaseEvents]);

  const applyMatchDetail = useCallback((data: MatchDetailResponse) => {
    if (!data.match) return;
    mergeScopedPlayers(data.players);
    const patch = data.match;
    const changedAt = data.fetchedAt ?? patch.sourceUpdatedAt ?? new Date().toISOString();
    setDatabaseEvents((current) => current.map((event) => mergeMatchPatchIntoEvent(event, patch)));
    setSnapshot((current) => ({ ...current, event: mergeMatchPatchIntoEvent(current.event, patch), builtAt: changedAt }));
    setMatchUpdatedAt((previous) => ({ ...previous, [patch.id]: patch.sourceUpdatedAt ?? changedAt }));
    setSourceHealth((current) => ({
      online: true,
      accepted: true,
      fetchedAt: changedAt,
      message: "比赛详情已按单场加载。",
      sourceLabel: current?.sourceLabel ?? "Supabase · 单场详情",
      cacheSeconds: 0,
    }));
  }, [mergeScopedPlayers]);

  const ensureMatchDetail = useCallback(async (matchId: string, options: { silent?: boolean } = {}) => {
    if (!matchId.startsWith("db-") || matchDetailInFlight.current.has(matchId)) return;
    matchDetailInFlight.current.add(matchId);
    if (!options.silent) {
      setLoadingMatchId(matchId);
      setMatchLoadError((current) => current === matchId ? null : current);
    }
    try {
      const response = await fetch(`/api/snooker/v1/match?id=${encodeURIComponent(matchId)}`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as MatchDetailResponse;
      if (!response.ok || !data.ok || !data.match) throw new Error("MATCH_DETAIL_UNAVAILABLE");
      applyMatchDetail(data);
    } catch {
      if (!options.silent) setMatchLoadError(matchId);
    } finally {
      matchDetailInFlight.current.delete(matchId);
      if (!options.silent) setLoadingMatchId((current) => current === matchId ? null : current);
    }
  }, [applyMatchDetail]);

  const ensurePlayerDirectory = useCallback(() => {
    if (directoryLoaded) return Promise.resolve();
    if (playerDirectoryInFlight.current) return playerDirectoryInFlight.current;
    setDirectoryLoadError(false);
    const task = (async () => {
      let deliveredFirstPage = false;
      try {
        let cursor: string | null = null;
        let firstPage = true;
        do {
          const url = new URL("/api/snooker/v1/player-directory", window.location.origin);
          url.searchParams.set("scope", "tour");
          url.searchParams.set("limit", "32");
          if (cursor) url.searchParams.set("cursor", cursor);
          const response = await fetch(url.pathname + url.search, { headers: { Accept: "application/json" } });
          const data = await response.json() as PlayerDirectoryPageResponse;
          if (!response.ok || !data.ok || !data.players) throw new Error("PLAYER_DIRECTORY_UNAVAILABLE");
          setLoadedDirectory((current) => mergeDirectoryPlayers(current, data.players));
          cursor = data.hasMore ? data.nextCursor ?? null : null;
          if (firstPage) {
            firstPage = false;
            deliveredFirstPage = true;
            setDirectoryLoaded(true);
          }
          if (cursor) {
            await new Promise<void>((resolve) => {
              if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 1200 });
              else globalThis.setTimeout(resolve, 32);
            });
          }
        } while (cursor);
        setDirectoryLoaded(true);
      } catch {
        if (!deliveredFirstPage) setDirectoryLoadError(true);
      } finally {
        playerDirectoryInFlight.current = null;
      }
    })();
    playerDirectoryInFlight.current = task;
    return task;
  }, [directoryLoaded]);

  const loadMorePlayerDirectory = useCallback(() => {
    if (playerArchiveComplete.current) return Promise.resolve();
    if (playerArchiveInFlight.current) return playerArchiveInFlight.current;
    setDirectoryLoadingMore(true);
    const task = (async () => {
      try {
        if (playerDirectoryInFlight.current) await playerDirectoryInFlight.current;
        const url = new URL("/api/snooker/v1/player-directory", window.location.origin);
        url.searchParams.set("scope", "archive");
        url.searchParams.set("limit", "64");
        if (playerArchiveCursor.current) url.searchParams.set("cursor", playerArchiveCursor.current);
        const response = await fetch(url.pathname + url.search, { headers: { Accept: "application/json" } });
        const data = await response.json() as PlayerDirectoryPageResponse;
        if (!response.ok || !data.ok || !data.players) throw new Error("PLAYER_DIRECTORY_ARCHIVE_UNAVAILABLE");
        setLoadedDirectory((current) => mergeDirectoryPlayers(current, data.players));
        playerArchiveCursor.current = data.nextCursor ?? null;
        playerArchiveComplete.current = !data.hasMore;
        setDirectoryHasMore(Boolean(data.hasMore));
      } catch {
        setDirectoryLoadError(true);
      } finally {
        playerArchiveInFlight.current = null;
        setDirectoryLoadingMore(false);
      }
    })();
    playerArchiveInFlight.current = task;
    return task;
  }, []);

  useEffect(() => {
    if (activeView !== "players" || !directoryLoaded) return;
    const query = playerQuery.trim();
    if (!query && playerFilter !== "china") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const url = new URL("/api/snooker/v1/player-directory", window.location.origin);
      url.searchParams.set("mode", "search");
      if (query) url.searchParams.set("q", query);
      if (playerFilter === "china") url.searchParams.set("filter", "china");
      void fetch(url.pathname + url.search, { signal: controller.signal, headers: { Accept: "application/json" } })
        .then(async (response) => {
          const data = await response.json() as PlayerDirectoryPageResponse;
          if (response.ok && data.ok && data.players) setLoadedDirectory((current) => mergeDirectoryPlayers(current, data.players));
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeView, directoryLoaded, playerFilter, playerQuery]);

  const ensureRankingHub = useCallback(() => {
    if (rankingHubLoaded) return Promise.resolve();
    if (rankingHubInFlight.current) return rankingHubInFlight.current;
    setRankingHubLoadError(false);
    const task = (async () => {
      try {
        const response = await fetch("/api/snooker/v1/ranking-hub", { headers: { Accept: "application/json" } });
        const data = await response.json() as { ok?: boolean; hub?: SnookerRankingHub; players?: SnookerPlayerListItem[] };
        if (!response.ok || !data.ok || !data.hub) throw new Error("RANKING_HUB_UNAVAILABLE");
        setRankingHub(data.hub);
        setRankingHubLoaded(true);
        if (data.players?.length) setRankingScopedPlayers((current) => mergeDirectoryPlayers(current, data.players));
      } catch {
        setRankingHubLoadError(true);
      } finally {
        rankingHubInFlight.current = null;
      }
    })();
    rankingHubInFlight.current = task;
    return task;
  }, [rankingHubLoaded]);

  const warmPlayerDirectoryView = useCallback(() => {
    void loadPlayerDirectoryModule()
      .then(() => setDirectoryModuleLoaded(true))
      .catch(() => setDirectoryLoadError(true));
    void ensurePlayerDirectory();
  }, [ensurePlayerDirectory]);

  const warmDataView = useCallback(() => {
    void loadDataContentModule()
      .then(() => setDataModuleLoaded(true))
      .catch(() => setRankingHubLoadError(true));
    void ensureRankingHub();
  }, [ensureRankingHub]);

  const warmRootView = useCallback((view: MainView) => {
    if (view === "players") warmPlayerDirectoryView();
    if (view === "data") warmDataView();
  }, [warmDataView, warmPlayerDirectoryView]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (activeView === "players") warmPlayerDirectoryView();
      if (activeView === "data") warmDataView();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeView, warmDataView, warmPlayerDirectoryView]);

  useEffect(() => {
    if (detail?.type !== "event" || detail.tab !== "schedule") return;
    const event = eventBySlug.get(detail.slug);
    if (!event || event.status !== "live" || scheduleAutoFocusedEvents.current.has(event.id)) return;
    const target = scheduleFocusMatch(event);
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      const element = Array.from(document.querySelectorAll<HTMLElement>("[data-schedule-match-id]"))
        .find((node) => node.dataset.scheduleMatchId === target.id);
      if (!element) return;
      scheduleAutoFocusedEvents.current.add(event.id);
      element.scrollIntoView({ block: "center", behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [detail, eventBySlug]);

  useEffect(() => {
    const updateClientNow = () => setClientNow(Date.now());
    updateClientNow();
    const timer = window.setInterval(updateClientNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const pollReferenceTime = sourceHealth?.fetchedAt && Number.isFinite(Date.parse(sourceHealth.fetchedAt)) ? Date.parse(sourceHealth.fetchedAt) : clientNow;
  const selectedMatchForPolling = detail?.type === "match"
    ? eventBySlug.get(detail.eventSlug)?.rounds.flatMap((round) => round.matches).find((match) => match.id === detail.matchId)
    : undefined;
  const shouldPollLive = detail?.type === "match"
    ? Boolean(selectedMatchForPolling && shouldPollMatch(selectedMatchForPolling, pollReferenceTime))
    : databaseEvents.some((event) => allMatches(event).some((match) => shouldPollMatch(match, pollReferenceTime)));
  const liveRefreshState = useRef<{ events: SnookerEvent[]; detail: DetailState | null }>({
    events: databaseEvents,
    detail,
  });
  const liveRefreshInFlight = useRef(false);

  useEffect(() => {
    liveRefreshState.current = { events: databaseEvents, detail };
  }, [databaseEvents, detail]);

  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (liveRefreshInFlight.current) return;
    liveRefreshInFlight.current = true;
    setRefreshing(true);
    try {
      const currentEvents = liveRefreshState.current.events;
      const currentDetail = liveRefreshState.current.detail;
      if (currentDetail?.type === "match") {
        await ensureMatchDetail(currentDetail.matchId, { silent: true });
        return;
      }

      const now = Date.now();
      const pollingMatches = currentEvents.flatMap((event) => allMatches(event)).filter((match) => shouldPollMatch(match, now)).sort((a, b) => {
        const priorityFor = (match: SnookerMatch) => match.status === "live" || match.status === "session-break" ? 0 : match.status === "upcoming" ? 1 : 2;
        return priorityFor(a) - priorityFor(b) || (scheduledTime(a) ?? Number.POSITIVE_INFINITY) - (scheduledTime(b) ?? Number.POSITIVE_INFINITY);
      });
      const matchIds = [...new Set(pollingMatches
        .map((match) => dbMatchUuid(match))
        .filter((id): id is string => Boolean(id)))].slice(0, 64);
      if (!matchIds.length) return;

      const response = await fetch(`/api/snooker/v1/home-live?ids=${encodeURIComponent(matchIds.join(","))}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json() as HomeLiveResponse;
      if (!response.ok || !data.ok || !data.matches) throw new Error("HOME_LIVE_UNAVAILABLE");

      const changedAt = data.fetchedAt ?? new Date().toISOString();
      const clientIdByDbId = new Map<string, string>();
      for (const event of currentEvents) {
        for (const match of allMatches(event)) {
          const uuid = dbMatchUuid(match);
          if (uuid) clientIdByDbId.set(uuid, match.id);
        }
      }
      const updatedEntries = data.matches.flatMap((row) => {
        const clientId = clientIdByDbId.get(row.id);
        return clientId ? [[clientId, row.source_updated_at ?? changedAt] as const] : [];
      });

      setDatabaseEvents((current) => current.map((event) => mergeHomeLiveEvent(event, data.matches!)));
      setSnapshot((current) => ({
        ...current,
        event: mergeHomeLiveEvent(current.event, data.matches!),
        builtAt: changedAt,
      }));
      if (updatedEntries.length) {
        setMatchUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(updatedEntries) }));
      }
      setSourceHealth({
        online: true,
        accepted: true,
        fetchedAt: changedAt,
        message: "轻量实时比分已同步；完整逐局和统计仅在比赛详情读取。",
        sourceLabel: "Supabase · 轻量实时比分",
        cacheSeconds: 0,
      });
    } catch {
      setSourceHealth((current) => current ? {
        ...current,
        accepted: false,
        message: "实时比分暂时不可用，继续显示最近成功数据。",
      } : current);
    } finally {
      liveRefreshInFlight.current = false;
      setRefreshing(false);
    }
  }, [ensureMatchDetail]);

  useEffect(() => {
    if (!shouldPollLive) return;
    const firstRefreshFrame = window.requestAnimationFrame(() => void refresh());
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(firstRefreshFrame);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [shouldPollLive, refresh]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const playerSlug = params.get("player")?.trim();
      const viewParam = params.get("view");
      const urlView: MainView = viewParam === "matches" || viewParam === "players" || viewParam === "data" ? viewParam : "home";
      const state = event.state as SnookerHistoryState | null;

      if (playerSlug) {
        setRequestedTechnicalMetric(null);
        setActiveView("players");
        setDetail({ type: "player", slug: playerSlug, returnView: "players" });
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (urlView === "data" && params.get("section") === "rankings") {
        const key = rankingKeyFromParam(params.get("list"));
        const section = rankingSectionFromParam(params.get("group"));
        setRequestedTechnicalMetric(null);
        setSelectedRankingKey(key);
        setRankingSection(section);
        setActiveView("data");
        setDetail({ type: "ranking", section, key });
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (urlView === "data" && params.get("section") === "technical") {
        setDetail(null);
        setRequestedTechnicalMetric((params.get("metric") || null) as SnookerTechnicalMetricKey | null);
        setActiveView("data");
        void ensureRankingHub();
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (state?.snookerOrigin && state.snookerReturnDetail) {
        setRequestedTechnicalMetric(null);
        setActiveView(state.snookerReturnView ?? state.snookerView ?? urlView);
        setDetail(state.snookerReturnDetail);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      setRequestedTechnicalMetric(null);
      setDetail(null);
      setActiveView(urlView);
      if (urlView === "players") {
        window.requestAnimationFrame(() => window.scrollTo({ top: playerDirectoryScrollY.current, behavior: "auto" }));
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [ensureRankingHub]);

  const today = chinaToday();
  const seasonCalendar = useMemo(() => [...snapshot.calendar].filter((item) => item.season === initialCurrentSeason).sort((a, b) => a.startDate.localeCompare(b.startDate)), [snapshot.calendar, initialCurrentSeason]);
  const mainSeasonEvents = useMemo(() => seasonCalendar.filter((item) => item.eventStage !== "qualifier" && item.eventType !== "pro_qualifier" && item.typeZh !== "资格赛"), [seasonCalendar]);
  const activeEventCard = mainSeasonEvents.find((item) => isActiveOn(item, today));
  const graceEventCard = [...mainSeasonEvents].reverse().find((item) => item.endDate < today && addDateDays(item.endDate, 1) === today);
  const firstUpcomingMain = mainSeasonEvents.find((item) => item.startDate > today);
  const featuredEventCard = activeEventCard ?? firstUpcomingMain ?? graceEventCard ?? [...mainSeasonEvents].reverse()[0];
  const nextEventCard = featuredEventCard ? mainSeasonEvents.find((item) => item.startDate > featuredEventCard.startDate) : firstUpcomingMain;
  const seasonOptions = useMemo(() => seasonOptionsFromCurrent(initialCurrentSeason), [initialCurrentSeason]);
  const selectedSeasonEvents = useMemo(() => effectiveCalendarEvents
    .filter((item) => item.season === selectedSeason)
    .sort((a, b) => a.startDate.localeCompare(b.startDate)), [effectiveCalendarEvents, selectedSeason]);
  const selectedSeasonLoaded = loadedCalendarSeasons.includes(selectedSeason);
  const selectedSeasonLoading = loadingCalendarSeasons.includes(selectedSeason);
  const selectedSeasonLoadError = calendarLoadErrorSeasons.includes(selectedSeason);
  const firstUpcomingCurrent = mainSeasonEvents.find((item) => item.startDate > today);
  const recentFeaturedEvent = activeEventCard;
  const recentCompletedEvents = [...mainSeasonEvents]
    .filter((item) => item.endDate < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 3);
  const recentCardEvents = [firstUpcomingCurrent, ...recentCompletedEvents]
    .filter((item): item is SnookerCalendarEvent => Boolean(item) && item?.id !== recentFeaturedEvent?.id)
    .slice(0, 4);

  const rankingRows = useMemo(() => snapshot.rankings
    .map((row) => ({ ...row, player: players.get(row.playerId) }))
    .filter((row): row is typeof row & { player: SnookerPlayer } => Boolean(row.player))
    .sort((a, b) => a.rank - b.rank), [snapshot.rankings, players]);
  const chinaTop16 = rankingRows.filter((row) => row.rank <= 16 && isChina(row.player));

  const ensureEventDetail = (slug: string) => {
    const inFlight = eventDetailInFlight.current.get(slug);
    if (inFlight) return inFlight;
    const existing = eventBySlug.get(slug);
    if (existing && !existing.detailPartial && !allMatches(existing).some((match) => match.status === "live" || match.status === "session-break")) return Promise.resolve();
    setLoadingEventSlugs((current) => current.includes(slug) ? current : [...current, slug]);
    setEventLoadErrorSlugs((current) => current.filter((item) => item !== slug));
    const task = (async () => {
      try {
        const response = await fetch(`/api/snooker/v1/event?slug=${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json() as { ok?: boolean; event?: SnookerEvent; players?: SnookerPlayer[] };
        if (!response.ok || !data.ok || !data.event) throw new Error("EVENT_DETAIL_UNAVAILABLE");
        mergeScopedPlayers(data.players);
        setDatabaseEvents((current) => {
          const index = current.findIndex((event) => event.slug === slug);
          if (index < 0) return [...current, data.event!];
          const next = [...current];
          next[index] = mergeEventSnapshotsMonotonic([current[index]], [data.event!])[0] ?? current[index];
          return next;
        });
      } catch {
        setEventLoadErrorSlugs((current) => current.includes(slug) ? current : [...current, slug]);
      } finally {
        eventDetailInFlight.current.delete(slug);
        setLoadingEventSlugs((current) => current.filter((item) => item !== slug));
      }
    })();
    eventDetailInFlight.current.set(slug, task);
    return task;
  };
  const openEvent = (slug: string, tab: EventTab = "overview") => {
    if (detail === null) {
      eventReturnState.current = { view: activeView, mode: eventListMode, season: selectedSeason, scrollY: window.scrollY };
    }
    setDetail({ type: "event", slug, tab });
    void ensureEventDetail(slug);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeEvent = () => {
    const restore = eventReturnState.current;
    setDetail(null);
    if (restore) {
      setActiveView(restore.view);
      if (restore.view === "matches") {
        setEventListMode(restore.mode);
        setSelectedSeason(restore.season);
      }
      window.requestAnimationFrame(() => window.scrollTo({ top: restore.scrollY, behavior: "auto" }));
    }
    eventReturnState.current = null;
    matchReturnState.current = null;
  };
  const openMatch = (matchId: string, eventSlug: string) => {
    if (detail?.type === "event" && detail.slug === eventSlug) {
      matchReturnState.current = { kind: "event", slug: eventSlug, tab: detail.tab, scrollY: window.scrollY };
    } else {
      matchReturnState.current = { kind: "root", view: activeView, scrollY: window.scrollY };
    }
    void ensureEventDetail(eventSlug);
    void ensureMatchDetail(matchId);
    setMatchDataTab("match");
    setDetail({ type: "match", matchId, eventSlug });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeMatch = (eventSlug: string) => {
    const restore = matchReturnState.current;
    if (restore?.kind === "event" && restore.slug === eventSlug) {
      setDetail({ type: "event", slug: eventSlug, tab: restore.tab });
      window.requestAnimationFrame(() => window.scrollTo({ top: restore.scrollY, behavior: "auto" }));
    } else if (restore?.kind === "root") {
      setDetail(null);
      setActiveView(restore.view);
      window.requestAnimationFrame(() => window.scrollTo({ top: restore.scrollY, behavior: "auto" }));
    } else {
      setDetail(null);
      setActiveView("home");
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    matchReturnState.current = null;
  };
  const openPlayer = (playerId: string) => {
    const target = players.get(playerId);
    if (!target?.slug) return;

    if (activeView === "players" && detail === null) playerDirectoryScrollY.current = window.scrollY;
    prefetchPlayerExperience(target.slug, target.avatarUrl || target.avatar?.url || null, "high");

    const returnDetail = detail;
    const returnView = activeView;
    const currentState: SnookerHistoryState = { snookerView: returnView, snookerOrigin: true, snookerReturnView: returnView, snookerReturnDetail: returnDetail };
    window.history.replaceState(currentState, "", window.location.href);

    const url = new URL(window.location.href);
    url.searchParams.set("view", "players");
    url.searchParams.set("player", target.slug);
    const nextUrl = url.pathname + url.search + url.hash;
    window.history.pushState({ snookerView: "players", snookerPlayerDetail: target.slug }, "", nextUrl);

    setActiveView("players");
    setDetail({ type: "player", slug: target.slug, returnView });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openPlayerBySlug = (slug: string) => {
    const target = [...players.values()].find((player) => player.slug === slug);
    if (target) {
      openPlayer(target.id);
      return;
    }
    const directoryTarget = dataPlayers.find((player) => player.slug === slug);
    const returnDetail = detail;
    const returnView = activeView;
    const currentState: SnookerHistoryState = { snookerView: returnView, snookerOrigin: true, snookerReturnView: returnView, snookerReturnDetail: returnDetail };
    window.history.replaceState(currentState, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "players");
    url.searchParams.set("player", slug);
    window.history.pushState({ snookerView: "players", snookerPlayerDetail: slug }, "", url.pathname + url.search + url.hash);
    if (directoryTarget) prefetchPlayerExperience(slug, directoryTarget.avatarUrl, "high");
    setActiveView("players");
    setDetail({ type: "player", slug, returnView });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closePlayer = () => {
    if (detail?.type !== "player") return;
    const state = window.history.state as SnookerHistoryState | null;
    if (state?.snookerPlayerDetail === detail.slug && window.history.length > 1) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("view", "players");
    url.searchParams.delete("player");
    window.history.replaceState({ snookerView: "players" }, "", url.pathname + url.search + url.hash);
    setDetail(null);
    setActiveView("players");
    window.requestAnimationFrame(() => window.scrollTo({ top: playerDirectoryScrollY.current, behavior: "auto" }));
  };
  const openRankings = (key: SnookerCurrentRankingKey) => {
    setSelectedRankingKey(key);
    setRankingSection("current");
    window.history.replaceState({ snookerView: activeView }, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "rankings");
    url.searchParams.set("list", key);
    url.searchParams.set("group", "current");
    window.history.pushState({ snookerView: "data", snookerRankingDetail: true }, "", url.pathname + url.search + url.hash);
    setActiveView("data");
    setDetail({ type: "ranking", section: "current", key });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const updateRankingDetail = (section: SnookerRankingSection, key: SnookerCurrentRankingKey = selectedRankingKey) => {
    setSelectedRankingKey(key);
    setRankingSection(section);
    setDetail({ type: "ranking", section, key });
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.set("section", "rankings");
    url.searchParams.set("list", key);
    url.searchParams.set("group", section);
    window.history.replaceState({ snookerView: "data", snookerRankingDetail: true }, "", url.pathname + url.search + url.hash);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeRankings = () => {
    const state = window.history.state as SnookerHistoryState | null;
    if (state?.snookerRankingDetail && window.history.length > 1) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    url.searchParams.delete("list");
    url.searchParams.delete("group");
    window.history.replaceState({ snookerView: "data" }, "", url.pathname + url.search + url.hash);
    setDetail(null);
    setActiveView("data");
  };
  const openTechnicalFromHome = (key: HomeLeaderMetricKey) => {
    window.history.replaceState({ snookerView: activeView }, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "technical");
    url.searchParams.set("metric", key);
    url.searchParams.delete("honour");
    url.searchParams.delete("list");
    url.searchParams.delete("group");
    window.history.pushState({ snookerView: "data", snookerTechnicalDetail: key }, "", url.pathname + url.search + url.hash);
    setRequestedTechnicalMetric(key);
    setDetail(null);
    setActiveView("data");
    warmDataView();
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const changeView = (view: NavId) => {
    eventReturnState.current = null;
    matchReturnState.current = null;
    setRequestedTechnicalMetric(null);
    setDetail(null);
    const nextUrl = rootUrl(view);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) window.history.pushState({ snookerView: view }, "", nextUrl);
    else window.history.replaceState({ snookerView: view }, "", nextUrl);
    window.dispatchEvent(new Event("snooker:root-navigation"));
    setActiveView(view);
    warmRootView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (detail?.type === "player") {
    const summaryPlayer = [...players.values()].find((player) => player.slug === detail.slug);
    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={styles.detailHeader}><button onClick={closePlayer}>‹</button><strong>{summaryPlayer?.nameZh ?? "球员详情"}</strong><span>PLAYER</span></header>
      <PlayerDetailInline key={detail.slug} summaryPlayer={summaryPlayer} slug={detail.slug} />
    </div></main>;
  }

  if (detail?.type === "ranking") {
    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={styles.detailHeader}><button onClick={closeRankings}>‹</button><strong>排名</strong><span>DATA</span></header>
      <RankingDetailContent
        hub={rankingHub}
        players={dataPlayers}
        selectedKey={selectedRankingKey}
        section={rankingSection}
        onSelectKey={(key) => updateRankingDetail(rankingSection, key)}
        onSelectSection={(section) => updateRankingDetail(section)}
        onOpenPlayer={openPlayerBySlug}
      />
    </div></main>;
  }

  if (detail?.type === "match") {
    const selectedEvent = eventBySlug.get(detail.eventSlug);
    if (!selectedEvent) {
      return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
        <header className={styles.detailHeader}><button onClick={() => closeMatch(detail.eventSlug)}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>
        <section className={styles.card}><div className={styles.emptyState}>{eventLoadErrorSlugs.includes(detail.eventSlug) ? "比赛所属赛事加载失败，请稍后重试。" : "正在加载比赛信息…"}</div>{eventLoadErrorSlugs.includes(detail.eventSlug) ? <button className={styles.fullButton} onClick={() => void ensureEventDetail(detail.eventSlug)}>重新加载</button> : null}</section>
      </div></main>;
    }
    const match = allMatches(selectedEvent).find((item) => item.id === detail.matchId);
    if (!match) {
      return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
        <header className={styles.detailHeader}><button onClick={() => closeMatch(detail.eventSlug)}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>
        <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlugs.includes(detail.eventSlug) ? "正在加载比赛信息…" : "未找到这场比赛，请返回赛程重新选择。"}</div></section>
      </div></main>;
    }
    const p1 = players.get(match.player1Id) ?? fallbackPlayer(match.player1Id);
    const p2 = players.get(match.player2Id) ?? fallbackPlayer(match.player2Id);
    const s1 = match.statistics?.find((stat) => stat.playerId === p1.id);
    const s2 = match.statistics?.find((stat) => stat.playerId === p2.id);
    const season1 = p1.seasonStatistics;
    const season2 = p2.seasonStatistics;
    const isCurrentSeasonMatch = selectedEvent.season === initialCurrentSeason;
    const hasStats = Boolean(s1 || s2);
    const hasSeason = isCurrentSeasonMatch && Boolean(season1 || season2);
    const h2h = match.headToHead;
    const hasH2h = isCurrentSeasonMatch && Boolean(h2h);
    const selectedDataTab: MatchDataTab = !isCurrentSeasonMatch
      ? "match"
      : matchDataTab === "match" && !hasStats
        ? hasSeason ? "season" : hasH2h ? "h2h" : "match"
        : matchDataTab === "season" && !hasSeason
          ? hasStats ? "match" : "h2h"
          : matchDataTab === "h2h" && !hasH2h
            ? hasStats ? "match" : "season"
            : matchDataTab;
    const hasMatchupData = isCurrentSeasonMatch ? hasStats || hasSeason || hasH2h : hasStats;
    const statusLabel = matchDisplayStatus(match);
    const realtime = match.status === "live" || match.status === "session-break";
    const completedFrameCount = Number(match.score1 ?? 0) + Number(match.score2 ?? 0);
    const liveFrameNo = match.liveFrameNo ?? match.frames?.at(-1)?.frameNo ?? null;
    const updated = new Date(match.sourceUpdatedAt ?? matchUpdatedAt[match.id] ?? selectedEvent.snapshotAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Shanghai",
    });
    const localized = (name?: string) => [...players.values()].find((player) => player.nameEn.toLowerCase() === String(name ?? "").toLowerCase())?.nameZh ?? name ?? "";
    const statRows: Array<[string, keyof SnookerMatchPlayerStatistics, string]> = [
      ["总得分", "totalPoints", ""],
      ["平均出杆", "averageShotTimeSeconds", "秒"],
      ["进球成功率", "potRate", "%"],
      ["50+", "breaks50Plus", ""],
      ["破百", "breaks100Plus", ""],
      ["最高单杆", "highestBreak", ""],
      ["出杆数", "shotsTaken", ""],
      ["上台时间", "timeOnTablePct", "%"],
    ];
    const seasonRows: Array<[string, keyof SnookerSeasonStatistics, string]> = [
      ["世界排名", "ranking", ""],
      ["赛事冠军", "tournamentsWon", ""],
      ["比赛场次", "matchesPlayed", ""],
      ["获胜场次", "matchesWon", ""],
      ["比赛胜率", "matchWinRate", "%"],
      ["总得分", "pointsScored", ""],
      ["平均出杆", "averageShotTimeSeconds", "秒"],
      ["50+", "breaks50Plus", ""],
      ["破百", "breaks100Plus", ""],
      ["最高单杆", "highestBreak", ""],
      ["147", "season147s", ""],
      ["平均单杆", "averageBreak", ""],
    ];

    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={styles.detailHeader}><button onClick={() => closeMatch(selectedEvent.slug)}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>
      <section className={styles.matchHero}>
        <div className={styles.matchHeroMeta}><span>{!isCurrentSeasonMatch ? `${selectedEvent.season}赛季 · 历史赛事 · ` : ""}{match.roundLabelZh} · {match.timeLabelZh ?? "比赛时间待定"}</span><b>{bestOfLabel(match.bestOf)}</b></div>
        <h1>{selectedEvent.nameZh}</h1>
        <div className={styles.versusGrid}>
          <div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p1} size="xl" />{match.winnerId === p1.id ? <em>胜</em> : null}{match.status === "walkover" && match.winnerId && match.winnerId !== p1.id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><strong>{p1.nameZh}</strong><small>{p1.nameEn}</small></div>
          <div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : <><span>{match.score1 ?? "-"}</span> <i className={match.status === "live" ? priority.liveSeparator : ""}>-</i> <span>{match.score2 ?? "-"}</span></>}</strong><StatusPill status={match.status} label={statusLabel} /><small>{match.matchNo ? `#${match.matchNo}` : ""}</small>{realtime ? <small>{refreshing ? "正在更新…" : `最近更新 ${updated}`}</small> : null}</div>
          <div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p2} size="xl" />{match.winnerId === p2.id ? <em>胜</em> : null}{match.status === "walkover" && match.winnerId && match.winnerId !== p2.id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><strong>{p2.nameZh}</strong><small>{p2.nameEn}</small></div>
        </div>
      </section>

      <section className={styles.frameSection}>
        <div className={styles.frameHead}><span>单杆<br />(50+)</span><span>分数</span><b>局</b><span>分数</span><span>单杆<br />(50+)</span></div>
        {match.frames?.length ? match.frames.map((frame) => {
          const frameComplete = frame.frameNo <= completedFrameCount && frame.score1 !== frame.score2;
          const leftWon = frameComplete && frame.score1 > frame.score2;
          const rightWon = frameComplete && frame.score2 > frame.score1;
          const liveFrame = match.status === "live" && frame.frameNo === liveFrameNo;
          const leftStriking = liveFrame && match.currentPlayerSide === "home";
          const rightStriking = liveFrame && match.currentPlayerSide === "away";
          return <div className={styles.frameRow} style={{ minHeight: 50 }} key={frame.frameNo}>
            <span>{frame.break1 ?? "-"}</span>
            <strong className={`${leftWon ? liveIndicator.frameWinnerScore : ""} ${leftStriking ? liveIndicator.scoreAnchor : ""}`}>{frame.score1}{leftStriking ? <i className={liveIndicator.strikerDot} data-side="home" aria-hidden="true" title={`${p1.nameZh}正在击球`} /> : null}</strong>
            <b>{frame.frameNo}</b>
            <strong className={`${rightWon ? liveIndicator.frameWinnerScore : ""} ${rightStriking ? liveIndicator.scoreAnchor : ""}`}>{frame.score2}{rightStriking ? <i className={liveIndicator.strikerDot} data-side="away" aria-hidden="true" title={`${p2.nameZh}正在击球`} /> : null}</strong>
            <span>{frame.break2 ?? "-"}</span>
          </div>;
        }) : <div className={styles.emptyFrames}>{loadingMatchId === match.id ? "正在加载逐局比分…" : matchLoadError === match.id ? "逐局比分加载失败，当前先显示比赛总比分。" : match.status === "upcoming" ? "比赛尚未开始，开赛后可查看逐局比分。" : "暂无逐局比分，当前仅显示比赛总比分。"}</div>}
      </section>

      {hasMatchupData ? <section className={polish.matchupCard}>
        <div className={polish.matchupHeader}><small>MATCHUP DATA</small><h2>{isCurrentSeasonMatch ? "对阵数据" : "比赛统计"}</h2></div>
        <div className={polish.matchupPlayers}>
          <MatchupPlayer player={p1} />
          <div className={polish.matchupVs}>VS</div>
          <MatchupPlayer player={p2} />
        </div>
        {isCurrentSeasonMatch ? <div className={polish.dataTabs} aria-label="对阵数据切换">
          <button disabled={!hasStats} className={selectedDataTab === "match" ? polish.dataTabActive : ""} onClick={() => setMatchDataTab("match")}><span>本场</span><small>MATCH</small></button>
          <button disabled={!hasSeason} className={selectedDataTab === "season" ? polish.dataTabActive : ""} onClick={() => setMatchDataTab("season")}><span>赛季</span><small>SEASON</small></button>
          <button disabled={!hasH2h} className={selectedDataTab === "h2h" ? polish.dataTabActive : ""} onClick={() => setMatchDataTab("h2h")}><span>交手</span><small>H2H</small></button>
        </div> : null}

        {hasStats && (!isCurrentSeasonMatch || selectedDataTab === "match") ? <div className={polish.dataPanel}>
          <div className={polish.panelMeta}><span>本场统计</span><b>{match.roundLabelZh}</b></div>
          <div className={polish.compareGrid}>{statRows.map(([label, key, suffix]) => <div key={label} style={{ display: "contents" }}><div className={polish.compareLeft}>{statValue(s1, key, suffix)}</div><div className={polish.compareLabel}>{label}</div><div className={polish.compareRight}>{statValue(s2, key, suffix)}</div></div>)}</div>
          <p className={polish.dataHint}>{realtime ? "本场数据会随比赛进程更新。" : "本场统计以赛事官方最终数据为准。"}</p>
        </div> : null}

        {isCurrentSeasonMatch && selectedDataTab === "season" && hasSeason ? <div className={polish.dataPanel}>
          <div className={polish.panelMeta}><span>赛季表现对比</span><b>{season1?.seasonLabel ?? season2?.seasonLabel ?? initialCurrentSeason}</b></div>
          <div className={polish.compareGrid}>{seasonRows.map(([label, key, suffix]) => <div key={label} style={{ display: "contents" }}><div className={polish.compareLeft}>{seasonValue(season1, key, suffix)}</div><div className={polish.compareLabel}>{label}</div><div className={polish.compareRight}>{seasonValue(season2, key, suffix)}</div></div>)}</div>
          <p className={polish.dataHint}>本赛季数据会随比赛结果更新。</p>
        </div> : null}

        {isCurrentSeasonMatch && selectedDataTab === "h2h" && h2h ? <div className={`${polish.dataPanel} ${polish.h2hPanel}`}>
          <div className={polish.h2hPanelHeader}><span>交手记录</span><b>赛前 {h2h.meetings} 次</b></div>
          <div className={insight.h2hSummary}><div className={insight.h2hSide}><strong>{h2h.player1Wins}</strong><span>{p1.nameZh} 胜</span></div><div className={insight.h2hMiddle}><strong>{h2h.player1Frames} : {h2h.player2Frames}</strong><small>总局分</small></div><div className={insight.h2hSide}><strong>{h2h.player2Wins}</strong><span>{p2.nameZh} 胜</span></div></div>
          {h2h.recentMeetings.length ? <div className={insight.h2hHistory}>{h2h.recentMeetings.map((item, index) => <div className={insight.h2hMeeting} key={`${item.date}-${index}`}><time>{meetingDate(item)}</time><div><small>{localizedTournamentLabel(item.tournament, effectiveCalendarEvents)}{item.round ? ` · ${localizedRoundLabel(item.round)}` : ""}</small><strong>{localized(item.homePlayerName)} {item.homeScore ?? "-"} : {item.awayScore ?? "-"} {localized(item.awayPlayerName)}</strong></div></div>)}</div> : <div className={insight.noHistory}>两人此前暂无正式比赛交手记录。</div>}
        </div> : null}
      </section> : null}

      {realtime ? <div className={styles.liveFooter}><i className={sourceHealth?.accepted ? styles.liveOk : styles.liveWait} /><span>比赛数据实时更新</span><small>更新于 {formatUpdatedAt(sourceHealth?.fetchedAt)}</small></div> : null}
    </div></main>;
  }

  if (detail?.type === "event") {
    const calendarEvent = effectiveCalendarEvents.find((item) => item.slug === detail.slug) ?? snapshot.calendar.find((item) => item.slug === detail.slug) ?? featuredEventCard;
    const full = eventBySlug.get(detail.slug);
    if (!calendarEvent) return null;
    const qualificationEvent = isQualificationEvent(calendarEvent);
    const isHistoricalEvent = calendarEvent.season !== initialCurrentSeason;
    const eventDetails = full ? [full] : [];
    const eventMatches = eventDetails.flatMap((event) => allMatches(event));
    const finalEvent = !qualificationEvent && full && finalOf(full) ? full : undefined;
    const final = finalEvent ? finalOf(finalEvent) : undefined;
    const champion = final?.winnerId ? players.get(final.winnerId) : undefined;
    const eventStats = eventDetails.length ? {
      matches: eventMatches.length,
      players: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id])).size,
      china: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter((id) => isChina(players.get(id)))).size,
      completed: eventMatches.filter((match) => match.status === "completed" || match.status === "walkover").length,
      partial: eventDetails.some((event) => event.schedulePartial),
    } : null;
    const eventPlayerStats = full ? full.playerStats ?? fallbackEventPlayerStats(full) : [];
    const finalFour = !qualificationEvent && full ? tournamentFinalFour(full) : null;
    const highestBreakStats = [...eventPlayerStats]
      .filter((stats) => stats.highestBreak !== undefined)
      .sort((a, b) => (b.highestBreak ?? 0) - (a.highestBreak ?? 0) || b.breaks100Plus - a.breaks100Plus)[0];
    const highestBreakPlayer = highestBreakStats ? players.get(highestBreakStats.playerId) : undefined;
    const topWinRateStats = [...eventPlayerStats]
      .filter((stats) => stats.matchesPlayed > 0 && stats.matchesWon > 0)
      .sort((a, b) => (b.matchesWon / b.matchesPlayed) - (a.matchesWon / a.matchesPlayed)
        || b.matchesWon - a.matchesWon
        || (b.framesWon - b.framesLost) - (a.framesWon - a.framesLost))[0];
    const topWinRatePlayer = topWinRateStats ? players.get(topWinRateStats.playerId) : undefined;
    const topWinRate = topWinRateStats ? Math.round(100 * topWinRateStats.matchesWon / topWinRateStats.matchesPlayed) : null;
    const centuries = full?.breakStatsAvailable ? eventPlayerStats.reduce((sum, stats) => sum + stats.breaks100Plus, 0) : null;
    const maximums = full?.breakStatsAvailable ? eventPlayerStats.reduce((sum, stats) => sum + stats.maximums, 0) : null;
    const chinaStats = !qualificationEvent && full ? eventPlayerStats
      .map((stats) => {
        const player = players.get(stats.playerId);
        return player && isChina(player) ? { player, stats } : null;
      })
      .filter((item): item is { player: SnookerPlayer; stats: SnookerEventPlayerStats } => Boolean(item))
      .sort((a, b) => eventResultPriority(full, a.stats) - eventResultPriority(full, b.stats)
        || b.stats.matchesWon - a.stats.matchesWon
        || a.player.nameZh.localeCompare(b.player.nameZh, "zh-CN")) : [];
    const prizeEvent = full;
    const totalPrize = prizeEvent?.prizes?.find((row) => row.isTotal);
    const overviewStart = calendarEvent.startDate;
    const overviewEnd = calendarEvent.endDate;
    const overviewCountry = calendarEvent.countryZh;
    const overviewCity = calendarEvent.cityZh;
    const overviewVenue = calendarEvent.venueZh;

    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={`${styles.detailHeader} ${priority.eventNameHeader}`}><button onClick={closeEvent}>‹</button><strong>{calendarEvent.nameZh}</strong><span>{calendarEvent.season}</span></header>
      <section className={styles.eventDetailHero}><div className={styles.eventDetailTop}><StatusPill status={calendarEvent.status} label={calendarEvent.statusLabelZh} /><span>{eventDetailTypeLabel(calendarEvent)}</span></div><h1>{calendarEvent.nameZh}</h1><p>{calendarEvent.nameEn}</p><div className={styles.eventDetailMeta}>{isHistoricalEvent ? <span>{calendarEvent.season}赛季 · 历史赛事</span> : null}<span>{formatDateRange(overviewStart, overviewEnd)}</span><span>{overviewCountry} · {overviewCity}</span></div></section>
      <div className={styles.eventTabs}><button className={detail.tab === "overview" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "overview" })}>赛事介绍</button><button className={detail.tab === "schedule" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "schedule" })}>赛程</button><button className={detail.tab === "data" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "data" })}>赛事数据</button></div>

      {detail.tab === "overview" ? <>
        {!qualificationEvent && calendarEvent.status === "completed" && !full && loadingEventSlugs.includes(detail.slug) ? <section className={`${polish.championCard} ${polish.championCardLoading}`} aria-label="正在加载本届冠军"><div className={polish.championLoadingMark}>冠</div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>正在读取冠军信息…</strong><span>决赛结果与赛程同步加载中</span></div></section> : null}
        {finalEvent?.status === "completed" && champion ? <section className={polish.championCard}><div className={polish.championAvatar}><PlayerAvatar player={champion} size="md" /><span>冠</span></div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>{champion.nameZh}</strong><span>{champion.nameEn}</span></div>{final ? <div className={polish.championScore}><small>FINAL</small><b>{final.score1}:{final.score2}</b></div> : null}</section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW" title="赛事概览" /><div className={insight.eventOverviewGrid}><article><span>赛季</span><b>{calendarEvent.season}</b></article><article><span>赛事类型</span><b>{eventDetailTypeLabel(calendarEvent)}</b></article><article><span>比赛日期</span><b>{formatDateRange(overviewStart, overviewEnd)}</b></article><article><span>举办地</span><b>{overviewCountry} · {overviewCity}</b></article>{!qualificationEvent && prizeEvent?.previousChampionZh ? <article><span>上届冠军{prizeEvent.previousChampionYear ? ` · ${prizeEvent.previousChampionYear}` : ""}</span><b>{prizeEvent.previousChampionZh}</b></article> : null}{overviewVenue ? <article><span>场馆</span><b>{overviewVenue}</b></article> : null}</div></section>
        {!qualificationEvent && prizeEvent?.prizes?.length ? <section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY" title="奖金分配" action={totalPrize ? `总奖金 ${money(totalPrize.amount)}` : undefined} /><div className={polish.prizeTable}>{[...prizeEvent.prizes].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => <div className={`${polish.prizeRow} ${row.isTotal ? polish.prizeTotal : ""}`} key={row.key}><span>{row.labelZh}</span><b>{money(row.amount)}</b></div>)}</div></section> : null}
      </> : null}

      {detail.tab === "schedule" ? full ? <div className={styles.roundStack}>
        {full.schedulePartial ? <div className={insight.partialNotice}><b>赛程陆续公布中</b><span className={polish.partialText}>目前已公布 {full.publishedMatchCount ?? allMatches(full).length} 场比赛，更多赛程公布后将在这里更新。</span></div> : null}
        {orderedScheduleRounds(full).map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}
      </div> : <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlugs.includes(detail.slug) ? "正在加载赛程…" : eventLoadErrorSlugs.includes(detail.slug) ? "赛程加载失败，请稍后重试。" : "详细赛程暂未公布。"}</div>{eventLoadErrorSlugs.includes(detail.slug) ? <button className={styles.fullButton} onClick={() => void ensureEventDetail(detail.slug)}>重新加载</button> : null}</section> : null}

      {detail.tab === "data" ? eventStats ? <>
        {finalFour ? <section className={styles.card}><SectionHeader eyebrow="FINAL FOUR" title="本届四强" /><div className={styles.finalFourGrid}>{finalFour.map((item, index) => {
          const player = players.get(item.playerId) ?? fallbackPlayer(item.playerId);
          return <button className={index === 0 ? styles.finalFourChampion : index === 1 ? styles.finalFourRunnerUp : ""} key={item.playerId} onClick={() => openPlayer(item.playerId)}><div className={styles.finalFourAvatar}><PlayerAvatar player={player} size="md" /><span>{item.role.slice(0, 1)}</span></div><small>{item.roleEn}</small><strong>{player.nameZh}</strong><em>{item.role} · {item.score}</em></button>;
        })}</div></section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT DATA" title="赛事统计" /><div className={styles.statGrid}><article><small>已公布比赛</small><strong>{eventStats.matches}</strong><span>{eventStats.partial ? "赛程公布中" : "赛程已完整"}</span></article><article><small>参赛球员</small><strong>{eventStats.players}</strong><span>本届赛事</span></article><article><small>中国球员</small><strong>{eventStats.china}</strong><span>本届赛事</span></article><article><small>已完赛</small><strong>{eventStats.completed}</strong><span>{calendarEvent.status === "completed" ? "全部完成" : "截至目前"}</span></article></div></section>
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT HIGHLIGHTS" title="赛事亮点" /><div className={`${styles.statGrid} ${styles.eventHighlights}`}><article><small>最高单杆</small><strong>{highestBreakStats?.highestBreak ?? "—"}</strong><span>{highestBreakPlayer?.nameZh ?? "暂无收录"}</span></article><article><small>胜率最高</small><strong>{topWinRate === null ? "—" : `${topWinRate}%`}</strong><span>{topWinRatePlayer ? `${topWinRatePlayer.nameZh} · ${topWinRateStats?.matchesWon}胜` : "暂无完赛数据"}</span></article><article><small>147次数</small><strong>{maximums ?? "—"}</strong><span>{maximums === null ? "暂无收录" : "本届赛事"}</span></article><article><small>破百总数</small><strong>{centuries ?? "—"}</strong><span>{centuries === null ? "暂无收录" : "本届赛事"}</span></article></div></section>
        {!qualificationEvent ? <section className={styles.card}><SectionHeader eyebrow="CHINA WATCH" title="中国球员战绩" />{chinaStats.length ? <div className={styles.chinaResultList}>{chinaStats.map(({ player, stats }) => <button key={player.id} onClick={() => openPlayer(player.id)}><PlayerAvatar player={player} size="sm" /><span><b>{player.nameZh}</b><small>世界第 {player.currentRank ?? "—"}</small></span><strong>{eventResultLabel(full!, stats)}</strong><em>{stats.matchesWon}胜{stats.matchesLost}负</em></button>)}</div> : <div className={styles.emptyState}>本届赛事暂无中国球员参赛记录。</div>}</section> : null}
      </> : <section className={styles.card}><div className={styles.emptyState}>{eventLoadErrorSlugs.includes(detail.slug) ? "赛事数据加载失败，请稍后重试。" : "赛事数据将在赛程和比赛结果公布后显示。"}</div>{eventLoadErrorSlugs.includes(detail.slug) ? <button className={styles.fullButton} onClick={() => void ensureEventDetail(detail.slug)}>重新加载</button> : null}</section> : null}
    </div></main>;
  }

  const featuredDetail = featuredEventCard ? eventBySlug.get(featuredEventCard.slug) : undefined;
  const headlineSelections = selectHomepageHeadlineMatches(databaseEvents, players);
  const activeHeadlineIndex = Math.min(headlineIndex, Math.max(0, headlineSelections.length - 1));
  const chinaVisibleCount = Math.min(5, chinaTop16.length);
  const chinaMaxRailIndex = Math.max(0, chinaTop16.length - chinaVisibleCount);
  const activeChinaRailIndex = Math.min(chinaRailIndex, chinaMaxRailIndex);
  const chinaGridClass = chinaTop16.length > 5
    ? styles.chinaTopGridScrollable
    : chinaTop16.length === 4
      ? styles.chinaTopGridFour
      : chinaTop16.length === 3
        ? styles.chinaTopGridThree
        : chinaTop16.length === 2
          ? styles.chinaTopGridTwo
          : chinaTop16.length === 1
            ? styles.chinaTopGridOne
            : styles.chinaTopGridFive;

  return <main className={styles.appRoot} data-theme={theme}><div className={styles.shell}>
    <header className={styles.header}>
      <button className={styles.brand} onClick={() => changeView("home")}><span>S</span><div><strong>147数据局</strong><small>中文斯诺克数据平台 · CN SNOOKER STATS</small></div></button>
      <nav className={styles.desktopNav} aria-label="主要导航">{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} aria-current={item.id === activeView ? "page" : undefined} className={item.id === activeView ? styles.desktopNavActive : ""} onPointerEnter={() => warmRootView(item.id)} onFocus={() => warmRootView(item.id)} onTouchStart={() => warmRootView(item.id)} onClick={(event) => { event.preventDefault(); changeView(item.id); }}><span>{item.label}</span><small>{item.labelEn}</small></a>)}</nav>
      <div className={styles.headerRight}><div className={styles.themeSwitch} role="group" aria-label="主题颜色"><button className={theme === "green" ? styles.themeActive : ""} onClick={() => setTheme("green")} aria-pressed={theme === "green"}>绿</button><button className={theme === "red" ? styles.themeActive : ""} onClick={() => setTheme("red")} aria-pressed={theme === "red"}>红</button></div></div>
    </header>
    <div className={`${styles.content} ${activeView === "home" ? styles.contentHome : activeView === "matches" ? styles.contentMatches : activeView === "players" ? styles.contentPlayers : styles.contentData}`}>
      {activeView === "home" ? <>
        <div className={styles.homeLeadGrid}>
          {featuredEventCard ? <section className={styles.hero}><div className={styles.heroTop}><span className={eventStatusClass(featuredEventCard.status)}><StatusPill status={featuredEventCard.status} label={activeEventCard ? "当前赛事" : graceEventCard ? "刚刚结束" : "下一站"} /></span><span>{featuredEventCard.typeZh}</span></div><small>{activeEventCard ? "CURRENT TOURNAMENT" : graceEventCard ? "JUST FINISHED" : "NEXT TOURNAMENT"}</small><h1>{featuredEventCard.nameZh}</h1><p className={styles.heroEventEnglish}>{featuredEventCard.nameEn}</p><p className={styles.heroMeta}>{formatDateRange(featuredEventCard.startDate, featuredEventCard.endDate)} · {featuredEventCard.countryZh} {featuredEventCard.cityZh}</p><div className={styles.heroActions}><button onPointerEnter={() => void ensureEventDetail(featuredEventCard.slug)} onFocus={() => void ensureEventDetail(featuredEventCard.slug)} onTouchStart={() => void ensureEventDetail(featuredEventCard.slug)} onClick={() => openEvent(featuredEventCard.slug, featuredDetail?.rounds.length ? "schedule" : "overview")}>查看赛事</button><button className={styles.secondaryButton} onClick={() => changeView("matches")}>赛事列表</button></div></section> : null}

          {headlineSelections.length ? <div className={priority.headlineViewport}>
          <div className={priority.headlineCarousel} aria-label="焦点比赛" ref={headlineRail} onScroll={(event) => setHeadlineIndex(nearestRailItemIndex(event.currentTarget))}>
          {headlineSelections.map(({ match: headlineMatch, event: headlineEvent }, index) => {
            const player1 = players.get(headlineMatch.player1Id);
            const player2 = players.get(headlineMatch.player2Id);
            if (!player1 || !player2) return null;
            const headlineTitle = headlineEventName(headlineEvent.nameZh);
            return <section className={`${styles.card} ${priority.headlineSlide}`} key={`${headlineEvent.id}-${headlineMatch.id}`}>
              <div className={styles.liveHeader}><div><small>{headlineMatch.roundLabelZh} · {headlineMatch.timeLabelZh ?? ""}{headlineMatch.matchNo ? ` · #${headlineMatch.matchNo}` : ""}</small><h2 title={headlineTitle}>{headlineTitle}</h2></div><StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} /></div>
              <div className={styles.homeScore}>
                <button onClick={() => openPlayer(headlineMatch.player1Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player1} size="lg" />{headlineMatch.winnerId === headlineMatch.player1Id ? <em className={polish.winBadge}>胜</em> : null}{headlineMatch.status === "walkover" && headlineMatch.winnerId && headlineMatch.winnerId !== headlineMatch.player1Id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><span className={polish.homePlayerName}>{player1.shortNameZh}</span></button>
                <div><strong>{headlineMatch.score1 ?? "-"} <i className={headlineMatch.status === "live" ? priority.liveSeparator : ""}>:</i> {headlineMatch.score2 ?? "-"}</strong><small>{bestOfLabel(headlineMatch.bestOf)}</small><span className={priority.scoreUpdated}><i />更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span></div>
                <button onClick={() => openPlayer(headlineMatch.player2Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player2} size="lg" />{headlineMatch.winnerId === headlineMatch.player2Id ? <em className={polish.winBadge}>胜</em> : null}{headlineMatch.status === "walkover" && headlineMatch.winnerId && headlineMatch.winnerId !== headlineMatch.player2Id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><span className={polish.homePlayerName}>{player2.shortNameZh}</span></button>
              </div>
              <button className={styles.fullButton} onClick={() => openMatch(headlineMatch.id, headlineEvent.slug)}>查看比赛详情</button>
              {headlineSelections.length > 1 ? <div className={priority.headlineCardFooter}>
                <span className={priority.headlineSwipeHint}>左右滑动 · {index + 1}/{headlineSelections.length}</span>
                <div className={priority.desktopRailControls} aria-label="焦点比赛切换">
                  <button type="button" disabled={activeHeadlineIndex === 0} onClick={() => scrollRailItem(headlineRail.current, activeHeadlineIndex - 1)} aria-label="上一场焦点比赛">‹</button>
                  <span aria-live="polite">{activeHeadlineIndex + 1} / {headlineSelections.length}</span>
                  <button type="button" disabled={activeHeadlineIndex === headlineSelections.length - 1} onClick={() => scrollRailItem(headlineRail.current, activeHeadlineIndex + 1)} aria-label="下一场焦点比赛">›</button>
                </div>
              </div> : null}
            </section>;
          })}
          </div>
          </div> : null}
        </div>

        <div className={`${styles.homeSlot} ${styles.homeCompareSlot}`}><PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} headerClassName={styles.sectionHeader} /></div>

        {nextEventCard ? <div className={`${styles.homeSlot} ${styles.homeNextSlot}`}><section className={styles.card}><SectionHeader eyebrow="NEXT EVENT" title="下一站" action={eventStatusLabel(nextEventCard)} actionClassName={`${polish.eventStatusText} ${eventStatusClass(nextEventCard.status)}`} /><button className={styles.nextEvent} onPointerEnter={() => void ensureEventDetail(nextEventCard.slug)} onFocus={() => void ensureEventDetail(nextEventCard.slug)} onTouchStart={() => void ensureEventDetail(nextEventCard.slug)} onClick={() => openEvent(nextEventCard.slug)}><span>{nextEventCard.cityZh?.slice(0, 1) || "赛"}</span><div><strong>{nextEventCard.nameZh}</strong><small>{nextEventCard.nameEn}</small><p>{formatDateRange(nextEventCard.startDate, nextEventCard.endDate)} · {nextEventCard.cityZh}</p></div><em>›</em></button></section></div> : null}
        <div className={`${styles.homeSlot} ${styles.homeRankingSlot}`}><section className={styles.card}><SectionHeader eyebrow="OFFICIAL WORLD RANKING" title="世界排名" action={<><span className={styles.mobileOnly}>TOP 3</span><span className={styles.desktopOnly}>TOP 5</span></>} /><div className={styles.rankingList}>{rankingRows.slice(0, 5).map((row, index) => <div className={`${polish.rankingStaticRow} ${index >= 3 ? styles.rankingDesktopRow : ""}`} key={row.rank}><strong>{row.rank}</strong><button className={polish.rankingAvatarButton} onClick={() => openPlayer(row.player.id)} aria-label={`查看${row.player.nameZh}球员详情`}><PlayerAvatar player={row.player} size="sm" /></button><span><b>{row.player.nameZh}</b><small>{row.player.nameEn}</small></span><em>{rankingMoney(row.points)}</em></div>)}</div><button className={styles.fullButton} onClick={() => changeView("data")}>查看完整世界排名</button></section></div>
        <div className={`${styles.homeSlot} ${styles.homeChinaSlot}`}><section className={styles.card}><SectionHeader eyebrow="CHINA PLAYERS" title="中国球员" action={`${chinaTop16.length} 人进入 TOP16`} />{chinaTop16.length ? <><div className={`${styles.chinaTopGrid} ${chinaGridClass}`} ref={chinaPlayersRail} onScroll={(event) => setChinaRailIndex(nearestRailItemIndex(event.currentTarget))}>{chinaTop16.map((row) => <button key={row.player.id} onClick={() => openPlayer(row.player.id)}><span>{row.rank}</span><strong>{row.player.nameZh}</strong><small>世界第 {row.rank}</small></button>)}</div>{chinaTop16.length > 5 ? <div className={styles.chinaRailFooter}><span>左右滑动 · {activeChinaRailIndex + 1}–{Math.min(activeChinaRailIndex + chinaVisibleCount, chinaTop16.length)} / {chinaTop16.length}</span><div className={priority.desktopRailControls} aria-label="中国球员切换"><button type="button" disabled={activeChinaRailIndex === 0} onClick={() => scrollRailItem(chinaPlayersRail.current, activeChinaRailIndex - 1)} aria-label="查看前面的中国球员">‹</button><span aria-live="polite">{activeChinaRailIndex + 1}–{Math.min(activeChinaRailIndex + chinaVisibleCount, chinaTop16.length)} / {chinaTop16.length}</span><button type="button" disabled={activeChinaRailIndex === chinaMaxRailIndex} onClick={() => scrollRailItem(chinaPlayersRail.current, activeChinaRailIndex + 1)} aria-label="查看更多中国球员">›</button></div></div> : null}</> : <div className={styles.emptyState}>当前世界前16暂无中国球员。</div>}</section></div>
        <div className={`${styles.homeSlot} ${styles.homeLeadersSlot}`}><HomeSeasonLeaders initialPayload={initialHomeLeaders} onOpenMetric={openTechnicalFromHome} /></div>
        <div className={`${styles.homeSlot} ${styles.homeAboutSlot}`}><HomeAboutCard /></div>
      </> : null}

      {activeView === "matches" ? <>
        <section className={styles.pageIntro}><small>TOURNAMENTS</small><h1>赛事</h1><p>查看近期赛事和完整赛季赛历，及时了解正在进行、即将开始和已经结束的比赛。</p></section>
        <div className={priority.eventCenterLayout}>
          <aside className={priority.eventSidebar} aria-label="赛事浏览与筛选">
            <div className={priority.eventModeTabs}><button className={eventListMode === "recent" ? priority.eventModeActive : ""} onClick={() => setEventListMode("recent")}>近期赛事</button><button className={eventListMode === "calendar" ? priority.eventModeActive : ""} onClick={() => setEventListMode("calendar")}>赛季赛历</button></div>
            {eventListMode === "calendar" ? <SeasonSelector seasons={seasonOptions} value={selectedSeason} onPrefetch={(season) => { void ensureCalendarSeason(season); }} onChange={(season) => { setSelectedSeason(season); void ensureCalendarSeason(season); }} /> : null}
          </aside>
          <div className={priority.eventListPanel}>
            {eventListMode === "recent" ? <>
              {recentFeaturedEvent ? <section className={styles.currentEventBanner} onPointerEnter={() => void ensureEventDetail(recentFeaturedEvent.slug)} onFocus={() => void ensureEventDetail(recentFeaturedEvent.slug)} onTouchStart={() => void ensureEventDetail(recentFeaturedEvent.slug)} onClick={() => openEvent(recentFeaturedEvent.slug, "overview")}><div><span className={eventStatusClass(recentFeaturedEvent.status)}><StatusPill status={recentFeaturedEvent.status} label="正在进行" /></span><small>{recentFeaturedEvent.typeZh}</small></div><h2>{recentFeaturedEvent.nameZh}</h2>{recentFeaturedEvent.nameEn ? <small className={priority.featuredEventEnglish}>{recentFeaturedEvent.nameEn}</small> : null}<p>{formatDateRange(recentFeaturedEvent.startDate, recentFeaturedEvent.endDate)}{recentFeaturedEvent.cityZh ? ` · ${recentFeaturedEvent.cityZh}` : ""}</p><span>查看详情 ›</span></section> : null}
              <section className={styles.card}><SectionHeader eyebrow="RECENT TOURNAMENTS" title="近期赛事" action="最多 5 站" /><div className={priority.recentEventGrid}>{recentCardEvents.map((item) => <RecentEventCard key={item.id} item={item} onPrefetch={() => void ensureEventDetail(item.slug)} onOpen={() => openEvent(item.slug)} />)}{recentCardEvents.length === 0 && !recentFeaturedEvent ? <div className={styles.emptyState}>本赛季暂无可显示的近期赛事。</div> : null}</div><button className={priority.recentMoreButton} onClick={() => { setSelectedSeason(initialCurrentSeason); setEventListMode("calendar"); void ensureCalendarSeason(initialCurrentSeason); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" })); }}>查看本赛季完整赛历</button></section>
            </> : selectedSeasonLoadError && !selectedSeasonLoaded ? <section className={styles.card}><div className={styles.emptyState}>该赛季赛历加载失败，请稍后重试。</div><button className={styles.fullButton} onClick={() => void ensureCalendarSeason(selectedSeason)}>重新加载</button></section> : <section className={`${styles.card} ${priority.calendarTableCard}`}><SectionHeader eyebrow={`${selectedSeason} SEASON`} title="赛季赛历" action={selectedSeasonLoading ? "正在加载…" : selectedSeasonLoaded ? `共 ${selectedSeasonEvents.length} 项赛事` : "按需加载"} /><div className={priority.eventTableHead} aria-hidden="true"><span>日期 / 状态</span><span>赛事</span><span>类型</span><span>日期 / 地点</span><span /></div><div className={styles.calendarList}>{selectedSeasonEvents.map((item) => <EventCard key={item.id} item={item} onPrefetch={() => void ensureEventDetail(item.slug)} onOpen={() => openEvent(item.slug)} />)}{selectedSeasonEvents.length === 0 ? <div className={styles.emptyState}>{selectedSeasonLoading ? "正在加载该赛季赛历…" : selectedSeasonLoaded ? "该赛季暂无赛事。" : "选择赛季后加载赛事。"}</div> : null}</div></section>}
          </div>
        </div>
      </> : null}

      {activeView === "players" ? directoryLoaded && directoryModuleLoaded
        ? <PlayerDirectoryContent players={directoryPlayers} query={playerQuery} filter={playerFilter} onQueryChange={setPlayerQuery} onFilterChange={setPlayerFilter} onOpenPlayer={(player) => openPlayerBySlug(player.slug)} onPrefetchPlayer={(player) => prefetchPlayerDetail(player.slug)} hasMore={directoryHasMore && playerFilter === "all" && !playerQuery.trim()} loadingMore={directoryLoadingMore} onLoadMore={() => { void loadMorePlayerDirectory(); }} />
        : <RootViewLoading view="players" failed={directoryLoadError} onRetry={warmPlayerDirectoryView} /> : null}

      {activeView === "data" ? dataModuleLoaded && (rankingHubLoaded || requestedTechnicalMetric)
        ? <DataHubContent hub={rankingHub} players={dataPlayers} selectedKey={selectedRankingKey} onSelectKey={setSelectedRankingKey} onOpenRankings={openRankings} onOpenPlayer={openPlayerBySlug} initialPlayerCompare={initialPlayerCompare} initialTechnicalMetric={requestedTechnicalMetric} />
        : <RootViewLoading view="data" failed={rankingHubLoadError} onRetry={warmDataView} /> : null}
      {activeView !== "home" ? <div className={styles.dataStatus} role="status">
        <i className={styles.liveOk} />
        <span>更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span>
      </div> : null}
    </div>
    <nav className={`${styles.bottomNav} ${polish.fastNav}`}>{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} className={`${polish.fastNavLink} ${item.id === activeView ? styles.activeNav : ""}`} onPointerEnter={() => warmRootView(item.id)} onFocus={() => warmRootView(item.id)} onTouchStart={() => warmRootView(item.id)} onClick={(event) => { event.preventDefault(); changeView(item.id); }}><span>{item.icon}</span><b>{item.label}</b></a>)}</nav>
    <span className={styles.buildMark}>{buildMark}</span>
  </div></main>;
}
