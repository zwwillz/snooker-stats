import type { SnookerMatch, SnookerMatchStatus } from "./domain";

export type HomeLiveMatchRow = {
  id: string;
  event_id: string;
  score1: number | null;
  score2: number | null;
  status: string;
  source_status: string | null;
  source_status_meta: string | null;
  source_updated_at: string | null;
  completed_detected_at: string | null;
  current_player_side: string | null;
  current_break: number | null;
  live_frame_no: number | null;
};

function timestamp(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

export function dbMatchUuid(match: SnookerMatch) {
  return match.id.startsWith("db-") ? match.id.slice(3) : null;
}

function isFrameEndedMidSessionInterval(row: HomeLiveMatchRow, previous: SnookerMatch) {
  const sourceStatus = String(row.source_status ?? "").toLowerCase();
  const sourceMeta = String(row.source_status_meta ?? "").toLowerCase();
  const homeFrames = Number(row.score1 ?? previous.score1 ?? 0);
  const awayFrames = Number(row.score2 ?? previous.score2 ?? 0);
  const completedFrames = homeFrames + awayFrames;
  const winTarget = Math.floor(previous.bestOf / 2) + 1;
  return sourceStatus === "live"
    && sourceMeta === "frame_has_ended"
    && previous.bestOf >= 9
    && completedFrames === 4
    && Math.max(homeFrames, awayFrames) < winTarget;
}

function normalizedStatus(row: HomeLiveMatchRow, previous: SnookerMatch): SnookerMatchStatus {
  const sourceStatus = String(row.source_status ?? "").toLowerCase();
  const sourceMeta = String(row.source_status_meta ?? "").toLowerCase();
  if (row.status === "completed" || row.status === "walkover") return row.status;
  if (["suspended", "paused", "interrupted"].includes(sourceStatus)) return "session-break";
  if (/interval|session[ _-]?break|mid[ _-]?session|break|pause/.test(sourceMeta)) return "session-break";
  if (isFrameEndedMidSessionInterval(row, previous)) return "session-break";
  if (row.status === "session-break") return "session-break";
  if (row.status === "live" || sourceStatus === "live") return "live";
  if ((previous.status === "live" || previous.status === "session-break") && row.status === "upcoming") return previous.status;
  return "upcoming";
}

function statusLabel(status: SnookerMatchStatus) {
  if (status === "completed") return "已结束";
  if (status === "walkover") return "退赛晋级";
  if (status === "session-break") return "局间休息";
  if (status === "live") return "进行中";
  return "待开始";
}

export function mergeHomeLiveMatch(previous: SnookerMatch, row: HomeLiveMatchRow): SnookerMatch {
  const incomingUpdatedAt = row.source_updated_at ?? undefined;
  if (previous.sourceUpdatedAt && incomingUpdatedAt && timestamp(incomingUpdatedAt) < timestamp(previous.sourceUpdatedAt)) return previous;

  const status = normalizedStatus(row, previous);
  if ((previous.status === "completed" || previous.status === "walkover") && status !== previous.status) return previous;

  const score1 = row.score1 ?? previous.score1;
  const score2 = row.score2 ?? previous.score2;
  const next: SnookerMatch = {
    ...previous,
    score1,
    score2,
    status,
    statusLabelZh: statusLabel(status),
    ...(incomingUpdatedAt ? { sourceUpdatedAt: incomingUpdatedAt } : {}),
    ...(row.completed_detected_at ? { completedDetectedAt: row.completed_detected_at } : {}),
    ...(row.current_break !== null ? { currentBreak: row.current_break } : {}),
    ...(row.live_frame_no !== null ? { liveFrameNo: row.live_frame_no } : {}),
    ...(status === "completed" && score1 !== null && score2 !== null && score1 !== score2
      ? { winnerId: score1 > score2 ? previous.player1Id : previous.player2Id }
      : {}),
  };

  if (status === "live" && (row.current_player_side === "home" || row.current_player_side === "away")) next.currentPlayerSide = row.current_player_side;
  else delete next.currentPlayerSide;
  if (row.current_break === null) delete next.currentBreak;
  return next;
}
