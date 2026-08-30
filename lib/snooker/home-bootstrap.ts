import type { HomeLeaderMetricKey, HomeLeadersPayload } from "./home-leaders";
import { buildHomeLeaders } from "./home-leaders";
import type { SnookerDatabaseView } from "./database-public";
import { currentSnookerSeason } from "./database-public";
import { loadSnookerDatabaseViewV2 } from "./database-public-v2";
import type {
  SnookerCalendarEvent,
  SnookerEvent,
  SnookerMatch,
  SnookerMatchStatus,
  SnookerPlayer,
  SnookerRankingRow,
  SnookerRound,
  SnookerSeasonStatistics,
} from "./domain";
import { dashboardSnapshot } from "./foundation";
import type {
  PlayerCompareH2H,
  PlayerComparePlayer,
  PlayerCompareSeason,
  PlayerCompareSnapshot,
} from "./player-compare";
import type { SnookerRankingHub } from "./ranking-hub";
import { compactEventTypeLabel, normalizeEventTaxonomy, normalizePlayerStatus } from "./taxonomy";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/snooker_homepage_bootstrap_v1`;

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
};

type DbPlayer = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  short_name_en: string | null;
  short_name_zh: string | null;
  nationality_zh: string | null;
  country_code: string | null;
  date_of_birth: string | null;
  turned_pro: number | null;
  current_rank: number | null;
  ranking_points: number | null;
  avatar_url: string | null;
  profile_source: string | null;
  is_current_tour: boolean;
  tour_status: string;
  player_status: string;
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
  current_player_side: "home" | "away" | null;
  current_break: number | null;
  live_frame_no: number | null;
};

type DbRanking = {
  player_id: string;
  source_player_name: string | null;
  rank: number;
  points: number | string | null;
  ranking_money: number | string | null;
  previous_rank: number | null;
  rank_change: number | null;
  captured_at: string | null;
  source_name: string | null;
  source_url: string | null;
};

type DbSeasonStat = {
  player_id: string;
  season_start_year: number;
  season_label: string;
  ranking: number | null;
  tournaments_won: number | null;
  points_scored: number | string | null;
  matches_played: number | null;
  matches_won: number | null;
  match_win_rate: number | string | null;
  average_shot_time: number | string | null;
  breaks_50_plus: number | null;
  breaks_100_plus: number | null;
  highest_break: number | null;
  season_147s: number | null;
  average_break: number | string | null;
};

type RpcLeaderRow = {
  metric: HomeLeaderMetricKey;
  player_id: string;
  season_label: string | null;
  ranking: number | null;
  matches_played: number | null;
  match_win_rate: number | string | null;
  average_shot_time: number | string | null;
  breaks_100_plus: number | null;
  season_147s: number | null;
};

type DbCompareSeason = {
  player_id: string;
  season: string;
  season_start_year: number;
  matches_played: number | null;
  matches_won: number | null;
  matches_lost: number | null;
  match_win_rate: number | string | null;
  frames_won: number | null;
  frames_lost: number | null;
  frame_win_rate: number | string | null;
  frame_data_coverage_pct: number | string | null;
  breaks_100_plus: number | null;
  calculated_at: string | null;
};

type DbH2H = {
  player_low_id: string;
  player_high_id: string;
  match_records: number;
  meetings_played: number;
  player_low_wins: number;
  player_high_wins: number;
  draws: number;
  player_low_walkovers: number;
  player_high_walkovers: number;
  player_low_frames: number;
  player_high_frames: number;
  first_meeting_date: string | null;
  last_meeting_date: string | null;
  calculated_at: string | null;
};

type HomeRpcPayload = {
  season: string;
  season_start_year: number;
  generated_at: string;
  events: DbEvent[];
  rounds: DbRound[];
  matches: DbMatch[];
  ranking: DbRanking[];
  leaders: RpcLeaderRow[];
  players: DbPlayer[];
  season_stats: DbSeasonStat[];
  compare_season: DbCompareSeason[];
  h2h: DbH2H[];
};

export type SnookerHomeBootstrap = {
  database: SnookerDatabaseView;
  homeLeaders: HomeLeadersPayload;
  rankingHub: SnookerRankingHub;
  homePlayerCompare: PlayerCompareSnapshot | null;
};

function finite(value: number | string | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  if (status === "session-break") return "局间休息";
  if (status === "live") return "进行中";
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

function chineseLabel(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && /[\u3400-\u9fff]/.test(trimmed) ? trimmed : fallback;
}

function mapPlayers(rows: DbPlayer[]) {
  const uuidToCanonical = new Map<string, string>();
  const players = rows.map((row): SnookerPlayer => {
    const id = `p-${row.slug}`;
    uuidToCanonical.set(row.id, id);
    return {
      id,
      slug: row.slug,
      nameEn: row.name_en,
      nameZh: row.name_zh || row.name_en,
      shortNameZh: row.short_name_zh || row.name_zh || row.name_en,
      ...(row.short_name_en ? { shortNameEn: row.short_name_en } : {}),
      nationalityZh: row.nationality_zh || "未知",
      countryCode: row.country_code || "",
      currentRank: row.current_rank,
      rankingPoints: row.ranking_points,
      ...(row.date_of_birth ? { dateOfBirth: row.date_of_birth } : {}),
      ...(row.turned_pro ? { turnedPro: row.turned_pro } : {}),
      ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
      profileSource: row.profile_source === "WST" || row.profile_source === "snooker.org" ? row.profile_source : "curated",
      isCurrentTour: row.is_current_tour,
      tourStatus: row.tour_status,
      playerStatus: normalizePlayerStatus(row.player_status, row.is_current_tour, row.turned_pro),
    };
  });
  return { players, uuidToCanonical };
}

function mapSeason(row: DbSeasonStat): SnookerSeasonStatistics {
  return {
    seasonStartYear: row.season_start_year,
    seasonLabel: row.season_label,
    ...(finite(row.ranking) !== undefined ? { ranking: finite(row.ranking) } : {}),
    ...(finite(row.tournaments_won) !== undefined ? { tournamentsWon: finite(row.tournaments_won) } : {}),
    ...(finite(row.points_scored) !== undefined ? { pointsScored: finite(row.points_scored) } : {}),
    ...(finite(row.matches_played) !== undefined ? { matchesPlayed: finite(row.matches_played) } : {}),
    ...(finite(row.matches_won) !== undefined ? { matchesWon: finite(row.matches_won) } : {}),
    ...(finite(row.match_win_rate) !== undefined ? { matchWinRate: finite(row.match_win_rate) } : {}),
    ...(finite(row.average_shot_time) !== undefined ? { averageShotTimeSeconds: finite(row.average_shot_time) } : {}),
    ...(finite(row.breaks_50_plus) !== undefined ? { breaks50Plus: finite(row.breaks_50_plus) } : {}),
    ...(finite(row.breaks_100_plus) !== undefined ? { breaks100Plus: finite(row.breaks_100_plus) } : {}),
    ...(finite(row.highest_break) !== undefined ? { highestBreak: finite(row.highest_break) } : {}),
    ...(finite(row.season_147s) !== undefined ? { season147s: finite(row.season_147s) } : {}),
    ...(finite(row.average_break) !== undefined ? { averageBreak: finite(row.average_break) } : {}),
  };
}

function focusedRows(rows: DbEvent[]) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const ready = rows.filter((row) => row.data_ready);
  const active = ready.filter((row) => row.start_date && row.end_date && row.start_date <= today && row.end_date >= today);
  const latestCompleted = ready.filter((row) => row.end_date && row.end_date < today)
    .sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))[0];
  const nextUpcoming = ready.filter((row) => row.start_date && row.start_date > today)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))[0];
  return [...active, ...(latestCompleted ? [latestCompleted] : []), ...(nextUpcoming ? [nextUpcoming] : [])]
    .filter((row, index, list) => list.findIndex((item) => item.id === row.id) === index);
}

function buildEvents(
  eventRows: DbEvent[],
  roundRows: DbRound[],
  matchRows: DbMatch[],
  uuidToCanonical: Map<string, string>,
  loadedAt: string,
) {
  const roundsByEvent = new Map<string, DbRound[]>();
  for (const row of roundRows) {
    const list = roundsByEvent.get(row.event_id) ?? [];
    list.push(row);
    roundsByEvent.set(row.event_id, list);
  }
  const matchesByRound = new Map<string, DbMatch[]>();
  for (const row of matchRows) {
    if (!row.round_id) continue;
    const list = matchesByRound.get(row.round_id) ?? [];
    list.push(row);
    matchesByRound.set(row.round_id, list);
  }

  return eventRows.map((eventRow): SnookerEvent => {
    const startDate = eventRow.start_date || loadedAt.slice(0, 10);
    const endDate = eventRow.end_date || startDate;
    const status = statusFromDates(startDate, endDate);
    const rounds: SnookerRound[] = [...(roundsByEvent.get(eventRow.id) ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((roundRow) => {
        const matches: SnookerMatch[] = [...(matchesByRound.get(roundRow.id) ?? [])]
          .sort((a, b) => (a.match_no ?? 999) - (b.match_no ?? 999))
          .map((matchRow) => {
            const statusValue = matchStatus(matchRow.status);
            const winnerId = matchRow.winner_id ? uuidToCanonical.get(matchRow.winner_id) : undefined;
            return {
              id: `db-${matchRow.id}`,
              roundKey: roundRow.round_key,
              roundLabelZh: chineseLabel(roundRow.label_zh, "待确认轮次"),
              matchNo: matchRow.match_no ?? 0,
              bestOf: matchRow.best_of || roundRow.best_of || 0,
              player1Id: uuidToCanonical.get(matchRow.player1_id) || matchRow.player1_id,
              player2Id: uuidToCanonical.get(matchRow.player2_id) || matchRow.player2_id,
              score1: matchRow.score1,
              score2: matchRow.score2,
              status: statusValue,
              statusLabelZh: matchStatusLabel(statusValue),
              ...(matchRow.scheduled_at ? { scheduledAt: matchRow.scheduled_at, timeLabelZh: chinaTimeLabel(matchRow.scheduled_at) } : {}),
              ...(matchRow.session_label_zh ? { sessionLabelZh: matchRow.session_label_zh } : {}),
              ...(matchRow.note ? { note: matchRow.note } : {}),
              ...(winnerId ? { winnerId } : {}),
              ...(matchRow.source_updated_at ? { sourceUpdatedAt: matchRow.source_updated_at } : {}),
              ...(matchRow.completed_detected_at ? { completedDetectedAt: matchRow.completed_detected_at } : {}),
              ...(matchRow.current_player_side ? { currentPlayerSide: matchRow.current_player_side } : {}),
              ...(matchRow.current_break !== null ? { currentBreak: matchRow.current_break } : {}),
              ...(matchRow.live_frame_no !== null ? { liveFrameNo: matchRow.live_frame_no } : {}),
            };
          });
        return {
          key: roundRow.round_key,
          labelZh: chineseLabel(roundRow.label_zh, "待确认轮次"),
          labelEn: roundRow.label_en || roundRow.round_key,
          bestOf: roundRow.best_of || matches[0]?.bestOf || 0,
          ...(roundRow.loser_prize !== null ? { loserPrize: roundRow.loser_prize } : {}),
          matches,
        };
      });
    const taxonomy = normalizeEventTaxonomy(eventRow.event_type, eventRow.event_stage, eventRow.ranking_status, eventRow.type_zh);
    return {
      id: `db-event-${eventRow.id}`,
      sourceEventId: eventRow.source_event_id || "",
      slug: eventRow.slug,
      nameZh: eventRow.name_zh,
      nameEn: eventRow.name_en,
      ...(eventRow.sponsor_name ? { sponsorName: eventRow.sponsor_name } : {}),
      season: eventRow.season,
      typeZh: compactEventTypeLabel(taxonomy),
      eventType: taxonomy.eventType,
      eventStage: taxonomy.eventStage,
      rankingStatus: taxonomy.rankingStatus,
      status,
      statusLabelZh: statusLabel(status),
      startDate,
      endDate,
      cityZh: eventRow.city_zh || "待定",
      countryZh: eventRow.country_zh || "待定",
      venueZh: eventRow.venue_zh || "",
      ...(eventRow.venue_en ? { venueEn: eventRow.venue_en } : {}),
      winnerPrize: eventRow.winner_prize || 0,
      runnerUpPrize: eventRow.runner_up_prize || 0,
      currency: "GBP",
      ...(eventRow.referee_zh ? { refereeZh: eventRow.referee_zh } : {}),
      sourceName: eventRow.source_name || "Snooker DB",
      sourceUrl: eventRow.source_url || "",
      snapshotAt: eventRow.source_updated_at || loadedAt,
      rounds,
      detailPartial: true,
    };
  });
}

function buildCalendar(rows: DbEvent[], loadedAt: string): SnookerCalendarEvent[] {
  return rows.map((row) => {
    const startDate = row.start_date || loadedAt.slice(0, 10);
    const endDate = row.end_date || startDate;
    const status = statusFromDates(startDate, endDate);
    const taxonomy = normalizeEventTaxonomy(row.event_type, row.event_stage, row.ranking_status, row.type_zh);
    return {
      id: `db-calendar-${row.id}`,
      slug: row.slug,
      nameZh: row.name_zh,
      nameEn: row.name_en,
      season: row.season,
      typeZh: compactEventTypeLabel(taxonomy),
      eventType: taxonomy.eventType,
      eventStage: taxonomy.eventStage,
      rankingStatus: taxonomy.rankingStatus,
      status,
      statusLabelZh: statusLabel(status),
      startDate,
      endDate,
      cityZh: row.city_zh || "待定",
      countryZh: row.country_zh || "待定",
      ...(row.venue_zh ? { venueZh: row.venue_zh } : {}),
      current: status === "live",
      dataReady: row.data_ready,
    } satisfies SnookerCalendarEvent;
  });
}

const leaderMeta: Record<HomeLeaderMetricKey, { labelZh: string; labelEn: string; unit: "count" | "percent" | "seconds" }> = {
  maximums: { labelZh: "147", labelEn: "MAXIMUMS", unit: "count" },
  centuries: { labelZh: "破百数", labelEn: "CENTURIES", unit: "count" },
  win_rate: { labelZh: "胜率", labelEn: "WIN RATE", unit: "percent" },
  shot_time: { labelZh: "出杆时间", labelEn: "SHOT TIME", unit: "seconds" },
};

function buildLeaders(rows: RpcLeaderRow[], playerByUuid: Map<string, SnookerPlayer>, season: string): HomeLeadersPayload {
  const rowByMetric = new Map(rows.map((row) => [row.metric, row]));
  const order: HomeLeaderMetricKey[] = ["maximums", "centuries", "win_rate", "shot_time"];
  return {
    ok: true,
    seasonLabel: season,
    leaders: order.map((key) => {
      const row = rowByMetric.get(key);
      const player = row ? playerByUuid.get(row.player_id) : undefined;
      const value = !row ? undefined
        : key === "maximums" ? finite(row.season_147s)
          : key === "centuries" ? finite(row.breaks_100_plus)
            : key === "win_rate" ? finite(row.match_win_rate)
              : finite(row.average_shot_time);
      const meta = leaderMeta[key];
      return {
        key,
        labelZh: meta.labelZh,
        labelEn: meta.labelEn,
        unit: meta.unit,
        value: value ?? null,
        available: Boolean(player && value !== undefined),
        player: player ? {
          id: player.id,
          slug: player.slug,
          nameZh: player.nameZh,
          nameEn: player.nameEn,
          avatarUrl: player.avatarUrl || player.avatar?.url || null,
          currentRank: player.currentRank,
        } : null,
      };
    }),
  };
}

function comparePlayer(player: SnookerPlayer): PlayerComparePlayer {
  return {
    id: player.id,
    slug: player.slug,
    nameEn: player.nameEn,
    nameZh: player.nameZh,
    shortNameZh: player.shortNameZh || null,
    nationalityZh: player.nationalityZh || null,
    countryCode: player.countryCode || null,
    turnedPro: player.turnedPro ?? null,
    currentRank: player.currentRank,
    avatarUrl: player.avatarUrl || player.avatar?.url || null,
    isCurrentTour: player.isCurrentTour ?? player.currentRank !== null,
  };
}

function compareSeason(row: DbCompareSeason | undefined): PlayerCompareSeason | null {
  if (!row) return null;
  const frames = row.frames_won !== null && row.frames_lost !== null ? row.frames_won + row.frames_lost : null;
  const centuries = row.breaks_100_plus;
  return {
    season: row.season,
    seasonStartYear: row.season_start_year,
    eventsPlayed: null,
    matchesPlayed: row.matches_played,
    matchesWon: row.matches_won,
    matchesLost: row.matches_lost,
    matchesDrawn: null,
    matchWinRate: finite(row.match_win_rate) ?? null,
    walkoversWon: null,
    walkoversLost: null,
    framesWon: row.frames_won,
    framesLost: row.frames_lost,
    frameWinRate: finite(row.frame_win_rate) ?? null,
    frameCoveragePct: finite(row.frame_data_coverage_pct) ?? null,
    breaks50Plus: null,
    breaks100Plus: centuries,
    maximums: null,
    highestBreak: null,
    framesPer50: null,
    framesPerCentury: frames !== null && centuries && centuries > 0 ? frames / centuries : null,
    finals: null,
    titlesTotal: null,
    rankingFinals: null,
    rankingTitles: null,
    tripleCrownTitles: null,
    worldChampionshipTitles: null,
    ukChampionshipTitles: null,
    mastersTitles: null,
    ranking: null,
    pointsScored: null,
    averageShotTime: null,
    averageBreak: null,
    dataThrough: null,
    calculatedAt: row.calculated_at,
  };
}

function emptyH2H(): PlayerCompareH2H {
  return {
    matchRecords: 0,
    meetingsPlayed: 0,
    leftWins: 0,
    rightWins: 0,
    draws: 0,
    leftWalkovers: 0,
    rightWalkovers: 0,
    leftFrames: 0,
    rightFrames: 0,
    firstMeetingDate: null,
    lastMeetingDate: null,
    recentMeetings: [],
    calculatedAt: null,
  };
}

function buildHomeCompare(payload: HomeRpcPayload, playerByUuid: Map<string, SnookerPlayer>): PlayerCompareSnapshot | null {
  const ordered = [...payload.ranking].sort((a, b) => a.rank - b.rank).slice(0, 2);
  if (ordered.length < 2) return null;
  const leftUuid = ordered[0].player_id;
  const rightUuid = ordered[1].player_id;
  const left = playerByUuid.get(leftUuid);
  const right = playerByUuid.get(rightUuid);
  if (!left || !right) return null;
  const leftSeason = compareSeason(payload.compare_season.find((row) => row.player_id === leftUuid));
  const rightSeason = compareSeason(payload.compare_season.find((row) => row.player_id === rightUuid));
  const aggregate = payload.h2h[0];
  let h2h = emptyH2H();
  if (aggregate) {
    const leftIsLow = aggregate.player_low_id === leftUuid;
    h2h = {
      matchRecords: aggregate.match_records,
      meetingsPlayed: aggregate.meetings_played,
      leftWins: leftIsLow ? aggregate.player_low_wins : aggregate.player_high_wins,
      rightWins: leftIsLow ? aggregate.player_high_wins : aggregate.player_low_wins,
      draws: aggregate.draws,
      leftWalkovers: leftIsLow ? aggregate.player_low_walkovers : aggregate.player_high_walkovers,
      rightWalkovers: leftIsLow ? aggregate.player_high_walkovers : aggregate.player_low_walkovers,
      leftFrames: leftIsLow ? aggregate.player_low_frames : aggregate.player_high_frames,
      rightFrames: leftIsLow ? aggregate.player_high_frames : aggregate.player_low_frames,
      firstMeetingDate: aggregate.first_meeting_date,
      lastMeetingDate: aggregate.last_meeting_date,
      recentMeetings: [],
      calculatedAt: aggregate.calculated_at,
    };
  }
  const updatedAt = [leftSeason?.calculatedAt, rightSeason?.calculatedAt, h2h.calculatedAt, payload.generated_at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? payload.generated_at;
  return {
    players: [comparePlayer(left), comparePlayer(right)],
    season: payload.season,
    availableSeasons: [payload.season],
    seasonStats: [leftSeason, rightSeason],
    careerStats: [null, null],
    h2h,
    updatedAt,
    coverage: {
      leftFramePct: leftSeason?.frameCoveragePct ?? null,
      rightFramePct: rightSeason?.frameCoveragePct ?? null,
      leftCareerComplete: null,
      rightCareerComplete: null,
    },
  };
}

async function readHomeRpc(season: string, seasonStartYear: number): Promise<HomeRpcPayload> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_season: season, p_season_start_year: seasonStartYear }),
    cache: "force-cache",
    next: { revalidate: SNOOKER_CACHE_SECONDS.recent },
  });
  if (!response.ok) throw new Error(`SNOOKER_HOME_RPC_HTTP_${response.status}`);
  return response.json() as Promise<HomeRpcPayload>;
}

function buildFromRpc(payload: HomeRpcPayload): SnookerHomeBootstrap {
  const loadedAt = payload.generated_at || new Date().toISOString();
  const { players, uuidToCanonical } = mapPlayers(payload.players);
  const seasonByCanonical = new Map<string, SnookerSeasonStatistics>();
  for (const row of payload.season_stats) {
    const canonical = uuidToCanonical.get(row.player_id);
    if (canonical) seasonByCanonical.set(canonical, mapSeason(row));
  }
  const enrichedPlayers = players.map((player) => seasonByCanonical.has(player.id)
    ? { ...player, seasonStatistics: seasonByCanonical.get(player.id) }
    : player);
  const enrichedByUuid = new Map(payload.players.map((row, index) => [row.id, enrichedPlayers[index]]));

  const focusRows = focusedRows(payload.events);
  const eventDetails = buildEvents(focusRows, payload.rounds, payload.matches, uuidToCanonical, loadedAt);
  const activeEvent = eventDetails.find((event) => event.status === "live");
  const latestCompleted = [...eventDetails].filter((event) => event.status === "completed").sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const primaryEvent = activeEvent || latestCompleted || eventDetails[0] || dashboardSnapshot.event;
  const rankings: SnookerRankingRow[] = payload.ranking.map((row) => ({
    rank: row.rank,
    playerId: uuidToCanonical.get(row.player_id) || row.player_id,
    points: Number(row.ranking_money ?? row.points ?? 0),
  }));
  const rankingHub: SnookerRankingHub = {
    loadedAt,
    online: payload.ranking.length > 0,
    lists: [{
      key: "world_official",
      titleZh: "世界排名",
      titleEn: "Official World Ranking",
      descriptionZh: "官方两年滚动世界排名。首页仅保留前16名轻量数据，完整排名在进入数据页时读取。",
      sourceName: payload.ranking[0]?.source_name || "WPBSA",
      sourceUrl: payload.ranking[0]?.source_url || null,
      capturedAt: payload.ranking[0]?.captured_at || null,
      syncStatus: payload.ranking.length ? "synced" : "unavailable",
      rows: payload.ranking.map((row) => ({
        listKey: "world_official",
        playerUuid: row.player_id,
        playerSlug: enrichedByUuid.get(row.player_id)?.slug ?? null,
        sourcePlayerName: row.source_player_name || enrichedByUuid.get(row.player_id)?.nameEn || "",
        rank: row.rank,
        money: Number(row.ranking_money ?? row.points ?? 0),
        previousRank: row.previous_rank,
        rankChange: row.rank_change,
      })),
    }],
  };
  return {
    database: {
      snapshot: {
        ...dashboardSnapshot,
        version: "0.10.0-home-rpc",
        builtAt: loadedAt,
        event: primaryEvent,
        calendar: buildCalendar(payload.events, loadedAt),
        players: enrichedPlayers,
        rankings: rankings.length ? rankings : dashboardSnapshot.rankings,
      },
      eventDetails,
      eventSeries: [],
      currentSeason: payload.season,
      loadedAt,
      databaseOnline: true,
    },
    homeLeaders: buildLeaders(payload.leaders, enrichedByUuid, payload.season),
    rankingHub,
    homePlayerCompare: buildHomeCompare(payload, enrichedByUuid),
  };
}

function lightweightRankingHub(database: SnookerDatabaseView): SnookerRankingHub {
  const byId = new Map(database.snapshot.players.map((player) => [player.id, player]));
  return {
    loadedAt: database.loadedAt,
    online: database.databaseOnline,
    lists: [{
      key: "world_official",
      titleZh: "世界排名",
      titleEn: "Official World Ranking",
      descriptionZh: "官方两年滚动世界排名。",
      sourceName: "WPBSA",
      sourceUrl: null,
      capturedAt: database.loadedAt,
      syncStatus: database.databaseOnline ? "synced" : "unavailable",
      rows: database.snapshot.rankings.slice(0, 16).map((row) => ({
        listKey: "world_official",
        playerUuid: row.playerId,
        playerSlug: byId.get(row.playerId)?.slug ?? null,
        sourcePlayerName: byId.get(row.playerId)?.nameEn ?? "",
        rank: row.rank,
        money: row.points,
        previousRank: null,
        rankChange: null,
      })),
    }],
  };
}

async function buildFallbackHome(currentSeason: string): Promise<SnookerHomeBootstrap> {
  const database = await loadSnookerDatabaseViewV2();
  return {
    database,
    homeLeaders: buildHomeLeaders(database.snapshot.players, currentSeason),
    rankingHub: lightweightRankingHub(database),
    homePlayerCompare: null,
  };
}

let cachedHome: { value: SnookerHomeBootstrap; expiresAt: number; staleUntil: number } | null = null;
let inflightHome: Promise<SnookerHomeBootstrap> | null = null;

async function refreshHomeBootstrap() {
  const previous = cachedHome;
  const currentSeason = currentSnookerSeason();
  const seasonStartYear = Number(currentSeason.slice(0, 4));
  try {
    const value = buildFromRpc(await readHomeRpc(currentSeason, seasonStartYear));
    cachedHome = {
      value,
      expiresAt: Date.now() + SNOOKER_CACHE_SECONDS.recent * 1000,
      staleUntil: Date.now() + SNOOKER_CACHE_SECONDS.history * 1000,
    };
    return value;
  } catch (error) {
    if (previous && previous.staleUntil > Date.now()) {
      if (process.env.SNOOKER_BUILD_OFFLINE !== "1") console.error("[snooker-home] refresh failed, serving last successful home cache", error);
      return previous.value;
    }
    if (process.env.SNOOKER_BUILD_OFFLINE !== "1") console.error("[snooker-home] RPC unavailable, falling back to V2 stale-capable loader", error);
    const fallback = await buildFallbackHome(currentSeason);
    cachedHome = {
      value: fallback,
      expiresAt: Date.now() + Math.min(60, SNOOKER_CACHE_SECONDS.recent) * 1000,
      staleUntil: Date.now() + SNOOKER_CACHE_SECONDS.history * 1000,
    };
    return fallback;
  }
}

export async function loadSnookerHomeBootstrap(): Promise<SnookerHomeBootstrap> {
  const now = Date.now();
  if (cachedHome && cachedHome.expiresAt > now) return cachedHome.value;
  if (cachedHome && cachedHome.staleUntil > now) {
    if (!inflightHome) inflightHome = refreshHomeBootstrap().finally(() => { inflightHome = null; });
    return cachedHome.value;
  }
  if (inflightHome) return inflightHome;
  inflightHome = refreshHomeBootstrap().finally(() => { inflightHome = null; });
  return inflightHome;
}
