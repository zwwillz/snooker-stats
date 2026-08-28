import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("live dashboard bypasses stale caches and client merge is monotonic", async () => {
  const [ui, liveClient, liveRead, dashboard] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
    read("lib/snooker/live-read-through.ts"),
    read("app/api/snooker/v1/dashboard/route.ts"),
  ]);
  assert.match(liveRead, /cache: "no-store"/);
  assert.match(dashboard, /refreshSnookerDatabaseViewLive/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /mergeEventSnapshotsMonotonic/);
  assert.match(liveClient, /sourceUpdatedAt/);
  assert.match(liveClient, /scoreTotal\(incoming\) < scoreTotal\(current\)/);
  assert.match(liveClient, /FINAL_STATUSES\.has\(current\.status\)/);
});

test("session breaks remain active and are shown as break state", async () => {
  const [ui, liveClient, liveRead, migration] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
    read("lib/snooker/live-read-through.ts"),
    read("supabase/migrations/20260825191000_harden_live_match_status_transitions.sql"),
  ]);
  assert.match(liveRead, /session-break/);
  assert.match(liveRead, /interval\|session/);
  assert.match(liveClient, /return "局间休息"/);
  assert.match(ui, /matchDisplayStatus\(match\)/);
  assert.match(migration, /new\.status := 'session-break'/);
});

test("homepage headline prioritizes live, imminent starts, recent results, then normal upcoming windows", async () => {
  const [ui, liveClient] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
  ]);
  assert.match(liveClient, /selectHomepageHeadlineMatch/);
  assert.match(liveClient, /IMMINENT_UPCOMING_MS = 30 \* 60 \* 1000/);
  assert.match(liveClient, /COMPLETED_PROTECTION_MS = 45 \* 60 \* 1000/);
  assert.match(liveClient, /UPCOMING_PREHEAT_MS = 3 \* 60 \* 60 \* 1000/);
  assert.match(liveClient, /UPCOMING_FALLBACK_MS = 3 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(liveClient, /resolveCompletedAt/);
  assert.match(liveClient, /roundPriority/);
  assert.match(liveClient, /chinaPriority/);

  const liveIndex = liveClient.indexOf("const live = candidates.filter");
  const imminentIndex = liveClient.indexOf("const imminent = upcomingWithin(IMMINENT_UPCOMING_MS)");
  const completedIndex = liveClient.indexOf("const recentlyCompleted = candidates.filter");
  const preheatIndex = liveClient.indexOf("const preheating = upcomingWithin(UPCOMING_PREHEAT_MS)");
  assert.ok(liveIndex >= 0 && imminentIndex > liveIndex, "imminent upcoming must follow live priority");
  assert.ok(completedIndex > imminentIndex, "30-minute imminent upcoming must override the 45-minute result hold");
  assert.ok(preheatIndex > completedIndex, "normal 3-hour preheat must remain below the recent-result hold");
  assert.match(ui, /selectHomepageHeadlineMatches\(databaseEvents, players\)/);
});

test("tournament catalog follows individual WST events instead of merged series", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /function EventCard/);
  assert.match(ui, /effectiveCalendarEvents\s*\.filter\(\(item\) => item\.season === selectedSeason\)/);
  assert.doesNotMatch(ui, /function SeriesCard/);
  assert.doesNotMatch(ui, /seriesDetail\.stages\.map/);
  assert.doesNotMatch(ui, /seriesSlug/);
  assert.doesNotMatch(ui, /合并去重/);
});

test("recent tournaments keep the original live, just-finished, next-event priority", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /const activeEventCard = mainSeasonEvents\.find\(\(item\) => isActiveOn\(item, today\)\)/);
  assert.match(ui, /const graceEventCard = \[\.\.\.mainSeasonEvents\]\.reverse\(\)\.find\(\(item\) => item\.endDate < today && addDateDays\(item\.endDate, 1\) === today\)/);
  assert.match(ui, /const featuredEventCard = activeEventCard \?\? graceEventCard \?\? firstUpcomingMain/);
  assert.match(ui, /const recentEvents = seasonCalendar/);
  assert.match(ui, /eventListMode === "calendar" \? <SeasonSelector/);
  assert.match(ui, /action="本赛季"/);
});

test("historical match detail only exposes official match statistics", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /const isCurrentSeasonMatch = selectedEvent\.season === initialCurrentSeason/);
  assert.match(ui, /const hasMatchupData = isCurrentSeasonMatch \? hasStats \|\| hasSeason \|\| hasH2h : hasStats/);
  assert.match(ui, /\{isCurrentSeasonMatch \? <div className=\{polish\.dataTabs\}/);
  assert.match(ui, /isCurrentSeasonMatch && selectedDataTab === "season" && hasSeason/);
  assert.match(ui, /isCurrentSeasonMatch && selectedDataTab === "h2h" && h2h/);
  assert.match(ui, /isCurrentSeasonMatch \? "对阵数据" : "比赛统计"/);
  assert.match(ui, /历史赛事/);
});

test("tournament-facing copy avoids internal database language", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /CHAMPION · 本届冠军/);
  assert.match(ui, /赛程陆续公布中/);
  assert.match(ui, /比赛数据实时更新/);
  assert.doesNotMatch(ui, /详细赛程尚未入库/);
  assert.doesNotMatch(ui, /本站数据库实时快照/);
  assert.doesNotMatch(ui, /完赛后冻结保存到本站数据库/);
});

test("database hardening preserves terminal states and source freshness", async () => {
  const migration = await read("supabase/migrations/20260825191000_harden_live_match_status_transitions.sql");
  assert.match(migration, /add column if not exists source_status/);
  assert.match(migration, /old\.status in \('completed', 'walkover'\)/);
  assert.match(migration, /new\.source_updated_at < old\.source_updated_at/);
  assert.match(migration, /old\.status in \('live', 'session-break'\) and new\.status = 'upcoming'/);
});

test("live visual treatment respects reduced motion", async () => {
  const css = await read("app/snooker/snooker-priority.module.css");
  assert.match(css, /liveStatusPill/);
  assert.match(css, /liveSeparator/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
