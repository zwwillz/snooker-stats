import { NextRequest, NextResponse } from "next/server";
import { eventSummary, getPlayerEventStats, SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { loadSnookerEventDetail } from "@/lib/snooker/database-public";
import { loadSnookerEventDetailComplete } from "@/lib/snooker/event-detail-complete";
import { refreshSingleEventLive } from "@/lib/snooker/live-read-through";
import type { SnookerEvent } from "@/lib/snooker/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestedSlug = request.nextUrl.searchParams.get("slug")?.trim() || null;
  let slug = requestedSlug;
  let cachedEvent: SnookerEvent | null = null;
  let repositoryMode = "supabase";

  // Normal event-detail requests always provide a slug. Only retain the full
  // dashboard lookup for the legacy no-slug call so opening one event no longer
  // preloads the entire current-season dashboard first.
  if (!slug) {
    const database = await loadSnookerDatabaseViewV2();
    slug = database.snapshot.event.slug;
    cachedEvent = database.eventDetails.find((item) => item.slug === slug)
      ?? (database.snapshot.event.slug === slug ? database.snapshot.event : null);
    repositoryMode = database.databaseOnline ? "supabase" : "verified-snapshot";
  }

  let detailedEvent: SnookerEvent | null = null;
  try {
    detailedEvent = await loadSnookerEventDetailComplete(slug);
  } catch (error) {
    console.error("[snooker-event] complete fresh event detail failed; falling back to cached/base detail", error);
  }

  let baseEvent = detailedEvent ?? cachedEvent;
  if (!baseEvent) {
    try {
      baseEvent = await loadSnookerEventDetail(slug);
    } catch (error) {
      console.error("[snooker-event] base event detail failed", error);
    }
  }
  if (!baseEvent) return NextResponse.json({ ok: false, error: "EVENT_NOT_FOUND" }, { status: 404 });

  const event = await refreshSingleEventLive(baseEvent);
  const participantIds = [...new Set(event.rounds.flatMap((round) => round.matches.flatMap((match) => [match.player1Id, match.player2Id])))];
  const playerStats = participantIds
    .map((playerId) => getPlayerEventStats(playerId, event))
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    version: SNOOKER_FOUNDATION_VERSION,
    buildMark: SNOOKER_BUILD_MARK,
    repositoryMode,
    event,
    summary: eventSummary(event),
    playerStats,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
