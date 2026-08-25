import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("2026 Championship League repair preserves all six WST source events", async () => {
  const sql = await read("supabase/migrations/20260825143757_fix_2026_championship_league_wst_stages.sql");
  for (const sourceId of [
    "221af158-c0f2-48cc-94a8-47b45a4a9c2d",
    "130ef3b6-ef10-481f-b01b-541debd7e591",
    "f377387b-3079-457f-8489-6f4629eb051d",
    "79bcd402-fe9a-4d16-930e-ce8f7eae2599",
    "24b1a5d3-bfe3-41df-b998-eacb7d83ce24",
    "a9c7a8a2-fc65-4ee5-9f15-752cdc8f2364",
  ]) {
    assert.match(sql, new RegExp(sourceId));
  }
  assert.match(sql, /expected_match_count=72/);
  assert.match(sql, /expected_match_count=48/);
  assert.match(sql, /expected_match_count=24/);
  assert.match(sql, /expected_match_count=13/);
  assert.match(sql, /2026斯诺克冠军联赛（第一阶段·第1周）/);
  assert.match(sql, /2026斯诺克冠军联赛（第三阶段及决赛）/);
  assert.match(sql, /小组循环赛（第一阶段）/);
  assert.match(sql, /小组循环赛（第二阶段）/);
  assert.match(sql, /小组循环赛（第三阶段）/);
  assert.match(sql, /\(v_final,'final','Final','决赛',1,5\)/);
  assert.doesNotMatch(sql, /\(v_wk[123],'final'/);
  assert.doesNotMatch(sql, /\(v_s2w[12],'final'/);
});

test("2026 Championship League finalization uses a WST-stage slug and score-based frame completeness", async () => {
  const sql = await read("supabase/migrations/20260825144426_finalize_2026_championship_league_repairs.sql");
  assert.match(sql, /betvictor-championship-league-snooker-2026-stage-one-wk1/);
  assert.match(sql, /coalesce\(m\.score1,0\)\+coalesce\(m\.score2,0\)/);
  assert.match(sql, /winner_id=case when m\.score1 is not distinct from m\.score2 then null/);
  assert.match(sql, /refresh_current_season_analytics/);
});
