import { NextResponse } from "next/server";
import { getSnookerSupabasePublicConfig } from "@/lib/snooker/supabase-config";
import { loadSnookerTechnicalHub, type SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";

export const revalidate = 300;

const baseKeys: SnookerTechnicalMetricKey[] = ["centuries", "win_rate", "matches_won"];
const fallbackKeys: SnookerTechnicalMetricKey[] = ["highest_break", "points_scored", "fifties", "average_break"];

type PlayerRow = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  avatar_url: string | null;
  current_rank: number | null;
};

async function loadLeaderPlayers() {
  const { url, publishableKey } = getSnookerSupabasePublicConfig();
  const params = new URLSearchParams({
    select: "id,slug,name_en,name_zh,avatar_url,current_rank",
    is_current_tour: "eq.true",
  });
  const response = await fetch(`${url}/rest/v1/snooker_players?${params.toString()}`, {
    headers: { apikey: publishableKey, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`SNOOKER_HOME_LEADERS_PLAYERS_HTTP_${response.status}`);
  return response.json() as Promise<PlayerRow[]>;
}

export async function GET() {
  try {
    const [hub, playerRows] = await Promise.all([
      loadSnookerTechnicalHub(),
      loadLeaderPlayers(),
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
    const playerBySlug = new Map(playerRows.map((player) => [player.slug, player]));

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
          nameZh: player.name_zh || player.name_en,
          nameEn: player.name_en,
          avatarUrl: player.avatar_url,
          currentRank: player.current_rank,
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
  } catch (error) {
    console.error("[home-leaders] failed", error);
    return NextResponse.json(
      { ok: false, seasonLabel: null, leaders: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=20, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }
}
