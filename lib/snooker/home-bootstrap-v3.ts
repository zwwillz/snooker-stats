import { currentSnookerSeason } from "./database-public";
import { loadSnookerHomeBootstrap, type SnookerHomeBootstrap } from "./home-bootstrap";
import type {
  PlayerCompareH2H,
  PlayerComparePlayer,
  PlayerCompareSeason,
  PlayerCompareSnapshot,
} from "./player-compare";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

type DbRankingKey = { player_id: string; rank: number };
type DbComparePlayer = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  short_name_zh: string | null;
  nationality_zh: string | null;
  country_code: string | null;
  turned_pro: number | null;
  current_rank: number | null;
  avatar_url: string | null;
  is_current_tour: boolean | null;
};
type DbCompareSeason = {
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

export type SnookerHomeBootstrapV3 = SnookerHomeBootstrap & {
  homePlayerCompare: PlayerCompareSnapshot | null;
};

async function rest<T>(path: string, revalidate: number = SNOOKER_CACHE_SECONDS.recent): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) throw new Error(`SNOOKER_HOME_COMPARE_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function inFilter(values: string[]) {
  return encodeURIComponent(`(${values.join(",")})`);
}

function finite(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function comparePlayer(row: DbComparePlayer): PlayerComparePlayer {
  return {
    id: `db-player-${row.id}`,
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh || row.name_en,
    shortNameZh: row.short_name_zh || row.name_zh || row.name_en,
    nationalityZh: row.nationality_zh || "",
    countryCode: row.country_code || "",
    turnedPro: row.turned_pro,
    currentRank: row.current_rank,
    avatarUrl: row.avatar_url,
    isCurrentTour: row.is_current_tour ?? row.current_rank !== null,
  };
}

function compareSeason(row: DbCompareSeason | undefined, season: string): PlayerCompareSeason | null {
  if (!row) return null;
  const framesWon = row.frames_won;
  const framesLost = row.frames_lost;
  const frames = framesWon !== null && framesLost !== null ? framesWon + framesLost : null;
  const breaks50 = row.breaks_50_plus;
  const centuries = row.breaks_100_plus;
  return {
    season: row.season || season,
    seasonStartYear: row.season_start_year,
    eventsPlayed: row.event_entities_played,
    matchesPlayed: row.matches_played,
    matchesWon: row.matches_won,
    matchesLost: row.matches_lost,
    matchesDrawn: row.matches_drawn,
    matchWinRate: finite(row.match_win_rate),
    walkoversWon: row.walkovers_won,
    walkoversLost: row.walkovers_lost,
    framesWon,
    framesLost,
    frameWinRate: finite(row.frame_win_rate),
    frameCoveragePct: finite(row.frame_data_coverage_pct),
    breaks50Plus: breaks50,
    breaks100Plus: centuries,
    maximums: row.maximums,
    highestBreak: row.highest_break,
    framesPer50: frames !== null && breaks50 && breaks50 > 0 ? frames / breaks50 : null,
    framesPerCentury: frames !== null && centuries && centuries > 0 ? frames / centuries : null,
    finals: row.finals,
    titlesTotal: row.titles_total,
    rankingFinals: row.ranking_finals,
    rankingTitles: row.ranking_titles,
    tripleCrownTitles: row.triple_crown_titles,
    worldChampionshipTitles: row.world_championship_titles,
    ukChampionshipTitles: row.uk_championship_titles,
    mastersTitles: row.masters_titles,
    ranking: null,
    pointsScored: null,
    averageShotTime: null,
    averageBreak: null,
    dataThrough: row.data_through,
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

async function loadHomePlayerCompare(): Promise<PlayerCompareSnapshot | null> {
  const season = currentSnookerSeason();
  const seasonStartYear = Number(season.slice(0, 4));
  try {
    const rankingRows = await rest<DbRankingKey[]>(
      "snooker_latest_rankings?select=player_id,rank&list_key=eq.world_official&order=rank.asc&limit=2",
    );
    if (rankingRows.length < 2) return null;

    const orderedIds = rankingRows.sort((a, b) => a.rank - b.rank).map((row) => row.player_id).slice(0, 2);
    const [leftUuid, rightUuid] = orderedIds;
    const [lowUuid, highUuid] = [...orderedIds].sort();
    const [playerRows, seasonRows, h2hRows] = await Promise.all([
      rest<DbComparePlayer[]>(
        `snooker_public_players?select=id,slug,name_en,name_zh,short_name_zh,nationality_zh,country_code,turned_pro,current_rank,avatar_url,is_current_tour&id=in.${inFilter(orderedIds)}`,
        SNOOKER_CACHE_SECONDS.player,
      ),
      rest<DbCompareSeason[]>(
        `snooker_player_season_aggregates?select=player_id,season,season_start_year,event_entities_played,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_coverage_pct,breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,world_championship_titles,uk_championship_titles,masters_titles,data_through,calculated_at&season_start_year=eq.${seasonStartYear}&player_id=in.${inFilter(orderedIds)}`,
      ),
      rest<DbH2H[]>(
        `snooker_player_h2h_aggregates?select=player_low_id,player_high_id,match_records,meetings_played,player_low_wins,player_high_wins,draws,player_low_walkovers,player_high_walkovers,player_low_frames,player_high_frames,first_meeting_date,last_meeting_date,calculated_at&player_low_id=eq.${lowUuid}&player_high_id=eq.${highUuid}&limit=1`,
      ).catch(() => []),
    ]);

    const playerByUuid = new Map(playerRows.map((row) => [row.id, row]));
    const leftPlayer = playerByUuid.get(leftUuid);
    const rightPlayer = playerByUuid.get(rightUuid);
    if (!leftPlayer || !rightPlayer) return null;

    const leftSeason = compareSeason(seasonRows.find((row) => row.player_id === leftUuid), season);
    const rightSeason = compareSeason(seasonRows.find((row) => row.player_id === rightUuid), season);
    const aggregate = h2hRows[0];
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

    const updatedAt = [leftSeason?.calculatedAt, rightSeason?.calculatedAt, h2h.calculatedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? new Date().toISOString();

    return {
      players: [comparePlayer(leftPlayer), comparePlayer(rightPlayer)],
      season,
      availableSeasons: [season],
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
  } catch (error) {
    if (process.env.SNOOKER_BUILD_OFFLINE !== "1") console.error("[snooker-home] compare teaser read failed", error);
    return null;
  }
}

export async function loadSnookerHomeBootstrapV3(): Promise<SnookerHomeBootstrapV3> {
  const [base, homePlayerCompare] = await Promise.all([
    loadSnookerHomeBootstrap(),
    loadHomePlayerCompare(),
  ]);
  return { ...base, homePlayerCompare: base.database.databaseOnline ? homePlayerCompare : null };
}
