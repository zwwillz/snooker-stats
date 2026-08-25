import type { SnookerDatabaseView } from "./database-public";
import type { SnookerEvent, SnookerFrame, SnookerMatch, SnookerMatchStatus } from "./domain";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const ID_FILTER_BATCH_SIZE = 32;

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

function normalizedLiveStatus(row: DbLiveMatch, previous: SnookerMatch): SnookerMatchStatus {
  const canonical = row.status;
  const sourceStatus = String(row.source_status ?? "").toLowerCase();
  const sourceMeta = String(row.source_status_meta ?? "").toLowerCase();
  if (canonical === "completed" || canonical === "walkover") return canonical;
  if (/interval|session[ _-]?break|mid[ _-]?session|break|pause/.test(sourceMeta)) return "session-break";
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

function timestamp(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function mergeMatch(previous: SnookerMatch, row: DbLiveMatch, frames?: SnookerFrame[]) {
  const incomingUpdatedAt = row.source_updated_at ?? undefined;
  if (previous.sourceUpdatedAt && incomingUpdatedAt && timestamp(incomingUpdatedAt) < timestamp(previous.sourceUpdatedAt)) return previous;

  const status = normalizedLiveStatus(row, previous);
  if ((previous.status === "completed" || previous.status === "walkover") && status !== previous.status) return previous;

  const score1 = row.score1 ?? previous.score1;
  const score2 = row.score2 ?? previous.score2;
  const nextFrames = frames?.length ? frames : previous.frames;
  return {
    ...previous,
    score1,
    score2,
    status,
    statusLabelZh: statusLabel(status),
    ...(nextFrames?.length ? { frames: nextFrames } : {}),
    ...(incomingUpdatedAt ? { sourceUpdatedAt: incomingUpdatedAt } : {}),
    ...(row.completed_detected_at ? { completedDetectedAt: row.completed_detected_at } : {}),
    ...(status === "completed" && score1 !== null && score2 !== null && score1 !== score2
      ? { winnerId: score1 > score2 ? previous.player1Id : previous.player2Id }
      : {}),
  } satisfies SnookerMatch;
}

export async function refreshEventsWithLiveReadThrough(events: SnookerEvent[]) {
  const eventIds = events.map(dbEventUuid).filter((id): id is string => Boolean(id));
  if (!eventIds.length) return events;
  try {
    const liveRows = await restNoStoreInBatches<DbLiveMatch>(
      eventIds,
      (batch) => `snooker_matches?select=id,event_id,score1,score2,status,source_status,source_status_meta,source_updated_at,completed_detected_at&event_id=in.${inFilter(batch)}&order=match_no.asc`,
    );
    const baseByUuid = new Map(events.flatMap((event) => event.rounds.flatMap((round) => round.matches)).map((match) => [dbMatchUuid(match), match] as const));
    const frameIds = liveRows
      .filter((row) => row.status === "live" || row.status === "session-break" || (row.completed_detected_at && Date.now() - timestamp(row.completed_detected_at) <= 90 * 60 * 1000))
      .map((row) => row.id)
      .filter((id) => baseByUuid.has(id));
    const frameRows = await restNoStoreInBatches<DbLiveFrame>(
      frameIds,
      (batch) => `snooker_frames?select=match_id,frame_no,score1,score2,break1,break2,note&match_id=in.${inFilter(batch)}&order=frame_no.asc`,
    );
    const framesByMatch = frameMap(frameRows);
    const rowByMatch = new Map(liveRows.map((row) => [row.id, row]));

    return events.map((event) => ({
      ...event,
      rounds: event.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          const uuid = dbMatchUuid(match);
          const row = uuid ? rowByMatch.get(uuid) : undefined;
          return row ? mergeMatch(match, row, framesByMatch.get(row.id)) : match;
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
