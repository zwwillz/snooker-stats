import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("phase 3a centralizes realtime recent player and history cache windows", async () => {
  const policy = await read("lib/snooker/cache-policy.ts");
  assert.match(policy, /realtime: 30/);
  assert.match(policy, /recent: 300/);
  assert.match(policy, /player: 3600/);
  assert.match(policy, /history: 86400/);
  assert.match(policy, /stale-while-revalidate/);
  assert.match(policy, /stale-if-error=86400/);
});

test("phase 3a shares the expensive database view across requests", async () => {
  const [loader, route] = await Promise.all([
    read("lib/snooker/database-public-v2.ts"),
    read("app/api/snooker/v1/dashboard/route.ts"),
  ]);
  assert.match(loader, /let cachedView:/);
  assert.match(loader, /let inflightView:/);
  assert.match(loader, /refreshSnookerDatabaseViewV2/);
  assert.match(loader, /serving stale snapshot/);
  assert.doesNotMatch(loader, /unstable_cache/);
  assert.match(route, /SNOOKER_DASHBOARD_CACHE_CONTROL/);
  assert.match(route, /no-store, no-cache, must-revalidate/);
});

test("phase 3a keeps live polling bounded and cache-aware", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /if \(!shouldPollDashboard\) return/);
  assert.match(ui, /setInterval\(\(\) => void refresh\(\), 30_000\)/);
  assert.match(ui, /fetch\("\/api\/snooker\/v1\/dashboard", \{ cache: "no-store", headers: \{ Accept: "application\/json" \} \}\)/);
  assert.doesNotMatch(ui, /Date\.now\(\).*dashboard/);
  assert.match(ui, /formatUpdatedAt\(sourceHealth\?\.fetchedAt\)/);
  assert.match(ui, /className=\{styles\.dataStatus\}/);
  assert.doesNotMatch(ui, /sourceHealth\?\.sourceLabel/);
  assert.match(ui, /<span>更新 \{formatUpdatedAt\(sourceHealth\?\.fetchedAt\)\}<\/span>/);
});
