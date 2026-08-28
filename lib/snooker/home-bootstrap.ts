import type { HomeLeaderItem, HomeLeaderMetricKey, HomeLeadersPayload } from "./home-leaders";
import type { SnookerDatabaseView } from "./database-public";
import { currentSnookerSeason } from "./database-public";
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
import type { SnookerRankingHub } from "./ranking-hub";
import { compactEventTypeLabel, normalizeEventTaxonomy, normalizePlayerStatus } from "./taxonomy";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

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
  points_scored: number | null;
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

type LeaderRow = Pick<DbSeasonStat, "player_id" | "ranking" | "matches_played" | "match_win_rate" | "average_shot_time" | "breaks_100_plus" | "season_147s">;

export type SnookerHomeBootstrap = {
  database: SnookerDatabaseView;
  homeLeaders: HomeLeadersPayload;
  rankingHub: SnookerRankingHub;
};

async function rest<T>(path: string, revalidate = SNOOKER_CACHE_SECONDS.recent): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) throw new Error(`SNOOKER_HOME_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function inFilter(ids: string[]) {
  return encodeURIComponent(`(${ids.join(",")})`);
}

function chinaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusFromDates(startDate: string, endDate: string): "upcoming" | "live" | "completed" {
  const today = chinaToday();
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
      nameZh: row.name_zh,
      shortNameZh: row.short_name_zh || row.name_zh,
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

function finite(value: number | string | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
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
  const today = chinaToday();
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

const leaderDefinitions: Array<{
  key: HomeLeaderMetricKey;
  labelZh: string;
  labelEn: string;
  unit: HomeLeaderItem["unit"];
  value: (row: LeaderRow) => number | null | undefined;
}> = [
  { key: "maximums", labelZh: "147", labelEn: "MAXIMUMS", unit: "count", value: (row) => row.season_147s },
  { key: "centuries", labelZh: "破百数", labelEn: "CENTURIES", unit: "count", value: (row) => row.breaks_100_plus },
  { key: "win_rate", labelZh: "胜率", labelEn: "WIN RATE", unit: "percent", value: (row) => finite(row.match_win_rate) },
  { key: "shot_time", labelZh: "出杆时间", labelEn: "SHOT TIME", unit: "seconds", value: (row) => finite(row.average_shot_time) },
];

function buildHomeLeadersFromRows(rows: Array<LeaderRow | undefined>, playersByUuid: Map<string, SnookerPlayer>, seasonLabel: string): HomeLeadersPayload {
  return {
    ok: true,
    seasonLabel,
    leaders: leaderDefinitions.map((definition, index) => {
      const row = rows[index];
      const value = row ? finite(definition.value(row) ?? null) : undefined;
      const player = row ? playersByUuid.get(row.player_id) : undefined;
      return {
        key: definition.key,
        labelZh: definition.labelZh,
        labelEn: definition.labelEn,
        value: value ?? null,
        unit: definition.unit,
        available: Boolean(player && value !== undefined),
        player: player ? {
          id: player.id,
          slug: player.slug,
          nameZh: player.nameZh || player.nameEn,
          nameEn: player.nameEn,
          avatarUrl: player.avatarUrl || player.avatar?.url || null,
          currentRank: player.currentRank,
        } : null,
      };
    }),
  };
}

export async function loadSnookerHomeBootstrap(): Promise<SnookerHomeBootstrap> {
  const loadedAt = new Date().toISOString();
  const currentSeason = currentSnookerSeason();
  const seasonStartYear = Number(currentSeason.slice(0, 4));
  try {
    const [eventRows, playerRows, rankingRows, maximumRows, centuryRows, winRateRows, shotTimeRows] = await Promise.all([
      rest<DbEvent[]>(`snooker_events?select=id,slug,season,name_en,name_zh,sponsor_name,type_zh,event_type,event_stage,ranking_status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,winner_prize,runner_up_prize,source_name,source_event_id,source_url,source_updated_at,referee_zh,data_ready&season=eq.${encodeURIComponent(currentSeason)}&order=start_date.asc`),
      rest<DbPlayer[]>("snooker_public_players?select=id,slug,name_en,name_zh,short_name_en,short_name_zh,nationality_zh,country_code,date_of_birth,turned_pro,current_rank,ranking_points,avatar_url,profile_source,is_current_tour,tour_status,player_status&order=current_rank.asc.nullslast,name_en.asc", SNOOKER_CACHE_SECONDS.player),
      rest<DbRanking[]>("snooker_latest_rankings?select=player_id,source_player_name,rank,points,ranking_money,previous_rank,rank_change,captured_at,source_name,source_url&list_key=eq.world_official&order=rank.asc&limit=16"),
      rest<LeaderRow[]>(`snooker_player_season_stats?select=player_id,ranking,matches_played,match_win_rate,average_shot_time,breaks_100_plus,season_147s&season_start_year=eq.${seasonStartYear}&season_147s=gt.0&order=season_147s.desc,ranking.asc&limit=1`),
      rest<LeaderRow[]>(`snooker_player_season_stats?select=player_id,ranking,matches_played,match_win_rate,average_shot_time,breaks_100_plus,season_147s&season_start_year=eq.${seasonStartYear}&breaks_100_plus=not.is.null&order=breaks_100_plus.desc,ranking.asc&limit=1`),
      rest<LeaderRow[]>(`snooker_player_season_stats?select=player_id,ranking,matches_played,match_win_rate,average_shot_time,breaks_100_plus,season_147s&season_start_year=eq.${seasonStartYear}&matches_played=gte.5&match_win_rate=not.is.null&order=match_win_rate.desc,ranking.asc&limit=1`),
      rest<LeaderRow[]>(`snooker_player_season_stats?select=player_id,ranking,matches_played,match_win_rate,average_shot_time,breaks_100_plus,season_147s&season_start_year=eq.${seasonStartYear}&matches_played=gte.5&average_shot_time=gt.0&order=average_shot_time.asc,ranking.asc&limit=1`),
    ]);

    const { players, uuidToCanonical } = mapPlayers(playerRows);
    const playerByUuid = new Map(playerRows.map((row, index) => [row.id, players[index]]));
    const focusRows = focusedRows(eventRows);
    const focusIds = focusRows.map((row) => row.id);
    const [roundRows, matchRows] = focusIds.length ? await Promise.all([
      rest<DbRound[]>(`snooker_rounds?select=id,event_id,round_key,label_en,label_zh,sort_order,best_of,loser_prize&event_id=in.${inFilter(focusIds)}&order=sort_order.asc`),
      rest<DbMatch[]>(`snooker_matches?select=id,event_id,round_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,session_label_zh,winner_id,note,source_updated_at,completed_detected_at&event_id=in.${inFilter(focusIds)}&order=match_no.asc`),
    ]) : [[], []] as [DbRound[], DbMatch[]];

    const participantIds = [...new Set(matchRows.flatMap((row) => [row.player1_id, row.player2_id]))];
    const participantStats = participantIds.length ? await rest<DbSeasonStat[]>(
      `snooker_player_season_stats?select=player_id,season_start_year,season_label,ranking,tournaments_won,points_scored,matches_played,matches_won,match_win_rate,average_shot_time,breaks_50_plus,breaks_100_plus,highest_break,season_147s,average_break&season_start_year=eq.${seasonStartYear}&player_id=in.${inFilter(participantIds)}`,
    ) : [];
    const seasonByCanonical = new Map<string, SnookerSeasonStatistics>();
    for (const row of participantStats) {
      const canonical = uuidToCanonical.get(row.player_id);
      if (canonical) seasonByCanonical.set(canonical, mapSeason(row));
    }
    const enrichedPlayers = players.map((player) => seasonByCanonical.has(player.id) ? { ...player, seasonStatistics: seasonByCanonical.get(player.id) } : player);

    const eventDetails = buildEvents(focusRows, roundRows, matchRows, uuidToCanonical, loadedAt);
    const activeEvent = eventDetails.find((event) => event.status === "live");
    const latestCompleted = [...eventDetails].filter((event) => event.status === "completed").sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
    const primaryEvent = activeEvent || latestCompleted || eventDetails[0] || dashboardSnapshot.event;
    const rankings: SnookerRankingRow[] = rankingRows.map((row) => ({
      rank: row.rank,
      playerId: uuidToCanonical.get(row.player_id) || row.player_id,
      points: Number(row.ranking_money ?? row.points ?? 0),
    }));
    const homeLeaders = buildHomeLeadersFromRows(
      [maximumRows[0], centuryRows[0], winRateRows[0], shotTimeRows[0]],
      playerByUuid,
      currentSeason,
    );
    const rankingHub: SnookerRankingHub = {
      loadedAt,
      online: rankingRows.length > 0,
      lists: [{
        key: "world_official",
        titleZh: "世界排名",
        titleEn: "Official World Ranking",
        descriptionZh: "官方两年滚动世界排名。首页仅保留前16名轻量数据，完整排名进入数据中心后加载。",
        sourceName: rankingRows[0]?.source_name || "WPBSA",
        sourceUrl: rankingRows[0]?.source_url || null,
        capturedAt: rankingRows[0]?.captured_at || null,
        syncStatus: rankingRows.length ? "synced" : "unavailable",
        rows: rankingRows.map((row) => ({
          listKey: "world_official",
          playerUuid: row.player_id,
          playerSlug: playerByUuid.get(row.player_id)?.slug ?? null,
          sourcePlayerName: row.source_player_name || playerByUuid.get(row.player_id)?.nameEn || "",
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
          version: "0.9.0-home-bootstrap",
          builtAt: loadedAt,
          event: primaryEvent,
          calendar: buildCalendar(eventRows, loadedAt),
          players: enrichedPlayers,
          rankings: rankings.length ? rankings : dashboardSnapshot.rankings,
        },
        eventDetails,
        eventSeries: [],
        currentSeason,
        loadedAt,
        databaseOnline: true,
      },
      homeLeaders,
      rankingHub,
    };
  } catch (error) {
    if (process.env.SNOOKER_BUILD_OFFLINE !== "1") console.error("[snooker-home] bootstrap read failed", error);
    return {
      database: {
        snapshot: dashboardSnapshot,
        eventDetails: [dashboardSnapshot.event],
        eventSeries: [],
        currentSeason,
        loadedAt,
        databaseOnline: false,
      },
      homeLeaders: {
        ok: true,
        seasonLabel: currentSeason,
        leaders: leaderDefinitions.map((definition) => ({
          key: definition.key,
          labelZh: definition.labelZh,
          labelEn: definition.labelEn,
          value: null,
          unit: definition.unit,
          available: false,
          player: null,
        })),
      },
      rankingHub: { lists: [], loadedAt, online: false },
    };
  }
}
