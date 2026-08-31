import { NextResponse } from "next/server";
import { loadSnookerRankingHub, reconcileRankingHubPlayerSlugs } from "@/lib/snooker/ranking-hub";
import { getSnookerPlayersByIds } from "@/lib/snooker/player-data";

export const revalidate = 300;

export async function GET() {
  try {
    const loadedHub = await loadSnookerRankingHub({ includePlayerSlugs: false });
    const playerIds = loadedHub.lists.flatMap((list) => list.rows.map((row) => row.playerUuid));
    const players = await getSnookerPlayersByIds(playerIds);
    const hub = reconcileRankingHubPlayerSlugs(loadedHub, players);
    return NextResponse.json(
      { ok: hub.online, hub, players },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (error) {
    console.error("[ranking-hub] failed", error);
    return NextResponse.json({ ok: false, hub: null, players: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
