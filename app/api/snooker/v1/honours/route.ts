import { NextResponse } from "next/server";
import { loadSnookerHonoursHub } from "@/lib/snooker/honours-hub";
import { getSnookerPlayersByIds } from "@/lib/snooker/player-data";

export const revalidate = 1800;

export async function GET() {
  const hub = await loadSnookerHonoursHub();
  const players = await getSnookerPlayersByIds(hub.lists.flatMap((list) => list.rows.map((row) => row.playerId)));
  return NextResponse.json(
    { ok: hub.online, hub, players },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=1800, stale-while-revalidate=21600",
      },
    },
  );
}
