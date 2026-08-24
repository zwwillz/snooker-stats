import { NextRequest, NextResponse } from "next/server";
import { eventSummary, getPlayerEventStats, SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { loadSnookerEventDetail } from "@/lib/snooker/database-public";

export async function GET(request: NextRequest) {
  const database = await loadSnookerDatabaseViewV2();
  const snapshot = database.snapshot;
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? snapshot.event.slug;
  const event = database.eventDetails.find((item) => item.slug === slug)
    ?? (snapshot.event.slug === slug ? snapshot.event : null)
    ?? await loadSnookerEventDetail(slug);
  if (!event) return NextResponse.json({ ok: false, error: "EVENT_NOT_FOUND" }, { status: 404 });

  const playerStats = snapshot.players
    .map((player) => getPlayerEventStats(player.id, event))
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    version: SNOOKER_FOUNDATION_VERSION,
    buildMark: SNOOKER_BUILD_MARK,
    repositoryMode: database.databaseOnline ? "supabase" : "verified-snapshot",
    event,
    summary: eventSummary(event),
    playerStats,
  });
}
