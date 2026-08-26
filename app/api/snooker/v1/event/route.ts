import { NextRequest, NextResponse } from "next/server";
import { eventSummary, getPlayerEventStats, SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { loadSnookerEventDetail } from "@/lib/snooker/database-public";
import { loadSnookerEventDetailComplete } from "@/lib/snooker/event-detail-complete";
import { refreshSingleEventLive } from "@/lib/snooker/live-read-through";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const database = await loadSnookerDatabaseViewV2();
  const snapshot = database.snapshot;
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? snapshot.event.slug;
  const cachedEvent = database.eventDetails.find((item) => item.slug === slug)
    ?? (snapshot.event.slug === slug ? snapshot.event : null);

  let detailedEvent = null;
  try {
    detailedEvent = await loadSnookerEventDetailComplete(slug);
  } catch (error) {
    console.error("[snooker-event] complete event detail failed; falling back to cached/base detail", error);
  }

  const baseEvent = detailedEvent
    ?? cachedEvent
    ?? await loadSnookerEventDetail(slug);
  if (!baseEvent) return NextResponse.json({ ok: false, error: "EVENT_NOT_FOUND" }, { status: 404 });

  const event = await refreshSingleEventLive(baseEvent);
  const playerStats = snapshot.players
    .map((player) => getPlayerEventStats(player.id, event))
    .filter(Boolean);
  const realtime = event.rounds.some((round) => round.matches.some((match) => match.status === "live" || match.status === "session-break"));

  return NextResponse.json({
    ok: true,
    version: SNOOKER_FOUNDATION_VERSION,
    buildMark: SNOOKER_BUILD_MARK,
    repositoryMode: database.databaseOnline ? "supabase" : "verified-snapshot",
    event,
    summary: eventSummary(event),
    playerStats,
  }, {
    headers: {
      "Cache-Control": realtime ? "no-store, no-cache, must-revalidate, max-age=0" : "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
