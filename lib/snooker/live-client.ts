import type { SnookerEvent, SnookerMatch, SnookerPlayer } from "./domain";

const FINAL_STATUSES = new Set(["completed", "walkover"]);

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
  return incomingEvents.map((event) => ({
    ...event,
    rounds: event.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const current = currentMatchById.get(match.id);
        return current ? mergeLiveMatchMonotonic(current, match) : match;
      }),
    })),
  }));
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

function statePriority(match: SnookerMatch, now: number) {
  if (match.status === "live") return 500;
  if (match.status === "session-break") return 450;
  if (FINAL_STATUSES.has(match.status)) {
    const completedAt = time(match.completedDetectedAt || match.sourceUpdatedAt);
    return completedAt && now - completedAt <= 60 * 60 * 1000 ? 300 : 0;
  }
  if (match.status === "upcoming") return 100;
  return 0;
}

export type HeadlineSelection = { event: SnookerEvent; match: SnookerMatch } | null;

export function selectHomepageHeadlineMatch(events: SnookerEvent[], players: Map<string, SnookerPlayer>, now = Date.now()): HeadlineSelection {
  const candidates = events.flatMap((event) => event.rounds.flatMap((round) => round.matches.map((match) => ({ event, match }))));
  const liveExists = candidates.some(({ match }) => match.status === "live" || match.status === "session-break");
  const eligible = candidates.filter(({ match }) => {
    if (match.status === "live" || match.status === "session-break") return true;
    if (FINAL_STATUSES.has(match.status)) {
      if (liveExists) return false;
      const completedAt = time(match.completedDetectedAt || match.sourceUpdatedAt);
      return completedAt > 0 && now - completedAt <= 60 * 60 * 1000;
    }
    if (match.status === "upcoming") {
      const scheduled = time(match.scheduledAt);
      return !liveExists && scheduled > 0 && scheduled >= now && scheduled - now <= 6 * 60 * 60 * 1000;
    }
    return false;
  });
  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const state = statePriority(b.match, now) - statePriority(a.match, now);
    if (state) return state;
    const round = roundPriority(b.match) - roundPriority(a.match);
    if (round) return round;
    const china = chinaPriority(b.match, players) - chinaPriority(a.match, players);
    if (china) return china;
    const scheduled = time(a.match.scheduledAt) - time(b.match.scheduledAt);
    if (scheduled) return scheduled;
    return a.match.matchNo - b.match.matchNo || a.match.id.localeCompare(b.match.id);
  });
  return eligible[0];
}
