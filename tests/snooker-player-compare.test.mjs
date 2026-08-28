import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("player compare service uses the analytics warehouse instead of duplicating sync logic", async () => {
  const source = await read("lib/snooker/player-compare.ts");
  assert.match(source, /snooker_player_season_aggregates/);
  assert.match(source, /snooker_player_career_aggregates/);
  assert.match(source, /snooker_player_h2h_aggregates/);
  assert.match(source, /snooker_player_season_stats/);
  assert.match(source, /snooker_matches/);
  assert.doesNotMatch(source, /snooker_sync_wst_/);
});

test("player compare keeps missing values distinct from zero and exposes coverage", async () => {
  const source = await read("lib/snooker/player-compare.ts");
  const client = await read("app/snooker/compare/player-compare-client.tsx");
  assert.match(source, /frameCoveragePct/);
  assert.match(source, /isCareerComplete/);
  assert.match(client, /缺失数据统一显示“—”，不会当作 0/);
  assert.match(client, /逐局数据覆盖/);
});

test("player compare v1 exposes season career h2h honours and current-tour selector", async () => {
  const page = await read("app/snooker/compare/player-compare-client.tsx");
  assert.match(page, /赛季表现/);
  assert.match(page, /职业生涯/);
  assert.match(page, /交手记录/);
  assert.match(page, /荣誉对比/);
  assert.match(page, /TOP 16/);
  assert.match(page, /中国球员/);
  assert.match(page, /player\.isCurrentTour/);
  assert.match(page, /退赛可计入比赛结果/);
});

test("player compare honours document the final-champion aggregation rule", async () => {
  const page = await read("app/snooker/compare/player-compare-client.tsx");
  assert.match(page, /多阶段赛事不会把中间阶段重复计为冠军/);
});

test("player compare API has bounded caching and does not cache errors", async () => {
  const route = await read("app/api/snooker/v1/player-compare/route.ts");
  assert.match(route, /s-maxage=60/);
  assert.match(route, /stale-while-revalidate=120/);
  assert.match(route, /Cache-Control.*no-store/s);
});

test("player compare polish keeps historical rankings honest", async () => {
  const client = await read("app/snooker/compare/player-compare-client.tsx");
  assert.match(client, /data\.season === currentSeason \? player\.currentRank : stat\?\.ranking \?\? null/);
  assert.doesNotMatch(client, /left\?\.ranking \?\? leftPlayer\.currentRank/);
});

test("player compare polish moves season selection below the season tab and keeps update time near VS", async () => {
  const client = await read("app/snooker/compare/player-compare-client.tsx");
  assert.match(client, /tab === "season" \? <div className={styles\.seasonToolbar}/);
  assert.match(client, /className={styles\.vsControl}/);
  assert.doesNotMatch(client, /className={styles\.heroControls}/);
});

test("player compare entry cards support optional preload but homepage defers the expensive comparison", async () => {
  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");
  const rootPage = await read("app/page.tsx");
  assert.match(teaser, /initialData\?: PlayerCompareSnapshot/);
  assert.match(teaser, /actionClassName\?: string/);
  assert.match(teaser, /\/api\/snooker\/v1\/player-compare\?/);
  assert.match(rootPage, /initialPlayerCompare={null}/);
  assert.doesNotMatch(rootPage, /loadPlayerCompare/);
});

test("player compare follows the main green-red theme selection", async () => {
  const shell = await read("app/snooker/snooker-data-center-v2.tsx");
  const css = await read("app/snooker/compare/player-compare.module.css");
  assert.match(shell, /localStorage\.setItem\("snooker-theme", theme\)/);
  assert.match(css, /html\[data-snooker-theme="red"\]/);
});
