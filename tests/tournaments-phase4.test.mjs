import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("phase 4 tournament experience keeps the approved event hierarchy", async () => {
  const [uiSource, priorityCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);

  assert.match(uiSource, /activeEventCard \?\? firstUpcomingMain \?\? graceEventCard/);
  assert.match(uiSource, /const recentFeaturedEvent = activeEventCard/);
  assert.match(uiSource, /const recentCompletedEvents = \[\.\.\.mainSeasonEvents\]/);
  assert.match(uiSource, /const recentCardEvents = \[firstUpcomingCurrent, \.\.\.recentCompletedEvents\]/);
  assert.match(uiSource, /查看本赛季完整赛历/);
  assert.match(uiSource, /data-event-detail/);
  assert.match(uiSource, /data-match-detail/);
  assert.match(priorityCss, /TOURNAMENTS_PHASE4BC_CORE/);
});

test("phase 4 detail pages keep event and match data scoped on demand", async () => {
  const uiSource = await read("app/snooker/snooker-data-center-v2.tsx");

  assert.match(uiSource, /fetch\(`\/api\/snooker\/v1\/event\?slug=/);
  assert.match(uiSource, /ensureMatchDetail\(currentDetail\.matchId, \{ silent: true \}\)/);
  assert.doesNotMatch(uiSource, /Promise\.all\([^)]*ensureMatchDetail/);
});
