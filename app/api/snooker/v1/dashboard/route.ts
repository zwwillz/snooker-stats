import { NextRequest, NextResponse } from "next/server";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { eventSummary, SNOOKER_BUILD_MARK, SNOOKER_FOUNDATION_VERSION } from "@/lib/snooker/foundation";
import { getCachedDashboardWithLiveOverlay } from "@/lib/snooker/live-dashboard-cache";
import { SNOOKER_CACHE_SECONDS, SNOOKER_DASHBOARD_CACHE_CONTROL, snookerCacheLabel } from "@/lib/snooker/cache-policy";
import { refreshSnookerDatabaseViewLive } from "@/lib/snooker/live-read-through";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("monitor")) {
    const { snapshot, sourceHealth } = await getCachedDashboardWithLiveOverlay();
    return NextResponse.json({ ok: true, product: "世界斯诺克数据中心", version: SNOOKER_FOUNDATION_VERSION, buildMark: SNOOKER_BUILD_MARK, repositoryMode: "supabase-monitor", dataMode: "upstream-monitor", snapshot, summary: eventSummary(snapshot.event), sourceHealth }, { headers: { "Cache-Control": "no-store" } });
  }

  const cachedDatabase = await loadSnookerDatabaseViewV2();
  const database = await refreshSnookerDatabaseViewLive(cachedDatabase);
  const allMatches = database.eventDetails.flatMap((event) => event.rounds.flatMap((round) => round.matches));
  const liveMatches = allMatches.filter((match) => match.status === "live" || match.status === "session-break");
  const sourceHealth = {
    online: database.databaseOnline,
    accepted: database.databaseOnline,
    eventAccepted: database.databaseOnline,
    liveAccepted: liveMatches.length > 0,
    source: "Snooker DB",
    fetchedAt: database.loadedAt,
    sourceLabel: liveMatches.length ? "Supabase · 实时直读" : snookerCacheLabel(database.databaseOnline),
    cacheSeconds: liveMatches.length ? 0 : SNOOKER_CACHE_SECONDS.recent,
    latencyMs: 0,
    parsedRoundCount: database.snapshot.event.rounds.length,
    parsedMatchCount: allMatches.length,
    overlayCount: allMatches.length,
    changedCount: 0,
    pollingSeconds: liveMatches.length ? 30 : 0,
    liveScore: null,
    appliedFinalScore: "",
    matchId: liveMatches[0]?.id ?? null,
    message: database.databaseOnline ? "用户端从独立斯诺克数据库读取；直播比分通过 no-store 实时直读覆盖缓存快照。" : "独立数据库读取失败，已切回本地已验证快照。",
  };

  const cacheControl = liveMatches.length > 0 ? "no-store, no-cache, must-revalidate, max-age=0" : SNOOKER_DASHBOARD_CACHE_CONTROL;

  return NextResponse.json({
    ok: true,
    product: "世界斯诺克数据中心",
    version: "0.9.1-live-stability",
    buildMark: `${SNOOKER_BUILD_MARK}-DB11`,
    repositoryMode: database.databaseOnline ? "supabase" : "verified-snapshot",
    dataMode: database.databaseOnline ? "snooker-database-live-read-through" : "verified-snapshot-fallback",
    snapshot: database.snapshot,
    databaseEvents: database.eventDetails,
    eventSeries: database.eventSeries,
    currentSeason: database.currentSeason,
    summary: eventSummary(database.snapshot.event),
    sourceHealth,
  }, { headers: { "Cache-Control": cacheControl } });
}
