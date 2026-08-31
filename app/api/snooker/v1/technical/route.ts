import { NextResponse } from "next/server";
import { loadSnookerTechnicalHub } from "@/lib/snooker/technical-hub";
import { getSnookerPlayersByIds } from "@/lib/snooker/player-data";

export const revalidate = 300;

export async function GET() {
  const hub = await loadSnookerTechnicalHub();
  const players = await getSnookerPlayersByIds(hub.lists.flatMap((list) => list.rows.map((row) => row.playerId)));
  return NextResponse.json(
    { ok: hub.online, hub, players },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
