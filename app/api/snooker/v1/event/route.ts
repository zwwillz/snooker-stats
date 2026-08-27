import { NextRequest, NextResponse } from "next/server";
import { eventSummary, getPlayerEventStats, SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { loadSnookerEventDetail } from "@/lib/snooker/database-public";
import { loadSnookerEventDetailComplete } from "@/lib/snooker/event-detail-complete";
import { loadSnookerEventDetailFresh } from "@/lib/snooker/event-detail-fresh";
import { refreshSingleEventLive } from "@/lib/snooker/live-read-through";
import type { SnookerEvent } from "@/lib/snooker/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mergeFreshSchedule(fresh: SnookerEvent, enriched: SnookerEvent | null): SnookerEvent {
  if (!enriched) return fresh;
  const enrichedMatches = new Map(
    enriched.rounds.flatMap((round) => round.matches).map((match) => [match.id, match] as const),
  );
  return {
    ...enriched,
    ...fresh,
    ...(enriched.prizes?.length ? { prizes: enriched.prizes } : {}),
    ...(enriched.previousChampionZh ? { previousChampionZh: enriched.previousChampionZh } : {}),
    ...(enriched.previousChampionYear ? { previousChampionYear: enriched.previousChampionYear } : {}),
    rounds: fresh.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const enrichedMatch = enrichedMatches.get(match.id);
        if (!enrichedMatch) return match;
        return {
          ...enrichedMatch,
          ...match,
          ...(enrichedMatch.statistics ? { statistics: enrichedMatch.statistics } : {}),
          ...(enrichedMatch.headToHead ? { headToHead: enrichedMatch.headToHead } : {}),
        };
      }),
    })),
  };
}

export async function GET(request: NextRequest) {
  const database = await loadSnookerDatabaseViewV2();
  const snapshot = database.snapshot;
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? snapshot.event.slug;
  const cachedEvent = database.eventDetails.find((item) => item.slug === slug)
    ?? (snapshot.event.slug === slug ? snapshot.event : null);

  const [freshResult, detailedResult] = await Promise.allSettled([
    loadSnookerEventDetailFresh(slug),
    loadSnookerEventDetailComplete(slug),
  ]);
  const freshEvent = freshResult.status === "fulfilled" ? freshResult.value : null;
  const detailedEvent = detailedResult.status === "fulfilled" ? detailedResult.value : null;
  if (freshResult.status === "rejected") console.error("[snooker-event] fresh event detail failed", freshResult.reason);
  if (detailedResult.status === "rejected") console.error("[snooker-event] enriched event detail failed", detailedResult.reason);

  const baseEvent = freshEvent
    ? mergeFreshSchedule(freshEvent, detailedEvent)
    : detailedEvent
      ?? cachedEvent
      ?? await loadSnookerEventDetail(slug);
  if (!baseEvent) return NextResponse.json({ ok: false, error: "EVENT_NOT_FOUND" }, { status: 404 });

  const event = await refreshSingleEventLive(baseEvent);
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
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
