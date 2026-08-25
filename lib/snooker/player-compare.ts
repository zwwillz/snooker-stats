import { getSnookerPlayerDirectory, type SnookerPlayerListItem } from "./player-data";
import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

export type PlayerCompareMetricTrend = "higher" | "lower" | "neutral";
export type PlayerCompareMetricKind = "performance" | "style" | "honour" | "coverage";

export type PlayerCompareMetricDefinition = {
  key: string;
  label: string;
  group: "matches" | "scoring" | "tempo" | "results" | "career" | "honours";
  trend: PlayerCompareMetricTrend;
  kind: PlayerCompareMetricKind;
  unit?: string;
};

export const PLAYER_COMPARE_METRICS: PlayerCompareMetricDefinition[] = [
  { key: "currentRank", label: "世界排名", group: "matches", trend: "lower", kind: "performance" },
  { key: "eventsPlayed", label: "参赛赛事", group: "matches", trend: "higher", kind: "performance" },
  { key: "matchesPlayed", label: "比赛场次", group: "matches", trend: "neutral", kind: "coverage" },
  { key: "matchesWon", label: "获胜场次", group: "matches", trend: "higher", kind: "performance" },
  { key: "matchWinRate", label: "比赛胜率", group: "matches", trend: "higher", kind: "performance", unit: "%" },
  { key: "frameWinRate", label: "局胜率", group: "matches", trend: "higher", kind: "performance", unit: "%" },
  { key: "pointsScored", label: "赛季总得分", group: "scoring", trend: "higher", kind: "performance" },
  { key: "breaks50Plus", label: "50+", group: "scoring", trend: "higher", kind: "performance" },
  { key: "breaks100Plus", label: "破百", group: "scoring", trend: "higher", kind: "performance" },
  { key: "framesPerCentury", label: "破百效率", group: "scoring", trend: "lower", kind: "performance", unit: "局/次" },
  { key: "highestBreak", label: "单杆最高", group: "scoring", trend: "higher", kind: "performance" },
  { key: "maximums", label: "147", group: "scoring", trend: "higher", kind: "performance" },
  { key: "averageShotTime", label: "平均出杆", group: "tempo", trend: "neutral", kind: "style", unit: "秒" },
  { key: "titlesTotal", label: "赛事冠军", group: "results", trend: "higher", kind: "honour" },
  { key: "finals", label: "决赛", group: "results", trend: "higher", kind: "honour" },
];

export type PlayerComparePlayer = Pick<
  SnookerPlayerListItem,
  "id" | "slug" | "nameEn" | "nameZh" | "shortNameZh" | "nationalityZh" | "countryCode" | "turnedPro" | "currentRank" | "avatarUrl" | "isCurrentTour"
>;

export type PlayerCompareSeason = {
  season: string;
  seasonStartYear: number;
  eventsPlayed: number | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  matchesDrawn: number | null;
  matchWinRate: number | null;
  walkoversWon: number | null;
  walkoversLost: number | null;
  framesWon: number | null;
  framesLost: number | null;
  frameWinRate: number | null;
  frameCoveragePct: number | null;
  breaks50Plus: number | null;
  breaks100Plus: number | null;
  maximums: number | null;
  highestBreak: number | null;
  framesPer50: number | null;
  framesPerCentury: number | null;
  finals: number | null;
  titlesTotal: number | null;
  rankingFinals: number | null;
  rankingTitles: number | null;
  tripleCrownTitles: number | null;
  worldChampionshipTitles: number | null;
  ukChampionshipTitles: number | null;
  mastersTitles: number | null;
  ranking: number | null;
  pointsScored: number | null;
  averageShotTime: number | null;
  averageBreak: number | null;
  dataThrough: string | null;
  calculatedAt: string | null;
};

export type PlayerCompareCareer = {
  seasonsPlayed: number | null;
  firstSeason: string | null;
  lastSeason: string | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  matchesDrawn: number | null;
  matchWinRate: number | null;
  walkoversWon: number | null;
  walkoversLost: number | null;
  framesWon: number | null;
  framesLost: number | null;
  frameWinRate: number | null;
  frameCoveragePct: number | null;
  breaks50Plus: number | null;
  breaks100Plus: number | null;
  maximums: number | null;
  highestBreak: number | null;
  finals: number | null;
  titlesTotal: number | null;
  rankingFinals: number | null;
  rankingTitles: number | null;
  tripleCrownTitles: number | null;
  worldChampionshipTitles: number | null;
  ukChampionshipTitles: number | null;
  mastersTitles: number | null;
  highestRanking: number | null;
  dataThrough: string | null;
  calculatedAt: string | null;
  isCareerComplete: boolean | null;
  warehouseStartSeason: string | null;
  warehouseEndSeason: string | null;
};

export type PlayerCompareMeeting = {
  id: string;
  eventSlug: string | null;
  eventNameZh: string;
  eventNameEn: string;
  season: string | null;
  roundLabelZh: string;
  roundLabelEn: string;
  scheduledAt: string | null;
  status: string;
  score1: number | null;
  score2: number | null;
  leftScore: number | null;
  rightScore: number | null;
  winnerSide: "left" | "right" | null;
  isWalkover: boolean;
  note: string | null;
};

export type PlayerCompareH2H = {
  matchRecords: number;
  meetingsPlayed: number;
  leftWins: number;
  rightWins: number;
  draws: number;
  leftWalkovers: number;
  rightWalkovers: number;
  leftFrames: number;
  rightFrames: number;
  firstMeetingDate: string | null;
  lastMeetingDate: string | null;
  recentMeetings: PlayerCompareMeeting[];
  calculatedAt: string | null;
};

export type PlayerCompareSnapshot = {
  players: [PlayerComparePlayer, PlayerComparePlayer];
  season: string;
  availableSeasons: string[];
  seasonStats: [PlayerCompareSeason | null, PlayerCompareSeason | null];
  careerStats: [PlayerCompareCareer | null, PlayerCompareCareer | null];
  h2h: PlayerCompareH2H;
  updatedAt: string;
  coverage: {
    leftFramePct: number | null;
    rightFramePct: number | null;
    leftCareerComplete: boolean | null;
    rightCareerComplete: boolean | null;
  };
};

type SeasonAggregateRow = {
  player_id: string;
  season: string;
  season_start_year: number;
  event_entities_played: number | null;
  matches_played: number | null;
  matches_won: number | null;
  matches_lost: number | null;
  matches_drawn: number | null;
  match_win_rate: number | string | null;
  walkovers_won: number | null;
  walkovers_lost: number | null;
  frames_won: number | null;
  frames_lost: number | null;
  frame_win_rate: number | string | null;
  frame_data_coverage_pct: number | string | null;
  breaks_50_plus: number | null;
  breaks_100_plus: number | null;
  maximums: number | null;
  highest_break: number | null;
  finals: number | null;
  titles_total: number | null;
  ranking_finals: number | null;
  ranking_titles: number | null;
  triple_crown_titles: number | null;
  world_championship_titles: number | null;
  uk_championship_titles: number | null;
  masters_titles: number | null;
  data_through: string | null;
  calculated_at: string | null;
};

type WstSeasonRow = {
  player_id: string;
  season_start_year: number;
  season_label: string;
  ranking: number | null;
  points_scored: number | null;
  average_shot_time: number | string | null;
  average_break: number | string | null;
  source_updated_at: string | null;
};

type CareerAggregateRow = {
  player_id: string;
  seasons_played: number | null;
  first_season: string | null;
  last_season: string | null;
  matches_played: number | null;
  matches_won: number | null;
  matches_lost: number | null;
  matches_drawn: number | null;
  match_win_rate: number | string | null;
  walkovers_won: number | null;
  walkovers_lost: number | null;
  frames_won: number | null;
  frames_lost: number | null;
  frame_win_rate: number | string | null;
  frame_data_coverage_pct: number | string | null;
  breaks_50_plus: number | null;
  breaks_100_plus: number | null;
  maximums: number | null;
  highest_break: number | null;
  finals: number | null;
  titles_total: number | null;
  ranking_finals: number | null;
  ranking_titles: number | null;
  triple_crown_titles: number | null;
  world_championship_titles: number | null;
  uk_championship_titles: number | null;
  masters_titles: number | null;
  data_through: string | null;
  calculated_at: string | null;
  warehouse_start_season: string | null;
  warehouse_end_season: string | null;
  is_career_complete: boolean | null;
};

type WstCareerRow = {
  player_id: string;
  highest_ranking: number | null;
  source_updated_at: string | null;
};

type H2HRow = {
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

type MatchRow = {
  id: string;
  event_id: string;
  round_id: string | null;
  player1_id: string;
  player2_id: string;
  score1: number | null;
  score2: number | null;
  status: string;
  scheduled_at: string | null;
  winner_id: string | null;
  note: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  season: string;
  name_en: string;
  name_zh: string;
};

type RoundRow = {
  id: string;
  label_en: string | null;
  label_zh: string | null;
  round_key: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxTimestamp(values: Array<string | null | undefined>) {
  const valid = values
    .map((value) => value ? Date.parse(value) : NaN)
    .filter((value) => Number.isFinite(value));
  return valid.length ? new Date(Math.max(...valid)).toISOString() : new Date().toISOString();
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

async function rest<T>(resource: string, params: URLSearchParams, revalidate = 60): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${resource}?${params.toString()}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SNOOKER_COMPARE_DB_HTTP_${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

function mapPlayer(player: SnookerPlayerListItem): PlayerComparePlayer {
  return {
    id: player.id,
    slug: player.slug,
    nameEn: player.nameEn,
    nameZh: player.nameZh,
    shortNameZh: player.shortNameZh,
    nationalityZh: player.nationalityZh,
    countryCode: player.countryCode,
    turnedPro: player.turnedPro,
    currentRank: player.currentRank,
    avatarUrl: player.avatarUrl,
    isCurrentTour: player.isCurrentTour,
  };
}

function seasonStart(season: string) {
  const parsed = Number(season.slice(0, 4));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSeason(row: SeasonAggregateRow | undefined, wst: WstSeasonRow | undefined): PlayerCompareSeason | null {
  if (!row && !wst) return null;
  const framesWon = row?.frames_won ?? null;
  const framesLost = row?.frames_lost ?? null;
  const totalFrames = framesWon !== null && framesLost !== null ? framesWon + framesLost : null;
  const breaks50 = row?.breaks_50_plus ?? null;
  const centuries = row?.breaks_100_plus ?? null;
  return {
    season: row?.season ?? wst?.season_label ?? "",
    seasonStartYear: row?.season_start_year ?? wst?.season_start_year ?? 0,
    eventsPlayed: row?.event_entities_played ?? null,
    matchesPlayed: row?.matches_played ?? null,
    matchesWon: row?.matches_won ?? null,
    matchesLost: row?.matches_lost ?? null,
    matchesDrawn: row?.matches_drawn ?? null,
    matchWinRate: toNumber(row?.match_win_rate),
    walkoversWon: row?.walkovers_won ?? null,
    walkoversLost: row?.walkovers_lost ?? null,
    framesWon,
    framesLost,
    frameWinRate: toNumber(row?.frame_win_rate),
    frameCoveragePct: toNumber(row?.frame_data_coverage_pct),
    breaks50Plus: breaks50,
    breaks100Plus: centuries,
    maximums: row?.maximums ?? null,
    highestBreak: row?.highest_break ?? null,
    framesPer50: totalFrames !== null && breaks50 && breaks50 > 0 ? totalFrames / breaks50 : null,
    framesPerCentury: totalFrames !== null && centuries && centuries > 0 ? totalFrames / centuries : null,
    finals: row?.finals ?? null,
    titlesTotal: row?.titles_total ?? null,
    rankingFinals: row?.ranking_finals ?? null,
    rankingTitles: row?.ranking_titles ?? null,
    tripleCrownTitles: row?.triple_crown_titles ?? null,
    worldChampionshipTitles: row?.world_championship_titles ?? null,
    ukChampionshipTitles: row?.uk_championship_titles ?? null,
    mastersTitles: row?.masters_titles ?? null,
    ranking: wst?.ranking ?? null,
    pointsScored: wst?.points_scored ?? null,
    averageShotTime: toNumber(wst?.average_shot_time),
    averageBreak: toNumber(wst?.average_break),
    dataThrough: row?.data_through ?? null,
    calculatedAt: maxTimestamp([row?.calculated_at, wst?.source_updated_at]),
  };
}

function mapCareer(row: CareerAggregateRow | undefined, wst: WstCareerRow | undefined): PlayerCompareCareer | null {
  if (!row && !wst) return null;
  return {
    seasonsPlayed: row?.seasons_played ?? null,
    firstSeason: row?.first_season ?? null,
    lastSeason: row?.last_season ?? null,
    matchesPlayed: row?.matches_played ?? null,
    matchesWon: row?.matches_won ?? null,
    matchesLost: row?.matches_lost ?? null,
    matchesDrawn: row?.matches_drawn ?? null,
    matchWinRate: toNumber(row?.match_win_rate),
    walkoversWon: row?.walkovers_won ?? null,
    walkoversLost: row?.walkovers_lost ?? null,
    framesWon: row?.frames_won ?? null,
    framesLost: row?.frames_lost ?? null,
    frameWinRate: toNumber(row?.frame_win_rate),
    frameCoveragePct: toNumber(row?.frame_data_coverage_pct),
    breaks50Plus: row?.breaks_50_plus ?? null,
    breaks100Plus: row?.breaks_100_plus ?? null,
    maximums: row?.maximums ?? null,
    highestBreak: row?.highest_break ?? null,
    finals: row?.finals ?? null,
    titlesTotal: row?.titles_total ?? null,
    rankingFinals: row?.ranking_finals ?? null,
    rankingTitles: row?.ranking_titles ?? null,
    tripleCrownTitles: row?.triple_crown_titles ?? null,
    worldChampionshipTitles: row?.world_championship_titles ?? null,
    ukChampionshipTitles: row?.uk_championship_titles ?? null,
    mastersTitles: row?.masters_titles ?? null,
    highestRanking: wst?.highest_ranking ?? null,
    dataThrough: row?.data_through ?? null,
    calculatedAt: maxTimestamp([row?.calculated_at, wst?.source_updated_at]),
    isCareerComplete: row?.is_career_complete ?? null,
    warehouseStartSeason: row?.warehouse_start_season ?? null,
    warehouseEndSeason: row?.warehouse_end_season ?? null,
  };
}

async function loadMeetingHistory(leftId: string, rightId: string): Promise<PlayerCompareMeeting[]> {
  const params = new URLSearchParams({
    select: "id,event_id,round_id,player1_id,player2_id,score1,score2,status,scheduled_at,winner_id,note",
    or: `(and(player1_id.eq.${leftId},player2_id.eq.${rightId}),and(player1_id.eq.${rightId},player2_id.eq.${leftId}))`,
    status: "in.(completed,walkover)",
    order: "scheduled_at.desc.nullslast",
    limit: "24",
  });
  const matches = await rest<MatchRow[]>("snooker_matches", params, 300);
  if (!matches.length) return [];

  const eventIds = [...new Set(matches.map((match) => match.event_id))];
  const roundIds = [...new Set(matches.map((match) => match.round_id).filter((id): id is string => Boolean(id)))];
  const [events, rounds] = await Promise.all([
    rest<EventRow[]>("snooker_events", new URLSearchParams({ select: "id,slug,season,name_en,name_zh", id: inFilter(eventIds) }), 1800),
    roundIds.length
      ? rest<RoundRow[]>("snooker_rounds", new URLSearchParams({ select: "id,label_en,label_zh,round_key", id: inFilter(roundIds) }), 1800)
      : Promise.resolve([]),
  ]);
  const eventById = new Map(events.map((event) => [event.id, event]));
  const roundById = new Map(rounds.map((round) => [round.id, round]));

  return matches.map((match) => {
    const event = eventById.get(match.event_id);
    const round = match.round_id ? roundById.get(match.round_id) : undefined;
    const leftIsP1 = match.player1_id === leftId;
    const winnerSide = match.winner_id === leftId ? "left" as const : match.winner_id === rightId ? "right" as const : null;
    return {
      id: match.id,
      eventSlug: event?.slug ?? null,
      eventNameZh: event?.name_zh ?? event?.name_en ?? "赛事",
      eventNameEn: event?.name_en ?? event?.name_zh ?? "Event",
      season: event?.season ?? null,
      roundLabelZh: round?.label_zh ?? round?.label_en ?? round?.round_key ?? "比赛",
      roundLabelEn: round?.label_en ?? round?.round_key ?? "Match",
      scheduledAt: match.scheduled_at,
      status: match.status,
      score1: match.score1,
      score2: match.score2,
      leftScore: leftIsP1 ? match.score1 : match.score2,
      rightScore: leftIsP1 ? match.score2 : match.score1,
      winnerSide,
      isWalkover: match.status === "walkover",
      note: match.note,
    };
  });
}

function emptyH2H(recentMeetings: PlayerCompareMeeting[]): PlayerCompareH2H {
  return {
    matchRecords: recentMeetings.length,
    meetingsPlayed: recentMeetings.filter((meeting) => !meeting.isWalkover).length,
    leftWins: recentMeetings.filter((meeting) => meeting.winnerSide === "left").length,
    rightWins: recentMeetings.filter((meeting) => meeting.winnerSide === "right").length,
    draws: recentMeetings.filter((meeting) => meeting.winnerSide === null && !meeting.isWalkover).length,
    leftWalkovers: recentMeetings.filter((meeting) => meeting.isWalkover && meeting.winnerSide === "left").length,
    rightWalkovers: recentMeetings.filter((meeting) => meeting.isWalkover && meeting.winnerSide === "right").length,
    leftFrames: 0,
    rightFrames: 0,
    firstMeetingDate: recentMeetings.at(-1)?.scheduledAt?.slice(0, 10) ?? null,
    lastMeetingDate: recentMeetings[0]?.scheduledAt?.slice(0, 10) ?? null,
    recentMeetings,
    calculatedAt: null,
  };
}

export async function loadPlayerCompare(player1Slug: string, player2Slug: string, requestedSeason?: string | null): Promise<PlayerCompareSnapshot | null> {
  if (!player1Slug || !player2Slug || player1Slug === player2Slug) return null;
  const directory = await getSnookerPlayerDirectory();
  const left = directory.find((player) => player.slug === player1Slug);
  const right = directory.find((player) => player.slug === player2Slug);
  if (!left || !right || !left.isCurrentTour || !right.isCurrentTour) return null;

  const pairFilter = inFilter([left.id, right.id]);
  const [seasonRows, wstSeasonRows, careerRows, wstCareerRows, h2hRows, recentMeetings] = await Promise.all([
    rest<SeasonAggregateRow[]>("snooker_player_season_aggregates", new URLSearchParams({
      select: "player_id,season,season_start_year,event_entities_played,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_coverage_pct,breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,world_championship_titles,uk_championship_titles,masters_titles,data_through,calculated_at",
      player_id: pairFilter,
      order: "season_start_year.desc",
    }), 60),
    rest<WstSeasonRow[]>("snooker_player_season_stats", new URLSearchParams({
      select: "player_id,season_start_year,season_label,ranking,points_scored,average_shot_time,average_break,source_updated_at",
      player_id: pairFilter,
      order: "season_start_year.desc",
    }), 300),
    rest<CareerAggregateRow[]>("snooker_player_career_aggregates", new URLSearchParams({
      select: "player_id,seasons_played,first_season,last_season,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_coverage_pct,breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,world_championship_titles,uk_championship_titles,masters_titles,data_through,calculated_at,warehouse_start_season,warehouse_end_season,is_career_complete",
      player_id: pairFilter,
    }), 300),
    rest<WstCareerRow[]>("snooker_player_career_stats", new URLSearchParams({
      select: "player_id,highest_ranking,source_updated_at",
      player_id: pairFilter,
    }), 900),
    rest<H2HRow[]>("snooker_player_h2h_aggregates", new URLSearchParams({
      select: "player_low_id,player_high_id,match_records,meetings_played,player_low_wins,player_high_wins,draws,player_low_walkovers,player_high_walkovers,player_low_frames,player_high_frames,first_meeting_date,last_meeting_date,calculated_at",
      or: `(and(player_low_id.eq.${left.id},player_high_id.eq.${right.id}),and(player_low_id.eq.${right.id},player_high_id.eq.${left.id}))`,
      limit: "1",
    }), 300),
    loadMeetingHistory(left.id, right.id),
  ]);

  const availableSeasons = [...new Set(seasonRows.map((row) => row.season).filter(Boolean))]
    .sort((a, b) => seasonStart(b) - seasonStart(a));
  const season = requestedSeason && availableSeasons.includes(requestedSeason) ? requestedSeason : availableSeasons[0] ?? "2026/27";

  const seasonRowFor = (playerId: string) => seasonRows.find((row) => row.player_id === playerId && row.season === season);
  const wstSeasonFor = (playerId: string) => wstSeasonRows.find((row) => row.player_id === playerId && row.season_label === season);
  const leftSeason = mapSeason(seasonRowFor(left.id), wstSeasonFor(left.id));
  const rightSeason = mapSeason(seasonRowFor(right.id), wstSeasonFor(right.id));
  const leftCareer = mapCareer(careerRows.find((row) => row.player_id === left.id), wstCareerRows.find((row) => row.player_id === left.id));
  const rightCareer = mapCareer(careerRows.find((row) => row.player_id === right.id), wstCareerRows.find((row) => row.player_id === right.id));

  const h2hRow = h2hRows[0];
  let h2h = emptyH2H(recentMeetings);
  if (h2hRow) {
    const leftIsLow = h2hRow.player_low_id === left.id;
    h2h = {
      matchRecords: h2hRow.match_records,
      meetingsPlayed: h2hRow.meetings_played,
      leftWins: leftIsLow ? h2hRow.player_low_wins : h2hRow.player_high_wins,
      rightWins: leftIsLow ? h2hRow.player_high_wins : h2hRow.player_low_wins,
      draws: h2hRow.draws,
      leftWalkovers: leftIsLow ? h2hRow.player_low_walkovers : h2hRow.player_high_walkovers,
      rightWalkovers: leftIsLow ? h2hRow.player_high_walkovers : h2hRow.player_low_walkovers,
      leftFrames: leftIsLow ? h2hRow.player_low_frames : h2hRow.player_high_frames,
      rightFrames: leftIsLow ? h2hRow.player_high_frames : h2hRow.player_low_frames,
      firstMeetingDate: h2hRow.first_meeting_date,
      lastMeetingDate: h2hRow.last_meeting_date,
      recentMeetings,
      calculatedAt: h2hRow.calculated_at,
    };
  }

  const updatedAt = maxTimestamp([
    leftSeason?.calculatedAt,
    rightSeason?.calculatedAt,
    leftCareer?.calculatedAt,
    rightCareer?.calculatedAt,
    h2h.calculatedAt,
  ]);

  return {
    players: [mapPlayer(left), mapPlayer(right)],
    season,
    availableSeasons,
    seasonStats: [leftSeason, rightSeason],
    careerStats: [leftCareer, rightCareer],
    h2h,
    updatedAt,
    coverage: {
      leftFramePct: leftSeason?.frameCoveragePct ?? null,
      rightFramePct: rightSeason?.frameCoveragePct ?? null,
      leftCareerComplete: leftCareer?.isCareerComplete ?? null,
      rightCareerComplete: rightCareer?.isCareerComplete ?? null,
    },
  };
}
