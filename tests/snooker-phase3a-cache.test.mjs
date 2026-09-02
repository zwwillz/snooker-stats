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
  const [ui, eventRoute, matchRoute, homeLiveRoute] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/api/snooker/v1/event/route.ts"),
    read("app/api/snooker/v1/match/route.ts"),
    read("app/api/snooker/v1/home-live/route.ts"),
  ]);
  assert.match(ui, /if \(!shouldPollLive\) return/);
  assert.match(ui, /setInterval\(\(\) => void refresh\(\), 30_000\)/);
  assert.doesNotMatch(ui, /fetch\("\/api\/snooker\/v1\/dashboard"/);
  assert.match(ui, /currentDetail\?\.type === "match"[\s\S]*?ensureMatchDetail\(currentDetail\.matchId, \{ silent: true \}\)/);
  assert.match(ui, /fetch\(`\/api\/snooker\/v1\/home-live\?ids=/);
  assert.match(ui, /\.slice\(0, 64\)/);
  for (const route of [eventRoute, matchRoute, homeLiveRoute]) {
    assert.match(route, /export const dynamic = "force-dynamic"/);
    assert.match(route, /export const revalidate = 0/);
    assert.match(route, /Cache-Control[\s\S]*?no-store/);
  }
  assert.match(ui, /formatUpdatedAt\(sourceHealth\?\.fetchedAt\)/);
  assert.doesNotMatch(ui, /className=\{styles\.dataStatus\}/);
  assert.doesNotMatch(ui, /sourceHealth\?\.sourceLabel/);
  assert.doesNotMatch(ui, /<span>更新 \{formatUpdatedAt\(sourceHealth\?\.fetchedAt\)\}<\/span>/);
});
