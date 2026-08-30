import { NextResponse } from "next/server";
import { getSnookerPlayerDirectory } from "@/lib/snooker/player-data";

export const revalidate = 300;

export async function GET() {
  try {
    const players = await getSnookerPlayerDirectory();
    return NextResponse.json(
      { ok: true, players },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (error) {
    console.error("[player-directory] failed", error);
    return NextResponse.json({ ok: false, players: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
