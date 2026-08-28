import type { SnookerDatabaseView } from "./database-public";
import type { SnookerEvent, SnookerFrame, SnookerMatch, SnookerMatchPlayerStatistics, SnookerMatchStatus } from "./domain";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const ID_FILTER_BATCH_SIZE = 32;

type Numeric = number | string | null;

type DbLiveMatch = {
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

type DbLiveFrame = {
  match_id: string;
  frame_no: number;
  score1: number;
  score2: number;
  break1: number | null;
  break2: number | null;
  note: string | null;
};

type DbLiveStat = {
  match_id: string;
  side: string;
  total_points: number | null;
  average_shot_time_seconds: Numeric;
  pot_rate: Numeric;
  breaks_50_plus: number | null;
  breaks_100_plus: number | null;
  highest_break: number | null;
  average_break: Numeric;
  shots_taken: number | null;
  time_on_table_pct: Numeric;
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

function idBatches(ids: string[], batchSize = ID_FILTER_BATCH_SIZE) {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += batchSize) batches.push(ids.slice(index, index + batchSize));
  return batches;
}

async function restNoStore<T>(path: string): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SNOOKER_LIVE_READ_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

async function restNoStoreInBatches<T>(ids: string[], buildPath: (batch: string[]) => string) {
  if (!ids.length) return [] as T[];
  const results = await Promise.allSettled(idBatches(ids).map((batch) => restNoStore<T[]>(buildPath(batch))));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

function isFrameEndedMidSessionInterval(row: DbLiveMatch, previous: SnookerMatch) {
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

function normalizedLiveStatus(row: DbLiveMatch, previous: SnookerMatch): SnookerMatchStatus {
  const canonical = row.status;
  const sourceStatus = String(row.source_status ?? "").toLowerCase();
  const sourceMeta = String(row.source_status_meta ?? "").toLowerCase();
  if (canonical === "completed" || canonical === "walkover") return canonical;
  if (["suspended", "paused", "interrupted"].includes(sourceStatus)) return "session-break";
  if (/interval|session[ _-]?break|mid[ _-]?session|break|pause/.test(sourceMeta)) return "session-break";
  if (isFrameEndedMidSessionInterval(row, previous)) return "session-break";
  if (canonical === "session-break") return "session-break";
  if (canonical === "live" || sourceStatus === "live") return "live";
  if ((previous.status === "live" || previous.status === "session-break") && canonical === "upcoming") return previous.status;
  return "upcoming";
}

function statusLabel(status: SnookerMatchStatus) {
  if (status === "completed") return "已结束";
  if (status === "walkover") return "退赛晋级";
  if (status === "session-break") return "局间休息";
  if (status === "live") return "进行中";
  return "待开始";
}

function frameMap(rows: DbLiveFrame[]) {
  const map = new Map<string, SnookerFrame[]>();
  for (const row of rows) {
    const frame: SnookerFrame = {
      frameNo: row.frame_no,
      score1: row.score1,
      score2: row.score2,
      ...(row.break1 !== null ? { break1: row.break1 } : {}),
      ...(row.break2 !== null ? { break2: row.break2 } : {}),
      ...(row.note ? { note: row.note } : {}),
    };
    const list = map.get(row.match_id) ?? [];
    list.push(frame);
    map.set(row.match_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.frameNo - b.frameNo);
  return map;
}

function statisticMap(rows: DbLiveStat[]) {
  const map = new Map<string, DbLiveStat[]>();
  for (const row of rows) {
    const list = map.get(row.match_id) ?? [];
    list.push(row);
    map.set(row.match_id, list);
  }
  return map;
}

function finite(value: Numeric | undefined) {
  if (value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function mapStatistic(row: DbLiveStat, match: SnookerMatch): SnookerMatchPlayerStatistics | null {
  const playerId = row.side === "home" ? match.player1Id : row.side === "away" ? match.player2Id : null;
  if (!playerId) return null;
  return {
    playerId,
    ...(finite(row.total_points) !== undefined ? { totalPoints: finite(row.total_points) } : {}),
    ...(finite(row.average_shot_time_seconds) !== undefined ? { averageShotTimeSeconds: finite(row.average_shot_time_seconds) } : {}),
    ...(finite(row.pot_rate) !== undefined ? { potRate: finite(row.pot_rate) } : {}),
    ...(finite(row.breaks_50_plus) !== undefined ? { breaks50Plus: finite(row.breaks_50_plus) } : {}),
    ...(finite(row.breaks_100_plus) !== undefined ? { breaks100Plus: finite(row.breaks_100_plus) } : {}),
    ...(finite(row.highest_break) !== undefined ? { highestBreak: finite(row.highest_break) } : {}),
    ...(finite(row.average_break) !== undefined ? { averageBreak: finite(row.average_break) } : {}),
    ...(finite(row.shots_taken) !== undefined ? { shotsTaken: finite(row.shots_taken) } : {}),
    ...(finite(row.time_on_table_pct) !== undefined ? { timeOnTablePct: finite(row.time_on_table_pct) } : {}),
  };
}

function timestamp(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function isRealtimeRow(row: DbLiveMatch) {
  const sourceStatus = String(row.source_status ?? "").toLowerCase();
  const sourceMeta = String(row.source_status_meta ?? "").toLowerCase();
  if (row.status === "live" || row.status === "session-break" || sourceStatus === "live") return true;
  if (["suspended", "paused", "interrupted"].includes(sourceStatus)) return true;
  if (/interval|session[ _-]?break|mid[ _-]?session|break|pause/.test(sourceMeta)) return true;
  return Boolean(row.completed_detected_at && Date.now() - timestamp(row.completed_detected_at) <= 90 * 60 * 1000);
}

function mergeMatch(previous: SnookerMatch, row: DbLiveMatch, frames?: SnookerFrame[], statisticRows?: DbLiveStat[]) {
  const incomingUpdatedAt = row.source_updated_at ?? undefined;
  if (previous.sourceUpdatedAt && incomingUpdatedAt && timestamp(incomingUpdatedAt) < timestamp(previous.sourceUpdatedAt)) return previous;

  const status = normalizedLiveStatus(row, previous);
  if ((previous.status === "completed" || previous.status === "walkover") && status !== previous.status) return previous;

  const score1 = row.score1 ?? previous.score1;
  const score2 = row.score2 ?? previous.score2;
  const nextFrames = frames?.length ? frames : previous.frames;
  const nextStatistics = statisticRows?.map((stat) => mapStatistic(stat, previous)).filter((stat): stat is SnookerMatchPlayerStatistics => Boolean(stat));
  const next: SnookerMatch = {
    ...previous,
    score1,
    score2,
    status,
    statusLabelZh: statusLabel(status),
    ...(nextFrames?.length ? { frames: nextFrames } : {}),
    ...(nextStatistics?.length ? { statistics: nextStatistics } : {}),
    ...(incomingUpdatedAt ? { sourceUpdatedAt: incomingUpdatedAt } : {}),
    ...(row.completed_detected_at ? { completedDetectedAt: row.completed_detected_at } : {}),
    ...(row.current_break !== null ? { currentBreak: row.current_break } : {}),
    ...(row.live_frame_no !== null ? { liveFrameNo: row.live_frame_no } : {}),
    ...(status === "completed" && score1 !== null && score2 !== null && score1 !== score2
      ? { winnerId: score1 > score2 ? previous.player1Id : previous.player2Id }
      : {}),
  };

  if (status === "live" && (row.current_player_side === "home" || row.current_player_side === "away")) {
    next.currentPlayerSide = row.current_player_side;
  } else {
    delete next.currentPlayerSide;
  }
  if (row.current_break === null) delete next.currentBreak;
  return next;
}

export async function refreshEventsWithLiveReadThrough(events: SnookerEvent[]) {
  const eventIds = events.map(dbEventUuid).filter((id): id is string => Boolean(id));
  if (!eventIds.length) return events;
  try {
    const liveRows = await restNoStoreInBatches<DbLiveMatch>(
      eventIds,
      (batch) => `snooker_matches?select=id,event_id,score1,score2,status,source_status,source_status_meta,source_updated_at,completed_detected_at,current_player_side,current_break,live_frame_no&event_id=in.${inFilter(batch)}&order=match_no.asc`,
    );
    const baseByUuid = new Map(events.flatMap((event) => event.rounds.flatMap((round) => round.matches)).map((match) => [dbMatchUuid(match), match] as const));
    const realtimeIds = liveRows
      .filter((row) => isRealtimeRow(row))
      .map((row) => row.id)
      .filter((id) => baseByUuid.has(id));
    const [frameRows, statisticRows] = await Promise.all([
      restNoStoreInBatches<DbLiveFrame>(
        realtimeIds,
        (batch) => `snooker_frames?select=match_id,frame_no,score1,score2,break1,break2,note&match_id=in.${inFilter(batch)}&order=frame_no.asc`,
      ),
      restNoStoreInBatches<DbLiveStat>(
        realtimeIds,
        (batch) => `snooker_match_statistics?select=match_id,side,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,average_break,shots_taken,time_on_table_pct&match_id=in.${inFilter(batch)}`,
      ),
    ]);
    const framesByMatch = frameMap(frameRows);
    const statisticsByMatch = statisticMap(statisticRows);
    const rowByMatch = new Map(liveRows.map((row) => [row.id, row]));

    return events.map((event) => ({
      ...event,
      rounds: event.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          const uuid = dbMatchUuid(match);
          const row = uuid ? rowByMatch.get(uuid) : undefined;
          return row ? mergeMatch(match, row, framesByMatch.get(row.id), statisticsByMatch.get(row.id)) : match;
        }),
      })),
    }));
  } catch (error) {
    console.error("[snooker-live-read] live read-through failed", error);
    return events;
  }
}

export async function refreshSnookerDatabaseViewLive(view: SnookerDatabaseView): Promise<SnookerDatabaseView> {
  const eventDetails = await refreshEventsWithLiveReadThrough(view.eventDetails);
  const snapshotEvent = eventDetails.find((event) => event.slug === view.snapshot.event.slug) ?? view.snapshot.event;
  return {
    ...view,
    eventDetails,
    loadedAt: new Date().toISOString(),
    snapshot: { ...view.snapshot, event: snapshotEvent, builtAt: new Date().toISOString() },
  };
}

export async function refreshSingleEventLive(event: SnookerEvent) {
  return (await refreshEventsWithLiveReadThrough([event]))[0] ?? event;
}
