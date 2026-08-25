import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Championship League keeps each WST source event as an individual user-facing stop", async () => {
  const database = await read("lib/snooker/database-public.ts");
  assert.match(database, /function isChampionshipLeagueSeries/);
  assert.match(database, /rows\.map\(\(row\) => championshipLeagueStandaloneSeries\(series, row, loadedAt\)\)/);
  assert.match(database, /id: `db-series-event-\$\{row\.id\}`/);
  assert.match(database, /stages: \[\{/);
});

test("historical Championship League stops hydrate full match and frame data on demand", async () => {
  const database = await read("lib/snooker/database-public.ts");
  assert.match(database, /historicalChampionshipLeague/);
  assert.match(database, /!detailEventIds\.has\(eventUuid\)/);
  assert.match(database, /export async function loadSnookerEventDetail/);
  assert.match(database, /snooker_matches\?select=id,event_id,round_id,source_match_id,match_no,player1_id,player2_id,score1,score2/);
  assert.match(database, /snooker_frames\?select=id,match_id,frame_no,score1,score2,break1,break2,note/);
});
