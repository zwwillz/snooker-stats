import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(new URL("../lib/snooker/event-detail-complete.ts", import.meta.url), "utf8");
const freshHelper = fs.readFileSync(new URL("../lib/snooker/event-detail-fresh.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/snooker/v1/event/route.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../app/api/snooker/v1/dashboard/route.ts", import.meta.url), "utf8");

test("event helper uses a fresh focused schedule and enriches match statistics", () => {
  assert.match(helper, /loadSnookerEventDetailFresh\(slug\)/);
  assert.match(freshHelper, /cache: "no-store"/);
  assert.match(freshHelper, /snooker_matches\?select=/);
  assert.match(helper, /snooker_match_statistics\?/);
  assert.match(helper, /statistics: statsByMatch\.get/);
});

test("historical event detail keeps match stats but skips head-to-head loading", () => {
  assert.match(helper, /const includeHeadToHead = event\.season === currentSnookerSeason\(\)/);
  assert.match(helper, /includeHeadToHead[\s\S]*snooker_match_head_to_head\?select=/);
  assert.match(helper, /: Promise\.resolve\(\[\] as DbHeadToHead\[\]\)/);
});

test("event route upgrades every event open to complete fresh event detail", () => {
  assert.match(route, /detailedEvent = await loadSnookerEventDetailComplete\(slug\)/);
  assert.doesNotMatch(route, /cachedEvent\.status === "completed"/);
  assert.match(route, /const baseEvent = detailedEvent/);
  assert.match(route, /no-store, no-cache, must-revalidate/);
});

test("root and dashboard keep only a complete focused event and lazy-load historical events", () => {
  assert.match(page, /loadSnookerEventDetailComplete\(database\.snapshot\.event\.slug\)/);
  assert.match(page, /initialDatabaseEvents=\{focusedEvents\}/);
  assert.match(dashboard, /loadSnookerEventDetailComplete\(database\.snapshot\.event\.slug\)/);
  assert.match(dashboard, /const databaseEvents = \[focusedEvent\]/);
  assert.match(dashboard, /历史赛事在打开时按站完整加载/);
});
