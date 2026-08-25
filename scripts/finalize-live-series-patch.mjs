import { readFile, writeFile } from "node:fs/promises";

async function read(path) { return readFile(path, "utf8"); }
async function write(path, value) { await writeFile(path, value.endsWith("\n") ? value : `${value}\n`); }
function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`finalize target missing: ${label}`);
  return source.replace(from, to);
}

// The live-state trigger needs these source metadata columns on existing databases.
const migrationPath = "supabase/migrations/20260825191000_harden_live_match_status_transitions.sql";
let migration = await read(migrationPath);
if (!migration.includes("add column if not exists source_status")) {
  migration = `alter table public.snooker_matches\n  add column if not exists source_status text,\n  add column if not exists source_status_meta text,\n  add column if not exists completed_detected_at timestamptz;\n\n${migration}`;
}
await write(migrationPath, migration);

// Refresh the checksum entry after the migration content is finalized.
const { createHash } = await import("node:crypto");
const checksumPath = "supabase/migration-checksums.json";
const manifest = JSON.parse(await read(checksumPath));
const entry = manifest.migrations.find((item) => item.version === "20260825191000");
if (!entry) throw new Error("new migration checksum entry missing");
entry.md5 = createHash("md5").update(migration).digest("hex");
await write(checksumPath, JSON.stringify(manifest, null, 2));

let foundation = await read("tests/snooker-data-foundation.test.mjs");
foundation = replaceRequired(foundation,
  '  assert.match(pageSource, /export const revalidate = 300/);\n  assert.doesNotMatch(pageSource, /dynamic = "force-dynamic"/);',
  '  assert.match(pageSource, /export const revalidate = 0/);\n  assert.match(pageSource, /dynamic = "force-dynamic"/);',
  "foundation root cache policy",
);
foundation = replaceRequired(foundation,
  '  assert.match(uiSource, /if \\(!hasLiveMatch\\) return/);',
  '  assert.match(uiSource, /if \\(!shouldPollDashboard\\) return/);',
  "foundation poll predicate",
);
foundation = replaceRequired(foundation,
  '  assert.doesNotMatch(uiSource, /cache: "no-store"/);',
  '  assert.match(uiSource, /cache: "no-store"/);',
  "foundation no-store fetch",
);
foundation = replaceRequired(foundation,
  '  assert.match(uiSource, /full\\.rounds\\.map/);\n  assert.match(uiSource, /openMatch\\(match\\.id, full\\.slug\\)/);\n  assert.match(uiSource, /该阶段详细赛程尚未入库/);',
  '  assert.match(uiSource, /seriesDetail\\.stages\\.map/);\n  assert.match(uiSource, /openMatch\\(match\\.id, stageEvent\\.slug, seriesDetail\\.slug\\)/);\n  assert.match(uiSource, /详细赛程尚未入库/);',
  "foundation series schedule",
);
foundation = replaceRequired(foundation,
  '  assert.match(uiSource, /const latestCompleted = \\[\\.\\.\\.databaseEvents\\]/);\n  assert.match(uiSource, /const headlineMatch = activeEventCard/);',
  '  assert.match(uiSource, /selectHomepageHeadlineMatch\\(databaseEvents, players\\)/);\n  assert.match(uiSource, /const headlineMatch = headlineSelection\\?\\.match/);',
  "foundation headline selection",
);
await write("tests/snooker-data-foundation.test.mjs", foundation);

let insights = await read("tests/snooker-insights-v2.test.mjs");
insights = replaceRequired(insights,
  '  assert.match(ui, /full\\?\\.prizes\\?\\.length \\?/);',
  '  assert.match(ui, /prizeEvent\\?\\.prizes\\?\\.length \\?/);',
  "insights prize source",
);
await write("tests/snooker-insights-v2.test.mjs", insights);

let phase3 = await read("tests/snooker-phase3a-cache.test.mjs");
phase3 = replaceRequired(phase3,
  '  assert.doesNotMatch(route, /no-store, no-cache, must-revalidate/);',
  '  assert.match(route, /no-store, no-cache, must-revalidate/);',
  "phase3 live route no-store",
);
phase3 = replaceRequired(phase3,
  '  assert.match(ui, /if \\(!hasLiveMatch\\) return/);',
  '  assert.match(ui, /if \\(!shouldPollDashboard\\) return/);',
  "phase3 poll predicate",
);
phase3 = replaceRequired(phase3,
  '  assert.match(ui, /fetch\\("\\/api\\/snooker\\/v1\\/dashboard", \\{ headers: \\{ Accept: "application\\/json" \\} \\}\\)/);',
  '  assert.match(ui, /fetch\\("\\/api\\/snooker\\/v1\\/dashboard", \\{ cache: "no-store", headers: \\{ Accept: "application\\/json" \\} \\}\\)/);',
  "phase3 dashboard no-store",
);
await write("tests/snooker-phase3a-cache.test.mjs", phase3);

let migrationTest = await read("tests/snooker-migration-reproducibility.test.mjs");
migrationTest = replaceRequired(migrationTest, "  assert.equal(files.length, 62);", "  assert.equal(files.length, 63);", "migration file count");
migrationTest = replaceRequired(migrationTest,
  '  assert.equal(files.at(-1), "20260824051859_add_event_series_rule_service_policy.sql");',
  '  assert.equal(files.at(-1), "20260825191000_harden_live_match_status_transitions.sql");',
  "migration last file",
);
migrationTest = replaceRequired(migrationTest, "  assert.equal(checksums.length, 62);", "  assert.equal(checksums.length, 63);", "migration checksum count");
await write("tests/snooker-migration-reproducibility.test.mjs", migrationTest);

const liveSeriesTests = `import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(\`../\${path}\`, import.meta.url), "utf8");

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
  assert.match(liveClient, /scoreTotal\\(incoming\\) < scoreTotal\\(current\\)/);
  assert.match(liveClient, /FINAL_STATUSES\\.has\\(current\\.status\\)/);
});

test("session breaks remain active and are shown as break state", async () => {
  const [ui, liveClient, liveRead, migration] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
    read("lib/snooker/live-read-through.ts"),
    read("supabase/migrations/20260825191000_harden_live_match_status_transitions.sql"),
  ]);
  assert.match(liveRead, /session-break/);
  assert.match(liveRead, /interval\\|session/);
  assert.match(liveClient, /return "局间休息"/);
  assert.match(ui, /matchDisplayStatus\\(match\\)/);
  assert.match(migration, /new\\.status := 'session-break'/);
});

test("homepage headline selection is deterministic and retains recent results until live takeover", async () => {
  const [ui, liveClient] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/live-client.ts"),
  ]);
  assert.match(liveClient, /selectHomepageHeadlineMatch/);
  assert.match(liveClient, /60 \\* 60 \\* 1000/);
  assert.match(liveClient, /roundPriority/);
  assert.match(liveClient, /chinaPriority/);
  assert.match(liveClient, /liveExists/);
  assert.match(ui, /selectHomepageHeadlineMatch\\(databaseEvents, players\\)/);
});

test("event series presents a continuous schedule without a stage selector", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.doesNotMatch(ui, /className=\\{priority\\.stageSelector\\}/);
  assert.match(ui, /seriesDetail\\.stages\\.map/);
  assert.match(ui, /seriesStageSection/);
  assert.match(ui, /overviewStart = seriesDetail\\?\\.startDate/);
  assert.match(ui, /aggregateEvents/);
  assert.match(ui, /合并去重/);
});

test("database hardening preserves terminal states and source freshness", async () => {
  const migration = await read("supabase/migrations/20260825191000_harden_live_match_status_transitions.sql");
  assert.match(migration, /add column if not exists source_status/);
  assert.match(migration, /old\\.status in \\('completed', 'walkover'\\)/);
  assert.match(migration, /new\\.source_updated_at < old\\.source_updated_at/);
  assert.match(migration, /old\\.status in \\('live', 'session-break'\\) and new\\.status = 'upcoming'/);
});

test("live visual treatment respects reduced motion", async () => {
  const css = await read("app/snooker/snooker-priority.module.css");
  assert.match(css, /liveStatusPill/);
  assert.match(css, /liveSeparator/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
`;
await write("tests/snooker-live-series-experience.test.mjs", liveSeriesTests);

console.log("Finalized live-series migration and regression expectations.");
