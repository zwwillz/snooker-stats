import type { SnookerEvent, SnookerFrame, SnookerMatchStatus, SnookerRound } from "./domain";
import { compactEventTypeLabel, normalizeEventTaxonomy } from "./taxonomy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const BATCH_SIZE = 32;

type DbEvent = {
  id: string;
  slug: string;
  season: string;
  name_en: string;
  name_zh: string;
  sponsor_name: string | null;
  type_zh: string | null;
  event_type: string | null;
  event_stage: string | null;
  ranking_status: string | null;
  start_date: string | null;
  end_date: string | null;
  country_zh: string | null;
  city_zh: string | null;
  venue_zh: string | null;
  venue_en: string | null;
  winner_prize: number | null;
  runner_up_prize: number | null;
  source_name: string | null;
  source_event_id: string | null;
  source_url: string | null;
  source_updated_at: string | null;
  referee_zh: string | null;
  data_ready: boolean;
  expected_match_count: number | null;
};

type DbRound = {
  id: string;
  event_id: string;
  round_key: string;
  label_en: string | null;
  label_zh: string | null;
  sort_order: number;
  best_of: number | null;
  loser_prize: number | null;
};

type DbMatch = {
  id: string;
  event_id: string;
  round_id: string | null;
  source_match_id: string | null;
  match_no: number | null;
  player1_id: string;
  player2_id: string;
  score1: number | null;
  score2: number | null;
  best_of: number | null;
  status: string;
  scheduled_at: string | null;
  session_label_zh: string | null;
  winner_id: string | null;
  note: string | null;
  source_updated_at: string | null;
  completed_detected_at: string | null;
};

type DbFrame = {
  id: string;
  match_id: string;
  frame_no: number;
  score1: number;
  score2: number;
  break1: number | null;
  break2: number | null;
  note: string | null;
};

type DbPlayer = { id: string; slug: string };

async function restNoStore<T>(path: string): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SNOOKER_EVENT_FRESH_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function inFilter(ids: string[]) {
  return encodeURIComponent(`(${ids.join(",")})`);
}

function batches(ids: string[]) {
  const result: string[][] = [];
  for (let index = 0; index < ids.length; index += BATCH_SIZE) result.push(ids.slice(index, index + BATCH_SIZE));
  return result;
}

async function restBatched<T>(ids: string[], path: (batch: string[]) => string) {
  if (!ids.length) return [] as T[];
  const settled = await Promise.allSettled(batches(ids).map((batch) => restNoStore<T[]>(path(batch))));
  return settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
}

function statusFromDates(startDate: string, endDate: string): "upcoming" | "live" | "completed" {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (today < startDate) return "upcoming";
  if (today > endDate) return "completed";
  return "live";
}

function statusLabel(status: "upcoming" | "live" | "completed") {
  return status === "completed" ? "已结束" : status === "live" ? "进行中" : "即将开始";
}

function matchStatus(value: string): SnookerMatchStatus {
  if (value === "completed" || value === "walkover" || value === "live" || value === "session-break") return value;
  return "upcoming";
}

function matchStatusLabel(status: SnookerMatchStatus) {
  if (status === "completed") return "已结束";
  if (status === "walkover") return "退赛晋级";
  if (status === "live") return "进行中";
  if (status === "session-break") return "局间休息";
  return "待开始";
}

function chinaTimeLabel(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value ?? "";
  return `${Number(part("month"))}月${Number(part("day"))}日 ${part("hour")}:${part("minute")}`;
}

function mapFrames(rows: DbFrame[]) {
  const result = new Map<string, SnookerFrame[]>();
  for (const row of rows) {
    const frame: SnookerFrame = {
      frameNo: row.frame_no,
      score1: row.score1,
      score2: row.score2,
      ...(row.break1 !== null ? { break1: row.break1 } : {}),
      ...(row.break2 !== null ? { break2: row.break2 } : {}),
      ...(row.note ? { note: row.note } : {}),
    };
    const list = result.get(row.match_id) ?? [];
    list.push(frame);
    result.set(row.match_id, list);
  }
  for (const list of result.values()) list.sort((a, b) => a.frameNo - b.frameNo);
  return result;
}

export async function loadSnookerEventDetailFresh(slug: string): Promise<SnookerEvent | null> {
  const loadedAt = new Date().toISOString();
  const [event] = await restNoStore<DbEvent[]>(
    `snooker_events?select=id,slug,season,name_en,name_zh,sponsor_name,type_zh,event_type,event_stage,ranking_status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,winner_prize,runner_up_prize,source_name,source_event_id,source_url,source_updated_at,referee_zh,data_ready,expected_match_count&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (!event || !event.data_ready) return null;

  const [roundRows, matchRows] = await Promise.all([
    restNoStore<DbRound[]>(`snooker_rounds?select=id,event_id,round_key,label_en,label_zh,sort_order,best_of,loser_prize&event_id=eq.${event.id}&order=sort_order.asc`),
    restNoStore<DbMatch[]>(`snooker_matches?select=id,event_id,round_id,source_match_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,session_label_zh,winner_id,note,source_updated_at,completed_detected_at&event_id=eq.${event.id}&order=match_no.asc`),
  ]);

  const playerIds = [...new Set(matchRows.flatMap((row) => [row.player1_id, row.player2_id, row.winner_id].filter((id): id is string => Boolean(id))))];
  const matchIds = matchRows.map((row) => row.id);
  const [playerRows, frameRows] = await Promise.all([
    restBatched<DbPlayer>(playerIds, (batch) => `snooker_players?select=id,slug&id=in.${inFilter(batch)}`),
    restBatched<DbFrame>(matchIds, (batch) => `snooker_frames?select=id,match_id,frame_no,score1,score2,break1,break2,note&match_id=in.${inFilter(batch)}&order=frame_no.asc`),
  ]);

  const canonicalByUuid = new Map(playerRows.map((row) => [row.id, `p-${row.slug}`]));
  const framesByMatch = mapFrames(frameRows);
  const matchesByRound = new Map<string, DbMatch[]>();
  for (const match of matchRows) {
    if (!match.round_id) continue;
    const list = matchesByRound.get(match.round_id) ?? [];
    list.push(match);
    matchesByRound.set(match.round_id, list);
  }

  const rounds: SnookerRound[] = [...roundRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((round) => {
      const matches = [...(matchesByRound.get(round.id) ?? [])]
        .sort((a, b) => (a.match_no ?? 999) - (b.match_no ?? 999))
        .map((match) => {
          const status = matchStatus(match.status);
          const frames = framesByMatch.get(match.id);
          const winnerId = match.winner_id ? canonicalByUuid.get(match.winner_id) : undefined;
          return {
            id: `db-${match.id}`,
            roundKey: round.round_key,
            roundLabelZh: round.label_zh || "待确认轮次",
            matchNo: match.match_no ?? 0,
            bestOf: match.best_of || round.best_of || 0,
            player1Id: canonicalByUuid.get(match.player1_id) || match.player1_id,
            player2Id: canonicalByUuid.get(match.player2_id) || match.player2_id,
            score1: match.score1,
            score2: match.score2,
            status,
            statusLabelZh: matchStatusLabel(status),
            ...(match.scheduled_at ? { scheduledAt: match.scheduled_at, timeLabelZh: chinaTimeLabel(match.scheduled_at) } : {}),
            ...(match.session_label_zh ? { sessionLabelZh: match.session_label_zh } : {}),
            ...(frames?.length ? { frames } : {}),
            ...(match.note ? { note: match.note } : {}),
            ...(winnerId ? { winnerId } : {}),
            ...(match.source_updated_at ? { sourceUpdatedAt: match.source_updated_at } : {}),
            ...(match.completed_detected_at ? { completedDetectedAt: match.completed_detected_at } : {}),
          };
        });
      return {
        key: round.round_key,
        labelZh: round.label_zh || "待确认轮次",
        labelEn: round.label_en || round.round_key,
        bestOf: round.best_of || matches[0]?.bestOf || 0,
        ...(round.loser_prize !== null ? { loserPrize: round.loser_prize } : {}),
        matches,
      };
    });

  const startDate = event.start_date || loadedAt.slice(0, 10);
  const endDate = event.end_date || startDate;
  const status = statusFromDates(startDate, endDate);
  const taxonomy = normalizeEventTaxonomy(event.event_type, event.event_stage, event.ranking_status, event.type_zh);
  const publishedMatchCount = matchRows.length;

  return {
    id: `db-event-${event.id}`,
    sourceEventId: event.source_event_id || "",
    slug: event.slug,
    nameZh: event.name_zh,
    nameEn: event.name_en,
    ...(event.sponsor_name ? { sponsorName: event.sponsor_name } : {}),
    season: event.season,
    typeZh: compactEventTypeLabel(taxonomy),
    eventType: taxonomy.eventType,
    eventStage: taxonomy.eventStage,
    rankingStatus: taxonomy.rankingStatus,
    status,
    statusLabelZh: statusLabel(status),
    startDate,
    endDate,
    cityZh: event.city_zh || "待定",
    countryZh: event.country_zh || "待定",
    venueZh: event.venue_zh || "",
    ...(event.venue_en ? { venueEn: event.venue_en } : {}),
    winnerPrize: event.winner_prize || 0,
    runnerUpPrize: event.runner_up_prize || 0,
    currency: "GBP",
    ...(event.referee_zh ? { refereeZh: event.referee_zh } : {}),
    sourceName: event.source_name || "Snooker DB",
    sourceUrl: event.source_url || "",
    snapshotAt: event.source_updated_at || loadedAt,
    rounds,
    ...(event.expected_match_count ? {
      publishedMatchCount,
      schedulePartial: publishedMatchCount < event.expected_match_count,
    } : {}),
  };
}
