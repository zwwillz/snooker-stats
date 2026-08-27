import type { SnookerEvent, SnookerMatch, SnookerPlayer } from "./domain";

const FINAL_STATUSES = new Set(["completed", "walkover"]);
const HEADLINE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function time(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTotal(match: SnookerMatch) {
  return Number(match.score1 ?? 0) + Number(match.score2 ?? 0);
}

function isIncomingOlder(current: SnookerMatch, incoming: SnookerMatch) {
  if (current.sourceUpdatedAt && incoming.sourceUpdatedAt) return time(incoming.sourceUpdatedAt) < time(current.sourceUpdatedAt);
  return false;
}

export function mergeLiveMatchMonotonic(current: SnookerMatch, incoming: SnookerMatch) {
  if (isIncomingOlder(current, incoming)) return current;
  if (FINAL_STATUSES.has(current.status) && !FINAL_STATUSES.has(incoming.status)) return current;
  if ((current.status === "live" || current.status === "session-break") && incoming.status === "upcoming") return current;
  if (scoreTotal(incoming) < scoreTotal(current) && !FINAL_STATUSES.has(incoming.status)) return current;
  if ((incoming.frames?.length ?? 0) < (current.frames?.length ?? 0) && scoreTotal(incoming) <= scoreTotal(current)) {
    return { ...incoming, frames: current.frames };
  }
  return incoming;
}

export function mergeEventSnapshotsMonotonic(currentEvents: SnookerEvent[], incomingEvents: SnookerEvent[]) {
  const currentMatchById = new Map(currentEvents.flatMap((event) => event.rounds.flatMap((round) => round.matches)).map((match) => [match.id, match]));
  const mergeEvent = (event: SnookerEvent) => ({
    ...event,
    rounds: event.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const current = currentMatchById.get(match.id);
        return current ? mergeLiveMatchMonotonic(current, match) : match;
      }),
    })),
  });
  const incomingById = new Map(incomingEvents.map((event) => [event.id, mergeEvent(event)]));
  const currentIds = new Set(currentEvents.map((event) => event.id));
  return [
    ...currentEvents.map((event) => incomingById.get(event.id) ?? event),
    ...incomingEvents.filter((event) => !currentIds.has(event.id)).map(mergeEvent),
  ];
}

export function matchDisplayStatus(match: SnookerMatch) {
  if (match.status === "completed") return "已结束";
  if (match.status === "walkover") return "退赛晋级";
  if (match.status === "session-break") return "局间休息";
  if (match.status === "live") return "进行中";
  return "待开始";
}

function roundPriority(match: SnookerMatch) {
  const key = `${match.roundKey} ${match.roundLabelZh}`.toLowerCase();
  if (/final|决赛/.test(key) && !/semi|quarter|半决赛|1\/4/.test(key)) return 400;
  if (/semi|半决赛/.test(key)) return 300;
  if (/quarter|1\/4/.test(key)) return 200;
  return 100;
}

function chinaPriority(match: SnookerMatch, players: Map<string, SnookerPlayer>) {
  const p1 = players.get(match.player1Id);
  const p2 = players.get(match.player2Id);
  const china = (player?: SnookerPlayer) => player?.countryCode === "CN" || player?.countryCode === "CHN";
  return china(p1) || china(p2) ? 1 : 0;
}

function completedReferenceTime(match: SnookerMatch, now: number) {
  const futureTolerance = now + 10 * 60 * 1000;
  const timestamps = [match.completedDetectedAt, match.sourceUpdatedAt, match.scheduledAt]
    .map(time)
    .filter((value) => value > 0 && value <= futureTolerance);
  return timestamps.length ? Math.max(...timestamps) : 0;
}

export type HeadlineSelection = { event: SnookerEvent; match: SnookerMatch };

function stableTieBreak(a: HeadlineSelection, b: HeadlineSelection, players: Map<string, SnookerPlayer>) {
  const round = roundPriority(b.match) - roundPriority(a.match);
  if (round) return round;
  const china = chinaPriority(b.match, players) - chinaPriority(a.match, players);
  if (china) return china;
  return a.match.matchNo - b.match.matchNo || a.match.id.localeCompare(b.match.id);
}

function sortLiveCandidates(candidates: HeadlineSelection[], players: Map<string, SnookerPlayer>) {
  return candidates.sort((a, b) => {
    const aLive = a.match.status === "live" ? 1 : 0;
    const bLive = b.match.status === "live" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return stableTieBreak(a, b, players) || time(a.match.scheduledAt) - time(b.match.scheduledAt);
  });
}

function sortUpcomingCandidates(candidates: HeadlineSelection[], players: Map<string, SnookerPlayer>) {
  return candidates.sort((a, b) => {
    const scheduled = time(a.match.scheduledAt) - time(b.match.scheduledAt);
    return scheduled || stableTieBreak(a, b, players);
  });
}

function sortCompletedCandidates(candidates: HeadlineSelection[], players: Map<string, SnookerPlayer>, now: number) {
  return candidates.sort((a, b) => {
    const completed = completedReferenceTime(b.match, now) - completedReferenceTime(a.match, now);
    return completed || stableTieBreak(a, b, players);
  });
}

export function selectHomepageHeadlineMatches(
  events: SnookerEvent[],
  players: Map<string, SnookerPlayer>,
  now = Date.now(),
  limit = 4,
): HeadlineSelection[] {
  const candidates: HeadlineSelection[] = events.flatMap((event) => event.rounds.flatMap((round) => round.matches.map((match) => ({ event, match }))));

  const live = candidates.filter(({ match }) => match.status === "live" || match.status === "session-break");
  if (live.length) {
    sortLiveCandidates(live, players);
    return live.slice(0, Math.max(1, Math.min(4, limit)));
  }

  const upcoming = candidates.filter(({ match }) => {
    if (match.status !== "upcoming") return false;
    const scheduled = time(match.scheduledAt);
    return scheduled > now && scheduled - now <= HEADLINE_WINDOW_MS;
  });
  if (upcoming.length) {
    sortUpcomingCandidates(upcoming, players);
    return upcoming.slice(0, 1);
  }

  const recentlyCompleted = candidates.filter(({ match }) => {
    if (!FINAL_STATUSES.has(match.status)) return false;
    const completedAt = completedReferenceTime(match, now);
    return completedAt > 0 && now - completedAt >= 0 && now - completedAt <= HEADLINE_WINDOW_MS;
  });
  if (recentlyCompleted.length) {
    sortCompletedCandidates(recentlyCompleted, players, now);
    return recentlyCompleted.slice(0, 1);
  }

  return [];
}

export function selectHomepageHeadlineMatch(events: SnookerEvent[], players: Map<string, SnookerPlayer>, now = Date.now()): HeadlineSelection | null {
  return selectHomepageHeadlineMatches(events, players, now, 1)[0] ?? null;
}
