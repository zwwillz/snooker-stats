import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(new URL("../lib/snooker/event-detail-complete.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/snooker/v1/event/route.ts", import.meta.url), "utf8");

test("historical event helper loads frames through base detail and enriches match statistics", () => {
  assert.match(helper, /loadSnookerEventDetail\(slug\)/);
  assert.match(helper, /snooker_match_statistics\?/);
  assert.match(helper, /snooker_match_head_to_head\?/);
  assert.match(helper, /statistics: statsByMatch\.get/);
});

test("event route upgrades completed cached events to complete event detail", () => {
  assert.match(route, /loadSnookerEventDetailComplete/);
  assert.match(route, /cachedEvent\.status === "completed"/);
  assert.match(route, /const baseEvent = detailedEvent/);
});
