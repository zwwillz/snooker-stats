import { NextResponse } from "next/server";
import { SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";

export async function GET() {
  const database = await loadSnookerDatabaseViewV2();
  const playerById = new Map(database.snapshot.players.map((player) => [player.id, player]));
  return NextResponse.json({
    ok: true,
    version: SNOOKER_FOUNDATION_VERSION,
    buildMark: SNOOKER_BUILD_MARK,
    repositoryMode: database.databaseOnline ? "supabase" : "verified-snapshot",
    rankings: database.snapshot.rankings.map((row) => ({ ...row, player: playerById.get(row.playerId) ?? null })),
  });
}
