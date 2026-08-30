import type { SnookerEvent, SnookerMatchStatus, SnookerPlayer, SnookerPrizeRow, SnookerRound } from "./domain";
import { compactEventTypeLabel, normalizeEventTaxonomy } from "./taxonomy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { loadSnookerPlayersByDbIds } from "./scoped-player-data";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

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
  previous_champion_name_zh: string | null;
  previous_champion_year: number | null;
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
  current_player_side: string | null;
  current_break: number | null;
  live_frame_no: number | null;
};

type DbPrize = {
  prize_key: string;
  label_zh: string;
  label_en: string | null;
  amount: number;
  currency: string;
  sort_order: number;
  is_total: boolean;
};

async function rest<T>(path: string, noStore = false): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    ...(noStore ? { cache: "no-store" as const } : { next: { revalidate: SNOOKER_CACHE_SECONDS.recent } }),
  });
  if (!response.ok) throw new Error(`SNOOKER_EVENT_CORE_HTTP_${response.status}`);
  return response.json() as Promise<T>;
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

function eventStatusLabel(status: "upcoming" | "live" | "completed") {
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

export type SnookerEventCoreResult = {
  event: SnookerEvent;
  players: SnookerPlayer[];
};

export async function loadSnookerEventCore(slug: string): Promise<SnookerEventCoreResult | null> {
  const loadedAt = new Date().toISOString();
  const [event] = await rest<DbEvent[]>(
    `snooker_events?select=id,slug,season,name_en,name_zh,sponsor_name,type_zh,event_type,event_stage,ranking_status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,winner_prize,runner_up_prize,source_name,source_event_id,source_url,source_updated_at,referee_zh,data_ready,expected_match_count,previous_champion_name_zh,previous_champion_year&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (!event || !event.data_ready) return null;

  const [roundRows, matchRows, prizeRows] = await Promise.all([
    rest<DbRound[]>(`snooker_rounds?select=id,event_id,round_key,label_en,label_zh,sort_order,best_of,loser_prize&event_id=eq.${event.id}&order=sort_order.asc`),
    rest<DbMatch[]>(`snooker_matches?select=id,event_id,round_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,session_label_zh,winner_id,note,source_updated_at,completed_detected_at,current_player_side,current_break,live_frame_no&event_id=eq.${event.id}&order=match_no.asc`, true),
    rest<DbPrize[]>(`snooker_event_prizes?select=prize_key,label_zh,label_en,amount,currency,sort_order,is_total&event_id=eq.${event.id}&order=sort_order.asc`),
  ]);

  const participantDbIds = [...new Set(matchRows.flatMap((row) => [row.player1_id, row.player2_id, row.winner_id].filter((id): id is string => Boolean(id))))];
  const scopedPlayers = await loadSnookerPlayersByDbIds(participantDbIds);
  const canonical = scopedPlayers.canonicalByDbId;
  const matchesByRound = new Map<string, DbMatch[]>();
  for (const match of matchRows) {
    if (!match.round_id) continue;
    const list = matchesByRound.get(match.round_id) ?? [];
    list.push(match);
    matchesByRound.set(match.round_id, list);
  }

  const rounds: SnookerRound[] = [...roundRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((round) => ({
      key: round.round_key,
      labelZh: round.label_zh || "待确认轮次",
      labelEn: round.label_en || round.round_key,
      bestOf: round.best_of || 0,
      ...(round.loser_prize !== null ? { loserPrize: round.loser_prize } : {}),
      matches: [...(matchesByRound.get(round.id) ?? [])]
        .sort((a, b) => (a.match_no ?? 999) - (b.match_no ?? 999))
        .map((match) => {
          const status = matchStatus(match.status);
          const winnerId = match.winner_id ? canonical.get(match.winner_id) : undefined;
          const mapped = {
            id: `db-${match.id}`,
            roundKey: round.round_key,
            roundLabelZh: round.label_zh || "待确认轮次",
            matchNo: match.match_no ?? 0,
            bestOf: match.best_of || round.best_of || 0,
            player1Id: canonical.get(match.player1_id) || match.player1_id,
            player2Id: canonical.get(match.player2_id) || match.player2_id,
            score1: match.score1,
            score2: match.score2,
            status,
            statusLabelZh: matchStatusLabel(status),
            ...(match.scheduled_at ? { scheduledAt: match.scheduled_at, timeLabelZh: chinaTimeLabel(match.scheduled_at) } : {}),
            ...(match.session_label_zh ? { sessionLabelZh: match.session_label_zh } : {}),
            ...(match.note ? { note: match.note } : {}),
            ...(winnerId ? { winnerId } : {}),
            ...(match.source_updated_at ? { sourceUpdatedAt: match.source_updated_at } : {}),
            ...(match.completed_detected_at ? { completedDetectedAt: match.completed_detected_at } : {}),
            ...(match.current_break !== null ? { currentBreak: match.current_break } : {}),
            ...(match.live_frame_no !== null ? { liveFrameNo: match.live_frame_no } : {}),
          };
          return match.current_player_side === "home" || match.current_player_side === "away"
            ? { ...mapped, currentPlayerSide: match.current_player_side }
            : mapped;
        }),
    }));

  const startDate = event.start_date || loadedAt.slice(0, 10);
  const endDate = event.end_date || startDate;
  const status = statusFromDates(startDate, endDate);
  const taxonomy = normalizeEventTaxonomy(event.event_type, event.event_stage, event.ranking_status, event.type_zh);
  const prizes: SnookerPrizeRow[] = prizeRows.map((row) => ({
    key: row.prize_key,
    labelZh: row.label_zh,
    ...(row.label_en ? { labelEn: row.label_en } : {}),
    amount: Number(row.amount),
    currency: "GBP",
    sortOrder: row.sort_order,
    ...(row.is_total ? { isTotal: true } : {}),
  }));
  const publishedMatchCount = matchRows.length;

  return {
    players: scopedPlayers.players,
    event: {
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
      statusLabelZh: eventStatusLabel(status),
      startDate,
      endDate,
      cityZh: event.city_zh || "待定",
      countryZh: event.country_zh || "待定",
      venueZh: event.venue_zh || "",
      ...(event.venue_en ? { venueEn: event.venue_en } : {}),
      ...(event.previous_champion_name_zh ? { previousChampionZh: event.previous_champion_name_zh } : {}),
      ...(event.previous_champion_year ? { previousChampionYear: event.previous_champion_year } : {}),
      winnerPrize: event.winner_prize || 0,
      runnerUpPrize: event.runner_up_prize || 0,
      currency: "GBP",
      ...(prizes.length ? { prizes } : {}),
      ...(event.referee_zh ? { refereeZh: event.referee_zh } : {}),
      sourceName: event.source_name || "Snooker DB",
      sourceUrl: event.source_url || "",
      snapshotAt: event.source_updated_at || loadedAt,
      rounds,
      ...(event.expected_match_count ? {
        publishedMatchCount,
        schedulePartial: publishedMatchCount < event.expected_match_count,
      } : {}),
    },
  };
}
