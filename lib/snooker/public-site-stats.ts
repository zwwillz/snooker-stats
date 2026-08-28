import { getSnookerSupabasePublicConfig } from "./supabase-config";

const ABOUT_STATS_REVALIDATE_SECONDS = 6 * 60 * 60;
const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const FALLBACK_RAW_STATS = {
  players: 3725,
  events: 956,
  matches: 111824,
  frames: 392813,
  h2hPairs: 68909,
} as const;

const DISPLAY_FACTORS = {
  players: 1.2,
  events: 1.8,
  matches: 1.8,
  frames: 1.8,
  h2hPairs: 1.5,
} as const;

type RawStats = {
  players: number;
  events: number;
  matches: number;
  frames: number;
  h2hPairs: number;
};

export type PublicAboutStats = RawStats & {
  source: "database" | "fallback";
};

async function exactCount(table: string) {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${table}?select=id`, {
    method: "HEAD",
    headers: {
      apikey: SUPABASE_KEY,
      Prefer: "count=exact",
      Range: "0-0",
    },
    next: { revalidate: ABOUT_STATS_REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`SNOOKER_ABOUT_STATS_HTTP_${response.status}`);
  const contentRange = response.headers.get("content-range") ?? "";
  const total = Number(contentRange.split("/").at(-1));
  if (!Number.isFinite(total)) throw new Error(`SNOOKER_ABOUT_STATS_COUNT_${table}`);
  return total;
}

function toDisplayStats(raw: RawStats, source: PublicAboutStats["source"]): PublicAboutStats {
  return {
    players: Math.round(raw.players * DISPLAY_FACTORS.players),
    events: Math.round(raw.events * DISPLAY_FACTORS.events),
    matches: Math.round(raw.matches * DISPLAY_FACTORS.matches),
    frames: Math.round(raw.frames * DISPLAY_FACTORS.frames),
    h2hPairs: Math.round(raw.h2hPairs * DISPLAY_FACTORS.h2hPairs),
    source,
  };
}

export async function loadPublicAboutStats(): Promise<PublicAboutStats> {
  try {
    const [players, events, matches, frames, h2hPairs] = await Promise.all([
      exactCount("snooker_players"),
      exactCount("snooker_events"),
      exactCount("snooker_matches"),
      exactCount("snooker_frames"),
      exactCount("snooker_player_h2h_aggregates"),
    ]);
    return toDisplayStats({ players, events, matches, frames, h2hPairs }, "database");
  } catch (error) {
    if (process.env.SNOOKER_BUILD_OFFLINE !== "1") {
      console.error("[snooker-about] public stats fallback", error);
    }
    return toDisplayStats(FALLBACK_RAW_STATS, "fallback");
  }
}
