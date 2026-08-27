"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PlayerEventStats,
  SnookerCalendarEvent,
  SnookerDashboardSnapshot,
  SnookerEvent,
  SnookerHeadToHeadMeeting,
  SnookerMatch,
  SnookerMatchPlayerStatistics,
  SnookerPlayer,
  SnookerSeasonStatistics,
} from "@/lib/snooker/domain";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";
import { CURRENT_RANKING_KEYS, type SnookerCurrentRankingKey, type SnookerRankingHub, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";
import { DataHubContent, RankingDetailContent } from "./data/data-ranking-content";
import PlayerCompareTeaser from "./compare/player-compare-teaser";
import { PlayerDirectoryContent, type PlayerFilter } from "./players/player-directory";
import PlayerDetailInline from "./players/player-detail-inline";
import { prefetchPlayerDetail, prefetchPlayerExperience } from "./players/player-detail-client";
import { eventDetailTypeLabel } from "@/lib/snooker/taxonomy";
import { matchDisplayStatus, mergeEventSnapshotsMonotonic, selectHomepageHeadlineMatches } from "@/lib/snooker/live-client";
import styles from "./snooker-data-center.module.css";
import priority from "./snooker-priority.module.css";
import insight from "./snooker-insights.module.css";
import polish from "./snooker-ui-polish.module.css";

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

type SourceHealth = {
  online: boolean;
  accepted: boolean;
  fetchedAt: string;
  message: string;
  sourceLabel?: string;
  cacheSeconds?: number;
};

type DashboardResponse = {
  ok?: boolean;
  snapshot?: SnookerDashboardSnapshot;
  databaseEvents?: SnookerEvent[];
  currentSeason?: string;
  sourceHealth?: SourceHealth;
};

type CalendarResponse = {
  ok?: boolean;
  calendar?: SnookerCalendarEvent[];
};

const navItems: Array<{ id: NavId; label: string; icon: string }> = [
  { id: "home", label: "首页", icon: "⌂" },
  { id: "matches", label: "赛事", icon: "◫" },
  { id: "players", label: "球员", icon: "◎" },
  { id: "data", label: "数据", icon: "▥" },
];

function rankingKeyFromParam(value: string | null | undefined): SnookerCurrentRankingKey {
  return CURRENT_RANKING_KEYS.find((key) => key === value) ?? "world_official";
}

function rankingSectionFromParam(value: string | null | undefined): SnookerRankingSection {
  return value === "qualification" || value === "history" ? value : "current";
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
  const completedEvent = event.status === "completed" || allMatches(event).every((match) => match.status === "completed" || match.status === "walkover");
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

function finalOf(event?: SnookerEvent) {
  return event?.rounds.find((round) => round.key === "final")?.matches[0];
}

function playerMap(snapshot: SnookerDashboardSnapshot) {
  return new Map(snapshot.players.map((player) => [player.id, player]));
}

function matchSignature(match: SnookerMatch) {
  return JSON.stringify({
    score1: match.score1,
    score2: match.score2,
    status: match.status,
    frames: match.frames?.map((frame) => [frame.frameNo, frame.score1, frame.score2, frame.break1, frame.break2]) ?? [],
  });
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
  const order = event.rounds.map((round) => round.key);
  const best = [...matches].sort((a, b) => order.indexOf(a.roundKey) - order.indexOf(b.roundKey))[0];
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

function money(value: number) {
  return `£${value.toLocaleString("en-GB")}`;
}

function rankingMoney(value: number) {
  return `€${value.toLocaleString("en-GB")}`;
}

function SectionHeader({ eyebrow, title, action, actionClassName }: { eyebrow?: string; title: string; action?: string; actionClassName?: string }) {
  return <div className={styles.sectionHeader}><div>{eyebrow ? <small>{eyebrow}</small> : null}<h2>{title}</h2></div>{action ? <span className={actionClassName}>{action}</span> : null}</div>;
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
  const p1 = players.get(match.player1Id);
  const p2 = players.get(match.player2Id);
  if (!p1 || !p2) return null;
  const score = match.status === "walkover" ? "W : O" : `${match.score1 ?? "-"} : ${match.score2 ?? "-"}`;
  return (
    <button className={`${styles.matchRow} ${priority.horizontalMatchRow}`} onClick={onOpen}>
      <div className={styles.matchRowMeta}>
        <span>{match.timeLabelZh ?? match.roundLabelZh}</span>
        <span>{bestOfLabel(match.bestOf)}</span>
        <StatusPill status={match.status} label={matchDisplayStatus(match)} />
      </div>
      <div className={priority.matchVersusRow}>
        <div className={polish.matchPlayerCell}>
          <PlayerAvatar player={p1} size="sm" />
          <span>{p1.shortNameZh}{match.winnerId === p1.id ? <em className={polish.matchWin}>胜</em> : null}</span>
        </div>
        <b className={match.status === "live" ? priority.liveScoreText : ""}>{score}</b>
        <div className={`${polish.matchPlayerCell} ${polish.matchPlayerRight}`}>
          <span>{match.winnerId === p2.id ? <em className={polish.matchWin}>胜</em> : null}{p2.shortNameZh}</span>
          <PlayerAvatar player={p2} size="sm" />
        </div>
      </div>
    </button>
  );
}

function EventCard({ item, onOpen, interactive = true }: { item: SnookerCalendarEvent; onOpen?: () => void; interactive?: boolean }) {
  const content = <>
    <div className={styles.calendarDate}><b>{formatMonthDay(item.startDate)}</b><small className={`${polish.eventStatusText} ${eventStatusClass(item.status)}`}>{eventStatusLabel(item)}</small></div>
    <div><span><StatusPill status="type" label={item.typeZh} /></span><strong>{item.nameZh}</strong><small>{item.nameEn}</small><p>{formatDateRange(item.startDate, item.endDate)} · {item.countryZh} {item.cityZh}</p></div>
    {interactive ? <em>›</em> : null}
  </>;
  if (!interactive) return <article className={priority.calendarStaticCard}>{content}</article>;
  return <button className={item.status === "live" ? styles.calendarCurrent : ""} onClick={onOpen}>{content}</button>;
}

function SeasonSelector({ seasons, value, onChange }: { seasons: string[]; value: string; onChange: (season: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => rail.current?.scrollBy({ left: direction * 180, behavior: "auto" });
  return <div className={priority.seasonSelector} aria-label="赛季选择器">
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(-1)} aria-label="查看较新赛季">‹</button>
    <div className={priority.seasonRail} ref={rail}>
      {seasons.map((season) => <button type="button" key={season} className={season === value ? priority.seasonActive : ""} onClick={() => onChange(season)}>{season}赛季</button>)}
    </div>
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(1)} aria-label="查看较早赛季">›</button>
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
}) {
  const initialKey = initialRankingKey ?? "world_official";
  const initialDetail: DetailState | null = initialPlayerSlug
    ? { type: "player", slug: initialPlayerSlug, returnView: "players" }
    : initialDataSection === "rankings"
      ? { type: "ranking", section: initialRankingSection, key: initialKey }
      : null;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [databaseEvents, setDatabaseEvents] = useState(initialDatabaseEvents);
  const [calendarEvents, setCalendarEvents] = useState<SnookerCalendarEvent[]>(initialSnapshot.calendar);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(initialCurrentSeason);
  const [loadingEventSlug, setLoadingEventSlug] = useState<string | null>(null);
  const [eventLoadError, setEventLoadError] = useState<string | null>(null);
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
  const signatures = useRef(new Map(initialDatabaseEvents.flatMap((event) => allMatches(event)).map((match) => [match.id, matchSignature(match)])));
  const playerDirectoryScrollY = useRef(0);
  const eventReturnState = useRef<{ view: MainView; mode: EventListMode; season: string; scrollY: number } | null>(null);
  const eventDetailReturn = useRef<{ slug: string; tab: EventTab; scrollY: number } | null>(null);

  const ensureCalendar = useCallback(async () => {
    if (calendarLoaded || calendarLoading) return;
    setCalendarLoading(true);
    setCalendarLoadError(false);
    try {
      const response = await fetch("/api/snooker/v1/calendar", { headers: { Accept: "application/json" } });
      const data = await response.json() as CalendarResponse;
      if (!response.ok || !data.ok || !data.calendar) throw new Error("EVENT_CALENDAR_UNAVAILABLE");
      setCalendarEvents(data.calendar);
      setCalendarLoaded(true);
    } catch {
      setCalendarLoadError(true);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarLoaded, calendarLoading]);

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

  useEffect(() => {
    if (activeView === "matches") void ensureCalendar();
  }, [activeView, ensureCalendar]);

  useEffect(() => {
    setCalendarEvents((current) => {
      if (!calendarLoaded) return snapshot.calendar;
      const bySlug = new Map(current.map((item) => [item.slug, item]));
      snapshot.calendar.filter((item) => item.season === initialCurrentSeason).forEach((item) => bySlug.set(item.slug, item));
      return [...bySlug.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    });
  }, [snapshot.calendar, calendarLoaded, initialCurrentSeason]);

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
      const returnState = window.history.state as { snookerReturnView?: MainView } | null;
      if (playerSlug) {
        const returnView = returnState?.snookerReturnView ?? "players";
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

  const players = useMemo(() => playerMap(snapshot), [snapshot]);
  const directoryPlayers = useMemo<SnookerPlayerListItem[]>(() => snapshot.players
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
  const eventBySlug = useMemo(() => new Map(databaseEvents.map((event) => [event.slug, event])), [databaseEvents]);
  const pollReferenceTime = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;
  const shouldPollDashboard = databaseEvents.some((event) => allMatches(event).some((match) => {
    if (match.status === "live" || match.status === "session-break") return true;
    const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
    if (match.status === "upcoming" && scheduled && scheduled >= pollReferenceTime && scheduled - pollReferenceTime <= 6 * 60 * 60 * 1000) return true;
    const completed = match.completedDetectedAt || match.sourceUpdatedAt;
    const completedAt = completed ? Date.parse(completed) : 0;
    return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && pollReferenceTime - completedAt <= 60 * 60 * 1000;
  }));

  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/snooker/v1/dashboard", { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as DashboardResponse;
      if (response.ok && data.ok && data.snapshot) {
        setSnapshot((current) => ({
          ...data.snapshot!,
          event: mergeEventSnapshotsMonotonic([current.event], [data.snapshot!.event])[0] ?? data.snapshot!.event,
        }));
        if (data.databaseEvents) {
          const changedAt = data.sourceHealth?.fetchedAt ?? new Date().toISOString();
          setDatabaseEvents((current) => {
            const merged = mergeEventSnapshotsMonotonic(current, data.databaseEvents!);
            const next = new Map(merged.flatMap((event) => allMatches(event)).map((match) => [match.id, matchSignature(match)]));
            const changed: string[] = [];
            for (const [id, signature] of next) if (signatures.current.get(id) !== signature) changed.push(id);
            signatures.current = next;
            if (changed.length) {
              const updatedById = new Map(merged.flatMap((event) => allMatches(event)).map((match) => [match.id, match.sourceUpdatedAt ?? changedAt]));
              setMatchUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(changed.map((id) => [id, updatedById.get(id) ?? changedAt])) }));
            }
            return merged;
          });
        }
      }
      if (data.sourceHealth) setSourceHealth(data.sourceHealth);
    } catch {
      setSourceHealth(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldPollDashboard) return;
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [shouldPollDashboard, refresh]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const playerSlug = params.get("player")?.trim();
      const viewParam = params.get("view");
      const urlView: MainView = viewParam === "matches" || viewParam === "players" || viewParam === "data" ? viewParam : "home";
      const state = event.state as { snookerReturnView?: MainView; snookerReturnDetail?: DetailState | null } | null;

      if (playerSlug) {
        setActiveView("players");
        setDetail({ type: "player", slug: playerSlug, returnView: "players" });
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (urlView === "data" && params.get("section") === "rankings") {
        const key = rankingKeyFromParam(params.get("list"));
        const section = rankingSectionFromParam(params.get("group"));
        setSelectedRankingKey(key);
        setRankingSection(section);
        setActiveView("data");
        setDetail({ type: "ranking", section, key });
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (state?.snookerReturnDetail && state.snookerReturnDetail.type !== "player") {
        setActiveView(state.snookerReturnView ?? urlView);
        setDetail(state.snookerReturnDetail);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      setDetail((current) => current?.type === "player" || current?.type === "ranking" ? null : current);
      setActiveView(state?.snookerReturnView ?? urlView);
      if ((state?.snookerReturnView ?? urlView) === "players") {
        window.requestAnimationFrame(() => window.scrollTo({ top: playerDirectoryScrollY.current, behavior: "auto" }));
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const today = chinaToday();
  const seasonCalendar = useMemo(() => [...snapshot.calendar].filter((item) => item.season === initialCurrentSeason).sort((a, b) => a.startDate.localeCompare(b.startDate)), [snapshot.calendar, initialCurrentSeason]);
  const mainSeasonEvents = useMemo(() => seasonCalendar.filter((item) => item.eventStage !== "qualifier" && item.eventType !== "pro_qualifier" && item.typeZh !== "资格赛"), [seasonCalendar]);
  const activeEventCard = mainSeasonEvents.find((item) => isActiveOn(item, today));
  const graceEventCard = [...mainSeasonEvents].reverse().find((item) => item.endDate < today && addDateDays(item.endDate, 1) === today);
  const firstUpcomingMain = mainSeasonEvents.find((item) => item.startDate > today);
  const featuredEventCard = activeEventCard ?? graceEventCard ?? firstUpcomingMain ?? [...mainSeasonEvents].reverse()[0];
  const nextEventCard = featuredEventCard ? mainSeasonEvents.find((item) => item.startDate > featuredEventCard.startDate) : firstUpcomingMain;
  const seasonOptions = useMemo(() => [...new Set(calendarEvents.map((item) => item.season))]
    .filter((season) => Number(season.slice(0, 4)) >= 2019)
    .sort((a, b) => b.localeCompare(a)), [calendarEvents]);
  const selectedSeasonEvents = useMemo(() => calendarEvents
    .filter((item) => item.season === selectedSeason)
    .sort((a, b) => a.startDate.localeCompare(b.startDate)), [calendarEvents, selectedSeason]);
  const firstUpcomingCurrent = seasonCalendar.find((item) => item.startDate > today);
  const recentEvents = seasonCalendar
    .filter((item) => item.endDate < today || isActiveOn(item, today) || item.id === firstUpcomingCurrent?.id || item.id === featuredEventCard?.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const recentListEvents = featuredEventCard ? recentEvents.filter((item) => item.id !== featuredEventCard.id) : recentEvents;

  const rankingRows = useMemo(() => snapshot.rankings
    .map((row) => ({ ...row, player: players.get(row.playerId) }))
    .filter((row): row is typeof row & { player: SnookerPlayer } => Boolean(row.player))
    .sort((a, b) => a.rank - b.rank), [snapshot.rankings, players]);
  const chinaTop16 = rankingRows.filter((row) => isChina(row.player));

  const ensureEventDetail = async (slug: string) => {
    if (loadingEventSlug === slug) return;
    const existing = eventBySlug.get(slug);
    if (existing && !allMatches(existing).some((match) => match.status === "live" || match.status === "session-break")) return;
    setLoadingEventSlug(slug);
    setEventLoadError((current) => current === slug ? null : current);
    try {
      const response = await fetch(`/api/snooker/v1/event?slug=${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as { ok?: boolean; event?: SnookerEvent };
      if (!response.ok || !data.ok || !data.event) throw new Error("EVENT_DETAIL_UNAVAILABLE");
      setDatabaseEvents((current) => {
        const index = current.findIndex((event) => event.slug === slug);
        if (index < 0) return [...current, data.event!];
        const next = [...current];
        next[index] = mergeEventSnapshotsMonotonic([current[index]], [data.event!])[0] ?? current[index];
        return next;
      });
    } catch {
      setEventLoadError(slug);
    } finally {
      setLoadingEventSlug((current) => current === slug ? null : current);
    }
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
    eventDetailReturn.current = null;
  };
  const openMatch = (matchId: string, eventSlug: string) => {
    if (detail?.type === "event" && detail.slug === eventSlug) {
      eventDetailReturn.current = { slug: eventSlug, tab: detail.tab, scrollY: window.scrollY };
    } else {
      eventDetailReturn.current = null;
    }
    setMatchDataTab("match");
    setDetail({ type: "match", matchId, eventSlug });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeMatch = (eventSlug: string) => {
    const restore = eventDetailReturn.current;
    if (restore?.slug === eventSlug) {
      setDetail({ type: "event", slug: eventSlug, tab: restore.tab });
      window.requestAnimationFrame(() => window.scrollTo({ top: restore.scrollY, behavior: "auto" }));
    } else {
      setDetail({ type: "event", slug: eventSlug, tab: "schedule" });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    eventDetailReturn.current = null;
  };
  const openPlayer = (playerId: string) => {
    const target = players.get(playerId);
    if (!target?.slug) {
      setDetail(null);
      setActiveView("players");
      return;
    }

    if (activeView === "players" && detail === null) playerDirectoryScrollY.current = window.scrollY;
    prefetchPlayerExperience(target.slug, target.avatarUrl || target.avatar?.url || null, "high");

    const returnDetail = detail;
    const returnView = activeView;
    const currentState = { ...(window.history.state ?? {}), snookerReturnView: returnView, snookerReturnDetail: returnDetail };
    window.history.replaceState(currentState, "", window.location.href);

    const url = new URL(window.location.href);
    url.searchParams.set("view", "players");
    url.searchParams.set("player", target.slug);
    const nextUrl = url.pathname + url.search + url.hash;
    window.history.pushState({ ...currentState, snookerPlayerDetail: target.slug }, "", nextUrl);

    setActiveView("players");
    setDetail({ type: "player", slug: target.slug, returnView });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openPlayerBySlug = (slug: string) => {
    const target = snapshot.players.find((player) => player.slug === slug);
    if (target) openPlayer(target.id);
  };
  const closePlayer = () => {
    if (detail?.type !== "player") return;
    const state = window.history.state as { snookerPlayerDetail?: string } | null;
    if (state?.snookerPlayerDetail === detail.slug && window.history.length > 1) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("view", "players");
    url.searchParams.delete("player");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setDetail(null);
    setActiveView("players");
    window.requestAnimationFrame(() => window.scrollTo({ top: playerDirectoryScrollY.current, behavior: "auto" }));
  };
  const openRankings = (key: SnookerCurrentRankingKey) => {
    setSelectedRankingKey(key);
    setRankingSection("current");
    const currentState = { ...(window.history.state ?? {}), snookerReturnView: "data" as MainView, snookerReturnDetail: null };
    window.history.replaceState(currentState, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "rankings");
    url.searchParams.set("list", key);
    url.searchParams.set("group", "current");
    window.history.pushState({ ...currentState, snookerRankingDetail: true }, "", url.pathname + url.search + url.hash);
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
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeRankings = () => {
    const state = window.history.state as { snookerRankingDetail?: boolean } | null;
    if (state?.snookerRankingDetail && window.history.length > 1) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    url.searchParams.delete("list");
    url.searchParams.delete("group");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setDetail(null);
    setActiveView("data");
  };
  const changeView = (view: NavId) => {
    eventReturnState.current = null;
    eventDetailReturn.current = null;
    setDetail(null);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (detail?.type === "player") {
    const summaryPlayer = snapshot.players.find((player) => player.slug === detail.slug);
    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={styles.detailHeader}><button onClick={closePlayer}>‹</button><strong>{summaryPlayer?.nameZh ?? "球员详情"}</strong><span>PLAYER</span></header>
      <PlayerDetailInline key={detail.slug} summaryPlayer={summaryPlayer} slug={detail.slug} />
    </div></main>;
  }

  if (detail?.type === "ranking") {
    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={styles.detailHeader}><button onClick={closeRankings}>‹</button><strong>排名</strong><span>DATA</span></header>
      <RankingDetailContent
        hub={initialRankingHub}
        players={directoryPlayers}
        selectedKey={selectedRankingKey}
        section={rankingSection}
        onSelectKey={(key) => updateRankingDetail(rankingSection, key)}
        onSelectSection={(section) => updateRankingDetail(section)}
        onOpenPlayer={openPlayerBySlug}
      />
    </div></main>;
  }

  if (detail?.type === "match") {
    const selectedEvent = eventBySlug.get(detail.eventSlug) ?? snapshot.event;
    const match = allMatches(selectedEvent).find((item) => item.id === detail.matchId) ?? finalOf(selectedEvent);
    if (!match) return null;
    const p1 = players.get(match.player1Id);
    const p2 = players.get(match.player2Id);
    if (!p1 || !p2) return null;
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
    const updated = new Date(match.sourceUpdatedAt ?? matchUpdatedAt[match.id] ?? selectedEvent.snapshotAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Shanghai",
    });
    const localized = (name?: string) => snapshot.players.find((player) => player.nameEn.toLowerCase() === String(name ?? "").toLowerCase())?.nameZh ?? name ?? "";
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
          <div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p1} size="xl" />{match.winnerId === p1.id ? <em>胜</em> : null}</div><strong>{p1.nameZh}</strong><small>{p1.nameEn}</small></div>
          <div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : <><span>{match.score1 ?? "-"}</span> <i className={match.status === "live" ? priority.liveSeparator : ""}>-</i> <span>{match.score2 ?? "-"}</span></>}</strong><StatusPill status={match.status} label={statusLabel} /><small>{bestOfLabel(match.bestOf)}</small>{realtime ? <small>{refreshing ? "正在更新…" : `最近更新 ${updated}`}</small> : null}</div>
          <div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p2} size="xl" />{match.winnerId === p2.id ? <em>胜</em> : null}</div><strong>{p2.nameZh}</strong><small>{p2.nameEn}</small></div>
        </div>
      </section>

      <section className={styles.frameSection}>
        <div className={styles.frameHead}><span>单杆<br />(50+)</span><span>分数</span><b>局</b><span>分数</span><span>单杆<br />(50+)</span></div>
        {match.frames?.length ? match.frames.map((frame) => <div className={styles.frameRow} style={{ minHeight: 50 }} key={frame.frameNo}><span>{frame.break1 ?? "-"}</span><strong>{frame.score1}</strong><b>{frame.frameNo}</b><strong>{frame.score2}</strong><span>{frame.break2 ?? "-"}</span></div>) : <div className={styles.emptyFrames}>{match.status === "upcoming" ? "比赛尚未开始，开赛后可查看逐局比分。" : "暂无逐局比分，当前仅显示比赛总比分。"}</div>}
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
          {h2h.recentMeetings.length ? <div className={insight.h2hHistory}>{h2h.recentMeetings.map((item, index) => <div className={insight.h2hMeeting} key={`${item.date}-${index}`}><time>{meetingDate(item)}</time><div><small>{localizedTournamentLabel(item.tournament, calendarEvents)}{item.round ? ` · ${localizedRoundLabel(item.round)}` : ""}</small><strong>{localized(item.homePlayerName)} {item.homeScore ?? "-"} : {item.awayScore ?? "-"} {localized(item.awayPlayerName)}</strong></div></div>)}</div> : <div className={insight.noHistory}>两人此前暂无正式比赛交手记录。</div>}
        </div> : null}
      </section> : null}

      {realtime ? <div className={styles.liveFooter}><i className={sourceHealth?.accepted ? styles.liveOk : styles.liveWait} /><span>比赛数据实时更新</span><small>更新于 {formatUpdatedAt(sourceHealth?.fetchedAt)}</small></div> : null}
    </div></main>;
  }

  if (detail?.type === "event") {
    const calendarEvent = calendarEvents.find((item) => item.slug === detail.slug) ?? snapshot.calendar.find((item) => item.slug === detail.slug) ?? featuredEventCard;
    const full = eventBySlug.get(detail.slug);
    if (!calendarEvent) return null;
    const isHistoricalEvent = calendarEvent.season !== initialCurrentSeason;
    const eventDetails = full ? [full] : [];
    const eventMatches = eventDetails.flatMap((event) => allMatches(event));
    const finalEvent = full && finalOf(full) ? full : undefined;
    const final = finalEvent ? finalOf(finalEvent) : undefined;
    const champion = final?.winnerId ? players.get(final.winnerId) : undefined;
    const eventStats = eventDetails.length ? {
      matches: eventMatches.length,
      players: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id])).size,
      china: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter((id) => isChina(players.get(id)))).size,
      completed: eventMatches.filter((match) => match.status === "completed" || match.status === "walkover").length,
      partial: eventDetails.some((event) => event.schedulePartial),
    } : null;
    const chinaStats = full ? snapshot.players.filter(isChina).map((player) => {
      const stats = currentEventStats(player.id, full);
      return stats ? { player, stats: { wins: stats.wins, losses: stats.losses, bestRoundLabelZh: stats.bestRoundLabelZh } } : null;
    }).filter((item): item is { player: SnookerPlayer; stats: { wins: number; losses: number; bestRoundLabelZh: string } } => Boolean(item)) : [];
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
        {finalEvent?.status === "completed" && champion ? <section className={polish.championCard}><div className={polish.championAvatar}><PlayerAvatar player={champion} size="md" /><span>冠</span></div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>{champion.nameZh}</strong><span>{champion.nameEn}</span></div>{final ? <div className={polish.championScore}><small>FINAL</small><b>{final.score1}:{final.score2}</b></div> : null}</section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW" title="赛事概览" /><div className={insight.eventOverviewGrid}><article><span>赛季</span><b>{calendarEvent.season}</b></article><article><span>赛事类型</span><b>{eventDetailTypeLabel(calendarEvent)}</b></article><article><span>比赛日期</span><b>{formatDateRange(overviewStart, overviewEnd)}</b></article><article><span>举办地</span><b>{overviewCountry} · {overviewCity}</b></article>{prizeEvent?.previousChampionZh ? <article><span>上届冠军{prizeEvent.previousChampionYear ? ` · ${prizeEvent.previousChampionYear}` : ""}</span><b>{prizeEvent.previousChampionZh}</b></article> : null}{overviewVenue ? <article><span>场馆</span><b>{overviewVenue}</b></article> : null}</div></section>
        {prizeEvent?.prizes?.length ? <section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY" title="奖金分配" action={totalPrize ? `总奖金 ${money(totalPrize.amount)}` : undefined} /><div className={polish.prizeTable}>{[...prizeEvent.prizes].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => <div className={`${polish.prizeRow} ${row.isTotal ? polish.prizeTotal : ""}`} key={row.key}><span>{row.labelZh}</span><b>{money(row.amount)}</b></div>)}</div></section> : null}
      </> : null}

      {detail.tab === "schedule" ? full ? <div className={styles.roundStack}>
        {full.schedulePartial ? <div className={insight.partialNotice}><b>赛程陆续公布中</b><span className={polish.partialText}>目前已公布 {full.publishedMatchCount ?? allMatches(full).length} 场比赛，更多赛程公布后将在这里更新。</span></div> : null}
        {orderedScheduleRounds(full).map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}
      </div> : <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlug === detail.slug ? "正在加载赛程…" : eventLoadError === detail.slug ? "赛程加载失败，请稍后重试。" : "详细赛程暂未公布。"}</div>{eventLoadError === detail.slug ? <button className={styles.fullButton} onClick={() => void ensureEventDetail(detail.slug)}>重新加载</button> : null}</section> : null}

      {detail.tab === "data" ? eventStats ? <>
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT DATA" title="赛事统计" /><div className={styles.statGrid}><article><small>已公布比赛</small><strong>{eventStats.matches}</strong><span>{eventStats.partial ? "赛程公布中" : "赛程已完整"}</span></article><article><small>参赛球员</small><strong>{eventStats.players}</strong><span>本届赛事</span></article><article><small>中国球员</small><strong>{eventStats.china}</strong><span>本届赛事</span></article><article><small>已完赛</small><strong>{eventStats.completed}</strong><span>{calendarEvent.status === "completed" ? "全部完成" : "截至目前"}</span></article></div></section>
        <section className={styles.card}><SectionHeader eyebrow="CHINA WATCH" title="中国球员战绩" /><div className={styles.chinaResultList}>{chinaStats.map(({ player, stats }) => <button key={player.id} onClick={() => openPlayer(player.id)}><PlayerAvatar player={player} size="sm" /><span><b>{player.nameZh}</b><small>世界第 {player.currentRank ?? "—"}</small></span><strong>{stats.bestRoundLabelZh}</strong><em>{stats.wins}胜{stats.losses}负</em></button>)}</div></section>
      </> : <section className={styles.card}><div className={styles.emptyState}>{eventLoadError === detail.slug ? "赛事数据加载失败，请稍后重试。" : "赛事数据将在赛程和比赛结果公布后显示。"}</div>{eventLoadError === detail.slug ? <button className={styles.fullButton} onClick={() => void ensureEventDetail(detail.slug)}>重新加载</button> : null}</section> : null}
    </div></main>;
  }

  const featuredDetail = featuredEventCard ? eventBySlug.get(featuredEventCard.slug) : undefined;
  const headlineSelections = selectHomepageHeadlineMatches(databaseEvents, players);

  return <main className={styles.appRoot} data-theme={theme}><div className={styles.shell}>
    <header className={styles.header}><button className={styles.brand} onClick={() => changeView("home")}><span>S</span><div><strong>世界斯诺克数据中心</strong><small>WORLD SNOOKER DATA</small></div></button><div className={styles.headerRight}><span className={styles.versionBadge}>DATA v0.9</span><div className={styles.themeSwitch}><button className={theme === "green" ? styles.themeActive : ""} onClick={() => setTheme("green")}>绿</button><button className={theme === "red" ? styles.themeActive : ""} onClick={() => setTheme("red")}>红</button></div></div></header>
    <div className={styles.content}>
      {activeView === "home" ? <>
        {featuredEventCard ? <section className={styles.hero}><div className={styles.heroTop}><span className={eventStatusClass(featuredEventCard.status)}><StatusPill status={featuredEventCard.status} label={activeEventCard ? "当前赛事" : graceEventCard ? "刚刚结束" : "下一站"} /></span><span>{featuredEventCard.typeZh}</span></div><small>{activeEventCard ? "CURRENT TOURNAMENT" : graceEventCard ? "JUST FINISHED" : "NEXT TOURNAMENT"}</small><h1>{featuredEventCard.nameZh}</h1><p>{formatDateRange(featuredEventCard.startDate, featuredEventCard.endDate)} · {featuredEventCard.countryZh} {featuredEventCard.cityZh}</p><div className={styles.heroActions}><button onClick={() => openEvent(featuredEventCard.slug, featuredDetail?.rounds.length ? "schedule" : "overview")}>查看赛事</button><button className={styles.secondaryButton} onClick={() => changeView("matches")}>赛事列表</button></div></section> : null}

        {headlineSelections.length ? <div className={priority.headlineCarousel} aria-label="焦点比赛">
          {headlineSelections.map(({ match: headlineMatch, event: headlineEvent }, index) => {
            const player1 = players.get(headlineMatch.player1Id);
            const player2 = players.get(headlineMatch.player2Id);
            if (!player1 || !player2) return null;
            return <section className={`${styles.card} ${priority.headlineSlide}`} key={`${headlineEvent.id}-${headlineMatch.id}`}>
              <div className={styles.liveHeader}><div><small>{headlineMatch.roundLabelZh} · {headlineMatch.timeLabelZh ?? ""}</small><h2>{headlineEvent.nameZh} · {headlineMatch.roundLabelZh}</h2></div><StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} /></div>
              <div className={styles.homeScore}>
                <button onClick={() => openPlayer(headlineMatch.player1Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player1} size="lg" />{headlineMatch.winnerId === headlineMatch.player1Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player1.shortNameZh}</span></button>
                <div><strong>{headlineMatch.score1 ?? "-"} <i className={headlineMatch.status === "live" ? priority.liveSeparator : ""}>:</i> {headlineMatch.score2 ?? "-"}</strong><small>{bestOfLabel(headlineMatch.bestOf)}</small><span className={priority.scoreUpdated}><i />更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span></div>
                <button onClick={() => openPlayer(headlineMatch.player2Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player2} size="lg" />{headlineMatch.winnerId === headlineMatch.player2Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player2.shortNameZh}</span></button>
              </div>
              <button className={styles.fullButton} onClick={() => openMatch(headlineMatch.id, headlineEvent.slug)}>查看比赛详情</button>
              {headlineSelections.length > 1 ? <div className={priority.headlineSwipeHint}>左右滑动 · {index + 1}/{headlineSelections.length}</div> : null}
            </section>;
          })}
        </div> : null}

        <PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} headerClassName={styles.sectionHeader} />

        {nextEventCard ? <section className={styles.card}><SectionHeader eyebrow="NEXT EVENT" title="下一站" action={eventStatusLabel(nextEventCard)} actionClassName={`${polish.eventStatusText} ${eventStatusClass(nextEventCard.status)}`} /><button className={styles.nextEvent} onClick={() => openEvent(nextEventCard.slug)}><span>{nextEventCard.cityZh?.slice(0, 1) || "赛"}</span><div><strong>{nextEventCard.nameZh}</strong><small>{nextEventCard.nameEn}</small><p>{formatDateRange(nextEventCard.startDate, nextEventCard.endDate)} · {nextEventCard.cityZh}</p></div><em>›</em></button></section> : null}
        <section className={styles.card}><SectionHeader eyebrow="Official World Ranking" title="世界排名" action="TOP 3" /><div className={styles.rankingList}>{rankingRows.slice(0, 3).map((row) => <div className={polish.rankingStaticRow} key={row.rank}><strong>{row.rank}</strong><button className={polish.rankingAvatarButton} onClick={() => openPlayer(row.player.id)} aria-label={`查看${row.player.nameZh}球员详情`}><PlayerAvatar player={row.player} size="sm" /></button><span><b>{row.player.nameZh}</b><small>{row.player.nameEn}</small></span><em>{rankingMoney(row.points)}</em></div>)}</div><button className={styles.fullButton} onClick={() => changeView("data")}>查看完整世界排名</button></section>
        <section className={styles.card}><SectionHeader eyebrow="Official World Ranking" title="中国球员" action={`${chinaTop16.length} 人进入 TOP16`} /><div className={styles.chinaTopGrid}>{chinaTop16.map((row) => <button key={row.player.id} onClick={() => openPlayer(row.player.id)}><span>{row.rank}</span><strong>{row.player.nameZh}</strong><small>世界第 {row.rank}</small></button>)}</div></section>
      </> : null}

      {activeView === "matches" ? <>
        <section className={styles.pageIntro}><small>TOURNAMENTS</small><h1>赛事</h1><p>查看近期赛事和完整赛季赛历，及时了解正在进行、即将开始和已经结束的比赛。</p></section>
        <div className={priority.eventModeTabs}><button className={eventListMode === "recent" ? priority.eventModeActive : ""} onClick={() => setEventListMode("recent")}>近期赛事</button><button className={eventListMode === "calendar" ? priority.eventModeActive : ""} onClick={() => { setEventListMode("calendar"); void ensureCalendar(); }}>赛季赛历</button></div>
        {eventListMode === "calendar" ? <SeasonSelector seasons={seasonOptions} value={selectedSeason} onChange={setSelectedSeason} /> : null}
        {eventListMode === "recent" ? <>
          {featuredEventCard ? <section className={styles.currentEventBanner} onClick={() => openEvent(featuredEventCard.slug, "overview")}><div><span className={eventStatusClass(featuredEventCard.status)}><StatusPill status={featuredEventCard.status} label={featuredEventCard.status === "live" ? "正在进行" : featuredEventCard.status === "upcoming" ? "即将开始" : "最近结束"} /></span><small>{featuredEventCard.typeZh}</small></div><h2>{featuredEventCard.nameZh}</h2><p>{formatDateRange(featuredEventCard.startDate, featuredEventCard.endDate)} · {featuredEventCard.cityZh}</p><span>查看详情 ›</span></section> : null}
          <section className={styles.card}><SectionHeader eyebrow="RECENT TOURNAMENTS" title="近期赛事" action="本赛季" /><div className={styles.calendarList}>{recentListEvents.map((item) => <EventCard key={item.id} item={item} onOpen={() => openEvent(item.slug)} />)}{recentListEvents.length === 0 && !featuredEventCard ? <div className={styles.emptyState}>本赛季暂无可显示的赛事。</div> : null}</div></section>
        </> : calendarLoading && !calendarLoaded ? <section className={styles.card}><div className={styles.emptyState}>正在加载历史赛历…</div></section> : calendarLoadError && !calendarLoaded ? <section className={styles.card}><div className={styles.emptyState}>历史赛历加载失败，请稍后重试。</div><button className={styles.fullButton} onClick={() => void ensureCalendar()}>重新加载</button></section> : <section className={styles.card}><SectionHeader eyebrow={`${selectedSeason} SEASON`} title="赛季赛历" action={`共 ${selectedSeasonEvents.length} 项赛事`} /><div className={styles.calendarList}>{selectedSeasonEvents.map((item) => <EventCard key={item.id} item={item} onOpen={() => openEvent(item.slug)} />)}{selectedSeasonEvents.length === 0 ? <div className={styles.emptyState}>该赛季暂无赛事。</div> : null}</div></section>}
      </> : null}

      {activeView === "players" ? <PlayerDirectoryContent players={directoryPlayers} query={playerQuery} filter={playerFilter} onQueryChange={setPlayerQuery} onFilterChange={setPlayerFilter} onOpenPlayer={(player) => openPlayer(player.id)} onPrefetchPlayer={(player) => prefetchPlayerDetail(player.slug)} /> : null}

      {activeView === "data" ? <DataHubContent hub={initialRankingHub} players={directoryPlayers} selectedKey={selectedRankingKey} onSelectKey={setSelectedRankingKey} onOpenRankings={openRankings} onOpenPlayer={openPlayerBySlug} initialPlayerCompare={initialPlayerCompare} /> : null}
      <div className={styles.dataStatus} role="status">
        <i className={styles.liveOk} />
        <span>更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span>
      </div>
    </div>
    <nav className={`${styles.bottomNav} ${polish.fastNav}`}>{navItems.map((item) => <button key={item.id} className={item.id === activeView ? styles.activeNav : ""} onClick={() => changeView(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</nav>
    <span className={styles.buildMark}>{buildMark}</span>
  </div></main>;
}
