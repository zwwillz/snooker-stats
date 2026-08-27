import { loadSnookerEventDetailFresh } from "./event-detail-fresh";
import type {
  SnookerEvent,
  SnookerHeadToHead,
  SnookerHeadToHeadMeeting,
  SnookerMatchPlayerStatistics,
  SnookerPrizeRow,
} from "./domain";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";

const ID_FILTER_BATCH_SIZE = 32;
const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

type Numeric = number | string | null;
type DbPlayerKey = { id: string; slug: string };
type DbEventMeta = {
  id: string;
  previous_champion_name_zh: string | null;
  previous_champion_year: number | null;
  expected_match_count: number | null;
};
type DbPrize = {
  event_id: string;
  prize_key: string;
  label_zh: string;
  label_en: string | null;
  amount: number;
  currency: string;
  sort_order: number;
  is_total: boolean;
};
type DbMatchStat = {
  match_id: string;
  player_id: string;
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
type DbHeadToHead = {
  match_id: string;
  meetings_before: number;
  player1_wins: number;
  player2_wins: number;
  player1_frames: number;
  player2_frames: number;
  recent_meetings: SnookerHeadToHeadMeeting[] | null;
  source_updated_at: string | null;
};

async function rest<T>(path: string, revalidate = SNOOKER_CACHE_SECONDS.history): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) throw new Error(`SNOOKER_EVENT_DETAIL_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function inFilter(ids: string[]) {
  return encodeURIComponent(`(${ids.join(",")})`);
}

function idBatches(ids: string[], batchSize = ID_FILTER_BATCH_SIZE) {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += batchSize) batches.push(ids.slice(index, index + batchSize));
  return batches;
}

async function restInBatches<T>(ids: string[], buildPath: (batch: string[]) => string, label: string): Promise<T[]> {
  if (!ids.length) return [];
  const settled = await Promise.allSettled(idBatches(ids).map((batch) => rest<T[]>(buildPath(batch))));
  const rows: T[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") rows.push(...result.value);
    else console.error(`[snooker-event-detail] ${label} batch ${index + 1}/${settled.length} failed`, result.reason);
  });
  return rows;
}

function finite(value: Numeric | undefined) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? undefined : Number(value);
}

function mapStat(row: DbMatchStat, playerId: string): SnookerMatchPlayerStatistics {
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

function dbEventUuid(event: SnookerEvent) {
  return event.id.startsWith("db-event-") ? event.id.slice("db-event-".length) : null;
}

function dbMatchUuid(matchId: string) {
  return matchId.startsWith("db-") ? matchId.slice(3) : null;
}

export async function loadSnookerEventDetailComplete(slug: string): Promise<SnookerEvent | null> {
  const event = await loadSnookerEventDetailFresh(slug);
  if (!event) return null;

  const eventUuid = dbEventUuid(event);
  const matchUuids = event.rounds
    .flatMap((round) => round.matches.map((match) => dbMatchUuid(match.id)))
    .filter((id): id is string => Boolean(id));
  if (!eventUuid || !matchUuids.length) return event;

  const [metaRows, prizeRows, playerRows, statRows, h2hRows] = await Promise.all([
    rest<DbEventMeta[]>(`snooker_events?select=id,previous_champion_name_zh,previous_champion_year,expected_match_count&id=eq.${eventUuid}&limit=1`),
    rest<DbPrize[]>(`snooker_event_prizes?select=event_id,prize_key,label_zh,label_en,amount,currency,sort_order,is_total&event_id=eq.${eventUuid}&order=sort_order.asc`),
    rest<DbPlayerKey[]>("snooker_players?select=id,slug"),
    restInBatches<DbMatchStat>(
      matchUuids,
      (batch) => `snooker_match_statistics?select=match_id,player_id,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,average_break,shots_taken,time_on_table_pct&match_id=in.${inFilter(batch)}`,
      "match statistics",
    ),
    restInBatches<DbHeadToHead>(
      matchUuids,
      (batch) => `snooker_match_head_to_head?select=match_id,meetings_before,player1_wins,player2_wins,player1_frames,player2_frames,recent_meetings,source_updated_at&match_id=in.${inFilter(batch)}`,
      "head-to-head",
    ),
  ]);

  const playerCanonicalByUuid = new Map(playerRows.map((row) => [row.id, `p-${row.slug}`]));
  const statsByMatch = new Map<string, SnookerMatchPlayerStatistics[]>();
  for (const row of statRows) {
    const canonical = playerCanonicalByUuid.get(row.player_id);
    if (!canonical) continue;
    const list = statsByMatch.get(row.match_id) ?? [];
    list.push(mapStat(row, canonical));
    statsByMatch.set(row.match_id, list);
  }

  const h2hByMatch = new Map<string, SnookerHeadToHead>();
  for (const row of h2hRows) {
    h2hByMatch.set(row.match_id, {
      meetings: row.meetings_before,
      player1Wins: row.player1_wins,
      player2Wins: row.player2_wins,
      player1Frames: row.player1_frames,
      player2Frames: row.player2_frames,
      recentMeetings: Array.isArray(row.recent_meetings) ? row.recent_meetings : [],
      ...(row.source_updated_at ? { sourceUpdatedAt: row.source_updated_at } : {}),
    });
  }

  let publishedMatchCount = 0;
  const rounds = event.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      publishedMatchCount += 1;
      const uuid = dbMatchUuid(match.id);
      return {
        ...match,
        ...(uuid && statsByMatch.has(uuid) ? { statistics: statsByMatch.get(uuid) } : {}),
        ...(uuid && h2hByMatch.has(uuid) ? { headToHead: h2hByMatch.get(uuid) } : {}),
      };
    }),
  }));

  const meta = metaRows[0];
  const prizes: SnookerPrizeRow[] = prizeRows.map((row) => ({
    key: row.prize_key,
    labelZh: row.label_zh,
    ...(row.label_en ? { labelEn: row.label_en } : {}),
    amount: Number(row.amount),
    currency: "GBP",
    sortOrder: row.sort_order,
    ...(row.is_total ? { isTotal: true } : {}),
  }));
  const expected = meta?.expected_match_count ?? null;

  return {
    ...event,
    rounds,
    ...(meta?.previous_champion_name_zh ? { previousChampionZh: meta.previous_champion_name_zh } : {}),
    ...(meta?.previous_champion_year ? { previousChampionYear: meta.previous_champion_year } : {}),
    ...(prizes.length ? { prizes } : {}),
    ...(expected ? { publishedMatchCount, schedulePartial: publishedMatchCount < expected } : {}),
  };
}
