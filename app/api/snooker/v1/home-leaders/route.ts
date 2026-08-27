import { NextResponse } from "next/server";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { loadSnookerTechnicalHub, type SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";

export const revalidate = 300;

const baseKeys: SnookerTechnicalMetricKey[] = ["centuries", "win_rate", "matches_won"];
const fallbackKeys: SnookerTechnicalMetricKey[] = ["highest_break", "points_scored", "fifties", "average_break"];

export async function GET() {
  const [hub, database] = await Promise.all([
    loadSnookerTechnicalHub(),
    loadSnookerDatabaseViewV2(),
  ]);

  if (!hub.online) {
    return NextResponse.json(
      { ok: false, seasonLabel: hub.seasonLabel, leaders: [] },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" } },
    );
  }

  const listByKey = new Map(hub.lists.map((list) => [list.key, list]));
  const maximums = listByKey.get("maximums");
  const fourthKey: SnookerTechnicalMetricKey | undefined = maximums?.rows[0]
    ? "maximums"
    : fallbackKeys.find((key) => Boolean(listByKey.get(key)?.rows[0]));
  const keys = fourthKey ? [...baseKeys, fourthKey] : baseKeys;
  const playerBySlug = new Map(database.snapshot.players.map((player) => [player.slug, player]));

  const leaders = keys.flatMap((key) => {
    const list = listByKey.get(key);
    const row = list?.rows[0];
    if (!list || !row) return [];
    const player = playerBySlug.get(row.playerSlug);
    if (!player) return [];
    return [{
      key,
      labelZh: list.shortLabelZh,
      labelEn: list.labelEn,
      value: row.value,
      unit: list.unit,
      player: {
        id: player.id,
        slug: player.slug,
        nameZh: player.nameZh,
        nameEn: player.nameEn,
        avatarUrl: player.avatarUrl || player.avatar?.url || null,
        currentRank: player.currentRank,
      },
    }];
  });

  return NextResponse.json(
    {
      ok: leaders.length === 4,
      seasonLabel: hub.seasonLabel,
      leaders,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
