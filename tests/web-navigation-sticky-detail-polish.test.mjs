import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public navigation keeps a neutral logo and uses STATS consistently", async () => {
  const [header, rootUi, siteCss] = await Promise.all([
    read("app/snooker/public-site-header.tsx"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-data-center.module.css"),
  ]);

  assert.match(header, /label: "数据", labelEn: "STATS"/);
  assert.match(rootUi, /id: "data", label: "数据", labelEn: "STATS"/);
  assert.match(siteCss, /\.brand\{[^}]*color:var\(--ink\);text-decoration:none/);
  assert.match(siteCss, /\.brand:visited\{color:var\(--ink\)\}/);
});

test("ranking entry copy and homepage route point at ranking center", async () => {
  const [rootUi, ranking] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/data/data-ranking-content.tsx"),
  ]);

  assert.match(rootUi, /onClick=\{\(\) => openRankings\("world_official"\)\}>查看完整世界排名/);
  assert.match(ranking, /<small>RANKING CENTER<\/small><h1>排名中心<\/h1>/);
  assert.match(ranking, /<small>RANKING LISTS<\/small><strong>排名榜单<\/strong>/);
  assert.match(ranking, /activeLeaderboardPage/);
  assert.match(ranking, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
});

test("desktop sticky menus remain visible and preserve the agreed widths", async () => {
  const [eventCss, playerCss, rankingCss, detailCss, historyCss] = await Promise.all([
    read("app/snooker/snooker-priority.module.css"),
    read("app/snooker/players/player.module.css"),
    read("app/snooker/data/data.module.css"),
    read("app/snooker/data/technical-detail.module.css"),
    read("app/snooker/data/data-history-records.module.css"),
  ]);

  assert.match(eventCss, /\.eventCenterLayout\{display:grid;grid-template-columns:200px minmax\(0,1fr\);gap:20px/);
  assert.match(playerCss, /\.directoryLayout\{display:grid;grid-template-columns:200px minmax\(0,1fr\);gap:20px/);
  assert.doesNotMatch(eventCss, /eventCenterLayout\{grid-template-columns:(?:172|184|190)px/);
  assert.doesNotMatch(playerCss, /directoryLayout\{grid-template-columns:(?:172|184|190)px/);
  assert.match(rankingCss, /\.detailContent\{padding:24px 0 42px;display:grid;grid-template-columns:230px minmax\(0,1fr\)/);
  assert.match(detailCss, /grid-template-columns:230px minmax\(0,1fr\)/);
  assert.match(detailCss, /\.technicalSidebar\{[\s\S]*max-height:calc\(100dvh - var\(--snooker-header-height,64px\) - \(var\(--technical-workspace-gap\) \* 2\)\)/);
  assert.match(historyCss, /\.historySidebar\{[\s\S]*top:calc\(var\(--snooker-header-height,64px\) \+ 18px\)/);
});

test("player search is explicit and the calendar header is flat", async () => {
  const [player, playerCss, eventCss] = await Promise.all([
    read("app/snooker/players/player-directory.tsx"),
    read("app/snooker/players/player.module.css"),
    read("app/snooker/snooker-priority.module.css"),
  ]);

  assert.match(player, /placeholder="搜索球员（中文名 \/ 英文名）"/);
  assert.match(playerCss, /\.searchBox\{[^}]*border-color:color-mix\([^}]*background:#fff/);
  assert.match(eventCss, /\.eventTableHead\{[^}]*border-radius:0/);
});
