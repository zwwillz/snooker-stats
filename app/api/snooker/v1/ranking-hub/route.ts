import { NextResponse } from "next/server";
import { loadSnookerRankingHub, reconcileRankingHubPlayerSlugs } from "@/lib/snooker/ranking-hub";
import { getSnookerPlayerDirectory } from "@/lib/snooker/player-data";

export const revalidate = 300;

export async function GET() {
  try {
    const [loadedHub, players] = await Promise.all([
      loadSnookerRankingHub(),
      getSnookerPlayerDirectory(),
    ]);
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
