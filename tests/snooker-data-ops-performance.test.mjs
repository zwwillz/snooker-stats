import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/snooker/data-ops/page.tsx", "utf8");
const client = readFileSync("app/snooker/data-ops/data-ops-client-v2.tsx", "utf8");
const route = readFileSync("app/api/snooker/data-ops/snapshot/route.ts", "utf8");
const edgeFunction = readFileSync("supabase/functions/snooker-ops-api/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260828152558_split_snooker_ops_snapshot_sections.sql", "utf8");

test("data ops uses a static shell instead of blocking on authenticated SSR", () => {
  assert.doesNotMatch(page, /force-dynamic|loadSnookerOpsSnapshot|getSnookerOpsViewer/);
  assert.match(page, /<DataOpsClientV2\s*\/>/);
});

test("data ops loads only the selected section", () => {
  assert.match(client, /snapshot\?section=\$\{section\}/);
  assert.match(client, /loadedSections\.has\(next\)/);
  assert.match(client, /section === "analytics" && current\.syncTasks\.length > 1/);
  assert.doesNotMatch(client, /setInterval/);
  assert.match(route, /overview.*analytics.*sync.*quality.*logs/);
});

test("data ops RPC isolates heavy quality and log queries", () => {
  assert.match(edgeFunction, /snapshot-section/);
  assert.match(migration, /p_section = 'quality'/);
  assert.match(migration, /p_section = 'sync'/);
  assert.match(migration, /else\s+select jsonb_build_object\(\s*'syncLogs'/s);
  assert.match(migration, /grant execute on function public\.snooker_ops_snapshot_section\(text, text\) to service_role/);
});
