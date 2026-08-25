import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourcePath = "scripts/apply-schedule-stability-fixes.mjs";
const source = await readFile(sourcePath, "utf8");
const marker = 'const testPath = "tests/snooker-schedule-stability.test.mjs";';
const index = source.indexOf(marker);
if (index < 0) throw new Error("Unable to locate test generation block");

const testSource = [
  'import assert from "node:assert/strict";',
  'import { readFile } from "node:fs/promises";',
  'import test from "node:test";',
  '',
  'const root = new URL("../", import.meta.url);',
  'const read = (path) => readFile(new URL(path, root), "utf8");',
  '',
  'test("series schedule merges stage identity into the round card", async () => {',
  '  const ui = await read("app/snooker/snooker-data-center-v2.tsx");',
  '  assert.doesNotMatch(ui, /CHAMPIONSHIP LEAGUE STAGE/);',
  '  assert.doesNotMatch(ui, /priority\\.seriesStageHeading/);',
  '  assert.match(ui, /stage\\.stageNameZh/);',
  '  assert.match(ui, /orderedScheduleRounds\\(stageEvent\\)/);',
  '});',
  '',
  'test("schedule ordering uses scheduled time instead of match number as the primary key", async () => {',
  '  const ui = await read("app/snooker/snooker-data-center-v2.tsx");',
  '  assert.match(ui, /function scheduledTime\\(match: SnookerMatch\\)/);',
  '  assert.match(ui, /completedEvent \\? bTime - aTime : aTime - bTime/);',
  '  assert.match(ui, /a\\.key === "final"/);',
  '  assert.match(ui, /orderedScheduleRounds\\(full\\)/);',
  '});',
  '',
  'test("dashboard snapshot merge preserves historical event details not present in a refresh", async () => {',
  '  const liveClient = await read("lib/snooker/live-client.ts");',
  '  assert.match(liveClient, /incomingById/);',
  '  assert.match(liveClient, /currentEvents\\.map/);',
  '  assert.match(liveClient, /incomingEvents\\.filter/);',
  '  assert.match(liveClient, /!currentIds\\.has/);',
  '});',
  '',
].join("\n");

const safeTail = [
  marker,
  `await write(testPath, ${JSON.stringify(testSource)});`,
  '',
  'console.log("Applied schedule title, chronological ordering, and event-detail persistence fixes.");',
  '',
].join("\n");

const tempPath = "/tmp/apply-schedule-stability-fixes-safe.mjs";
await writeFile(tempPath, source.slice(0, index) + safeTail);
await import(pathToFileURL(tempPath).href);
