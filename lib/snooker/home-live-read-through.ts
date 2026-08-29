import type { SnookerDatabaseView } from "./database-public";
import type { SnookerEvent, SnookerMatch, SnookerMatchStatus } from "./domain";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

type DbHomeLiveMatch = {
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

function dbEventUuid(event: SnookerEvent) {
  return event.id.startsWith("db-event-") ? event.id.slice("db-event-".length) : null;
}

function dbMatchUuid(match: SnookerMatch) {
  return match.id.startsWith("db-") ? match.id.slice(3) : null;
}

function inFilter(ids: string[]) {
  return encodeURIComponent(`(${ids.join(",")})`);
}

function timestamp(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

async function restNoStore<T>(path: string): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SNOOKER_HOME_LIVE_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function isFrameEndedMidSessionInterval(row: DbHomeLiveMatch, previous: SnookerMatch) {
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

function normalizedStatus(row: DbHomeLiveMatch, previous: SnookerMatch): SnookerMatchStatus {
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

function mergeMatch(previous: SnookerMatch, row: DbHomeLiveMatch): SnookerMatch {
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

export async function refreshSnookerHomeLiveScore(view: SnookerDatabaseView): Promise<SnookerDatabaseView> {
  const eventIds = view.eventDetails.map(dbEventUuid).filter((id): id is string => Boolean(id));
  if (!eventIds.length) return view;

  try {
    const rows = await restNoStore<DbHomeLiveMatch[]>(
      `snooker_matches?select=id,event_id,score1,score2,status,source_status,source_status_meta,source_updated_at,completed_detected_at,current_player_side,current_break,live_frame_no&event_id=in.${inFilter(eventIds)}&order=match_no.asc`,
    );
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const eventDetails = view.eventDetails.map((event) => ({
      ...event,
      rounds: event.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          const uuid = dbMatchUuid(match);
          const row = uuid ? rowById.get(uuid) : undefined;
          return row ? mergeMatch(match, row) : match;
        }),
      })),
    }));
    const snapshotEvent = eventDetails.find((event) => event.slug === view.snapshot.event.slug) ?? view.snapshot.event;
    const loadedAt = new Date().toISOString();
    return {
      ...view,
      eventDetails,
      loadedAt,
      snapshot: { ...view.snapshot, event: snapshotEvent, builtAt: loadedAt },
    };
  } catch (error) {
    console.error("[snooker-home] score-only live read failed", error);
    return view;
  }
}
