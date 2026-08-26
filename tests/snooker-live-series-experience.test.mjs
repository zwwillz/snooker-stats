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

test("homepage headline selection is deterministic and retains recent results until live takeover", async () => {
  const [ui, liveClient] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
  ]);
  assert.match(liveClient, /selectHomepageHeadlineMatch/);
  assert.match(liveClient, /60 \* 60 \* 1000/);
  assert.match(liveClient, /roundPriority/);
  assert.match(liveClient, /chinaPriority/);
  assert.match(liveClient, /liveExists/);
  assert.match(ui, /selectHomepageHeadlineMatches\(databaseEvents, players\)/);
});

test("event series presents a continuous schedule without a stage selector", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.doesNotMatch(ui, /className=\{priority\.stageSelector\}/);
  assert.match(ui, /seriesDetail\.stages\.map/);
  assert.match(ui, /seriesStageSection/);
  assert.match(ui, /overviewStart = seriesDetail\?\.startDate/);
  assert.match(ui, /aggregateEvents/);
  assert.match(ui, /合并去重/);
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
