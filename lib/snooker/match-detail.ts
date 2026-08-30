import type { SnookerFrame, SnookerHeadToHead, SnookerHeadToHeadMeeting, SnookerMatchPlayerStatistics, SnookerMatchStatus } from "./domain";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { loadSnookerPlayersByDbIds } from "./scoped-player-data";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Numeric = number | string | null;

type DbMatch = {
  id: string;
  player1_id: string;
  player2_id: string;
  score1: number | null;
  score2: number | null;
  status: string;
  winner_id: string | null;
  source_updated_at: string | null;
  completed_detected_at: string | null;
  current_player_side: string | null;
  current_break: number | null;
  live_frame_no: number | null;
};

type DbFrame = {
  frame_no: number;
  score1: number;
  score2: number;
  break1: number | null;
  break2: number | null;
  note: string | null;
};

type DbStat = {
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

type DbH2h = {
  meetings_before: number;
  player1_wins: number;
  player2_wins: number;
  player1_frames: number;
  player2_frames: number;
  recent_meetings: SnookerHeadToHeadMeeting[] | null;
  source_updated_at: string | null;
};

async function restNoStore<T>(path: string): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SNOOKER_MATCH_DETAIL_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function finite(value: Numeric | undefined) {
  if (value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function matchStatus(value: string): SnookerMatchStatus {
  if (value === "completed" || value === "walkover" || value === "live" || value === "session-break") return value;
  return "upcoming";
}

function statusLabel(status: SnookerMatchStatus) {
  if (status === "completed") return "已结束";
  if (status === "walkover") return "退赛晋级";
  if (status === "live") return "进行中";
  if (status === "session-break") return "局间休息";
  return "待开始";
}

export type SnookerMatchDetailPatch = {
  id: string;
  score1: number | null;
  score2: number | null;
  status: SnookerMatchStatus;
  statusLabelZh: string;
  winnerId?: string;
  frames?: SnookerFrame[];
  statistics?: SnookerMatchPlayerStatistics[];
  headToHead?: SnookerHeadToHead;
  sourceUpdatedAt?: string;
  completedDetectedAt?: string;
  currentPlayerSide?: "home" | "away";
  currentBreak?: number;
  liveFrameNo?: number;
};

export async function loadSnookerMatchDetail(matchId: string) {
  const uuid = matchId.startsWith("db-") ? matchId.slice(3) : matchId;
  if (!UUID_PATTERN.test(uuid)) return null;

  const [match] = await restNoStore<DbMatch[]>(
    `snooker_matches?select=id,player1_id,player2_id,score1,score2,status,winner_id,source_updated_at,completed_detected_at,current_player_side,current_break,live_frame_no&id=eq.${uuid}&limit=1`,
  );
  if (!match) return null;

  const [frameRows, statRows, h2hRows, scopedPlayers] = await Promise.all([
    restNoStore<DbFrame[]>(`snooker_frames?select=frame_no,score1,score2,break1,break2,note&match_id=eq.${uuid}&order=frame_no.asc`),
    restNoStore<DbStat[]>(`snooker_match_statistics?select=player_id,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,average_break,shots_taken,time_on_table_pct&match_id=eq.${uuid}`),
    restNoStore<DbH2h[]>(`snooker_match_head_to_head?select=meetings_before,player1_wins,player2_wins,player1_frames,player2_frames,recent_meetings,source_updated_at&match_id=eq.${uuid}&limit=1`),
    loadSnookerPlayersByDbIds([match.player1_id, match.player2_id, ...(match.winner_id ? [match.winner_id] : [])]),
  ]);

  const canonical = scopedPlayers.canonicalByDbId;
  const status = matchStatus(match.status);
  const frames: SnookerFrame[] = frameRows.map((row) => ({
    frameNo: row.frame_no,
    score1: row.score1,
    score2: row.score2,
    ...(row.break1 !== null ? { break1: row.break1 } : {}),
    ...(row.break2 !== null ? { break2: row.break2 } : {}),
    ...(row.note ? { note: row.note } : {}),
  }));
  const statistics: SnookerMatchPlayerStatistics[] = statRows.flatMap((row) => {
    const playerId = canonical.get(row.player_id);
    if (!playerId) return [];
    return [{
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
    }];
  });
  const h2h = h2hRows[0];
  const headToHead: SnookerHeadToHead | undefined = h2h ? {
    meetings: h2h.meetings_before,
    player1Wins: h2h.player1_wins,
    player2Wins: h2h.player2_wins,
    player1Frames: h2h.player1_frames,
    player2Frames: h2h.player2_frames,
    recentMeetings: Array.isArray(h2h.recent_meetings) ? h2h.recent_meetings : [],
    ...(h2h.source_updated_at ? { sourceUpdatedAt: h2h.source_updated_at } : {}),
  } : undefined;

  const patch: SnookerMatchDetailPatch = {
    id: `db-${match.id}`,
    score1: match.score1,
    score2: match.score2,
    status,
    statusLabelZh: statusLabel(status),
    ...(frames.length ? { frames } : {}),
    ...(statistics.length ? { statistics } : {}),
    ...(headToHead ? { headToHead } : {}),
    ...(match.winner_id && canonical.get(match.winner_id) ? { winnerId: canonical.get(match.winner_id) } : {}),
    ...(match.source_updated_at ? { sourceUpdatedAt: match.source_updated_at } : {}),
    ...(match.completed_detected_at ? { completedDetectedAt: match.completed_detected_at } : {}),
    ...(match.current_player_side === "home" || match.current_player_side === "away" ? { currentPlayerSide: match.current_player_side } : {}),
    ...(match.current_break !== null ? { currentBreak: match.current_break } : {}),
    ...(match.live_frame_no !== null ? { liveFrameNo: match.live_frame_no } : {}),
  };

  return { match: patch, players: scopedPlayers.players, fetchedAt: new Date().toISOString() };
}
