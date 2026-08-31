export const PUBLIC_ABOUT_STATS_AS_OF = "2026年8月31日";

const RAW_STATS_SNAPSHOT = {
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
  source: "snapshot";
};

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

export function loadPublicAboutStats(): PublicAboutStats {
  return toDisplayStats(RAW_STATS_SNAPSHOT, "snapshot");
}
