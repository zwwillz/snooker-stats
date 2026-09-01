import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("event data follows the approved summary order and suppresses league final-four cards", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const dataStart = ui.indexOf('{detail.tab === "data"');
  const dataEnd = ui.indexOf("const featuredDetail", dataStart);
  const dataPanel = ui.slice(dataStart, dataEnd);

  const finalFour = dataPanel.indexOf('title="本届四强"');
  const statistics = dataPanel.indexOf('title="赛事统计"');
  const highlights = dataPanel.indexOf('title="赛事亮点"');
  const china = dataPanel.indexOf('title="中国球员战绩"');
  assert.ok(finalFour >= 0 && finalFour < statistics && statistics < highlights && highlights < china);
  for (const label of ["最高单杆", "胜率最高", "147次数", "破百总数"]) assert.match(dataPanel, new RegExp(label));
  assert.match(ui, /championship\[-_ \]league\|冠军联赛/);
});

test("event aggregation uses final results and event-scoped break rows", async () => {
  const [core, foundation] = await Promise.all([
    read("lib/snooker/event-detail-core.ts"),
    read("lib/snooker/foundation.ts"),
  ]);
  assert.match(core, /snooker_breaks\?select=match_id,player_id,break_value/);
  assert.match(core, /isChampion = true/);
  assert.match(core, /roundProgressScore/);
  assert.match(foundation, /roundProgressScore/);
});

test("current-season metadata migration resolves stable slugs and official prize sources", async () => {
  const migration = await read("supabase/migrations/20260901061422_backfill_2026_27_event_metadata.sql");
  assert.match(migration, /join public\.snooker_players as player on player\.slug = champions\.player_slug/);
  assert.match(migration, /'wuhan-open-2026', 'xiao-guodong', 2025/);
  assert.match(migration, /'british-open-2026'/);
  assert.match(migration, /'world-championship-2027'/);
  assert.match(migration, /https:\/\/www\.wst\.tv\//);
  assert.match(migration, /on conflict \(event_id, prize_key\) do update/);
});
