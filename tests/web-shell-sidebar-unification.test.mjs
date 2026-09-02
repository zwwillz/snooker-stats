import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web headers share one 64px navigation geometry and hide page-specific actions", async () => {
  const [site, compare, about] = await Promise.all([
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/compare/player-compare.module.css"),
    read("app/about/about.module.css"),
  ]);
  assert.match(site, /--snooker-header-height:64px/);
  assert.match(compare, /\.topbar\{z-index:60;display:flex;min-height:64px;height:64px/);
  assert.match(about, /\.topbar\{z-index:60;height:64px;min-height:64px/);
  assert.match(compare, /\.shareButton\{display:none\}/);
  assert.match(about, /\.back\{display:none\}/);
});

test("player tournament and data sidebars share titled card hierarchy", async () => {
  const [player, eventUi, eventCss, ranking, technical, history] = await Promise.all([
    read("app/snooker/players/player-directory.tsx"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/snooker/data/data-ranking-content.tsx"),
    read("app/snooker/data/data-technical-content.tsx"),
    read("app/snooker/data/data-history-records-content-v2.tsx"),
  ]);
  assert.match(player, /<strong>球员筛选<\/strong>/);
  assert.match(eventUi, /<small>TOURNAMENT FILTER<\/small><strong>赛事筛选<\/strong>/);
  assert.match(eventCss, /\.eventSidebarHeading\{display:flex;flex-direction:column/);
  assert.match(ranking, /<small>RANKING FILTER<\/small><strong>排名筛选<\/strong>/);
  assert.match(technical, /<small>TECHNICAL FILTER<\/small><strong>技术榜单<\/strong>/);
  assert.match(history, /className=\{styles\.historyRecordNav\}/);
});

test("sticky table headers lose their top radius only after pinning", async () => {
  const [rootUi, priority, ranking, dataCss, technicalCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/snooker/data/data-ranking-content.tsx"),
    read("app/snooker/data/data.module.css"),
    read("app/snooker/data/technical-detail.module.css"),
  ]);
  assert.match(rootUi, /eventTableHeadPinned/);
  assert.match(priority, /\.eventTableHeadPinned\{border-radius:0\}/);
  assert.match(ranking, /rankingTableHeaderPinned/);
  assert.match(dataCss, /\.rankingTableHeaderPinned\{border-radius:0\}/);
  assert.match(technicalCss, /\.technicalTableStickyPinned \.technicalTableHeader\{[\s\S]*?border-radius:0/);
});
