import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("schedule renders each WST event directly without merged stage identity", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /function EventCard/);
  assert.match(ui, /orderedScheduleRounds\(full\)/);
  assert.doesNotMatch(ui, /stage\.stageNameZh/);
  assert.doesNotMatch(ui, /orderedScheduleRounds\(stageEvent\)/);
  assert.doesNotMatch(ui, /priority\.seriesStageHeading/);
  assert.doesNotMatch(ui, /seriesDetail\.stages\.map/);
});

test("schedule ordering uses scheduled time instead of match number as the primary key", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /function scheduledTime\(match: SnookerMatch\)/);
  assert.match(ui, /completedEvent \? bTime - aTime : aTime - bTime/);
  assert.match(ui, /a\.key === "final"/);
  assert.match(ui, /orderedScheduleRounds\(full\)/);
});

test("dashboard snapshot merge preserves historical event details not present in a refresh", async () => {
  const liveClient = await read("lib/snooker/live-client.ts");
  assert.match(liveClient, /incomingById/);
  assert.match(liveClient, /currentEvents\.map/);
  assert.match(liveClient, /incomingEvents\.filter/);
  assert.match(liveClient, /!currentIds\.has/);
});
