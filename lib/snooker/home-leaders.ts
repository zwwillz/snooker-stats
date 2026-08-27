import type { SnookerPlayer } from "./domain";

export type HomeLeaderMetricKey = "maximums" | "centuries" | "win_rate" | "shot_time";
export type HomeLeaderUnit = "count" | "percent" | "seconds";

export type HomeLeaderItem = {
  key: HomeLeaderMetricKey;
  labelZh: string;
  labelEn: string;
  value: number | null;
  unit: HomeLeaderUnit;
  available: boolean;
  player: {
    id: string;
    slug: string;
    nameZh: string;
    nameEn: string;
    avatarUrl: string | null;
    currentRank: number | null;
  } | null;
};

export type HomeLeadersPayload = {
  ok: true;
  seasonLabel: string;
  leaders: HomeLeaderItem[];
};

type MetricDefinition = {
  key: HomeLeaderMetricKey;
  labelZh: string;
  labelEn: string;
  unit: HomeLeaderUnit;
  direction: "max" | "min";
  value: (player: SnookerPlayer) => number | null;
  eligible?: (player: SnookerPlayer, value: number) => boolean;
};

const definitions: MetricDefinition[] = [
  {
    key: "maximums",
    labelZh: "147",
    labelEn: "MAXIMUMS",
    unit: "count",
    direction: "max",
    value: (player) => player.seasonStatistics?.season147s ?? null,
    eligible: (_player, value) => value > 0,
  },
  {
    key: "centuries",
    labelZh: "破百数",
    labelEn: "CENTURIES",
    unit: "count",
    direction: "max",
    value: (player) => player.seasonStatistics?.breaks100Plus ?? null,
  },
  {
    key: "win_rate",
    labelZh: "胜率",
    labelEn: "WIN RATE",
    unit: "percent",
    direction: "max",
    value: (player) => player.seasonStatistics?.matchWinRate ?? null,
    eligible: (player) => (player.seasonStatistics?.matchesPlayed ?? 0) >= 5,
  },
  {
    key: "shot_time",
    labelZh: "出杆时间",
    labelEn: "SHOT TIME",
    unit: "seconds",
    direction: "min",
    value: (player) => player.seasonStatistics?.averageShotTimeSeconds ?? null,
    eligible: (player, value) => (player.seasonStatistics?.matchesPlayed ?? 0) >= 5 && value > 0,
  },
];

function playerSummary(player: SnookerPlayer) {
  return {
    id: player.id,
    slug: player.slug,
    nameZh: player.nameZh || player.nameEn,
    nameEn: player.nameEn,
    avatarUrl: player.avatarUrl || player.avatar?.url || null,
    currentRank: player.currentRank,
  };
}

function selectLeader(players: SnookerPlayer[], definition: MetricDefinition): HomeLeaderItem {
  const candidates = players.flatMap((player) => {
    const value = definition.value(player);
    if (value === null || !Number.isFinite(value)) return [];
    if (definition.eligible && !definition.eligible(player, value)) return [];
    return [{ player, value }];
  });

  candidates.sort((a, b) => {
    const metric = definition.direction === "min" ? a.value - b.value : b.value - a.value;
    if (metric) return metric;
    const aRank = a.player.currentRank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.player.currentRank ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.player.nameEn.localeCompare(b.player.nameEn, "en");
  });

  const top = candidates[0];
  return {
    key: definition.key,
    labelZh: definition.labelZh,
    labelEn: definition.labelEn,
    value: top?.value ?? null,
    unit: definition.unit,
    available: Boolean(top),
    player: top ? playerSummary(top.player) : null,
  };
}

export function buildHomeLeaders(players: SnookerPlayer[], seasonLabel: string): HomeLeadersPayload {
  return {
    ok: true,
    seasonLabel,
    leaders: definitions.map((definition) => selectLeader(players, definition)),
  };
}
