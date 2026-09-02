import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web headers share one 64px navigation geometry and hide page-specific actions", async () => {
  const [shared, siteCss, rootUi, compare, compareCss, about] = await Promise.all([
    read("app/snooker/public-site-header.tsx"),
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/compare/player-compare-client.tsx"),
    read("app/snooker/compare/player-compare.module.css"),
    read("app/about/about-chrome.tsx"),
  ]);
  assert.match(shared, /import styles from "\.\/snooker-data-center\.module\.css"/);
  assert.match(siteCss, /\.header\{height:var\(--snooker-header-height\);padding:0 max\(20px,calc\(\(100% - 1120px\)\/2\)\)/);
  assert.match(shared, /className=\{styles\.themeSwitch\}/);
  assert.match(rootUi, /<PublicSiteHeader active=\{activeView\}/);
  assert.match(compare, /<PublicSiteHeader active="players" \/>/);
  assert.match(about, /<PublicSiteHeader \/>/);
  assert.doesNotMatch(compare, /shareButton|navigator\.clipboard/);
  assert.match(compareCss, /\.mobileTopbar\{display:none!important\}/);
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
  const [rootUi, priority, ranking, dataCss, technicalCss, history, historyCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/snooker/data/data-ranking-content.tsx"),
    read("app/snooker/data/data.module.css"),
    read("app/snooker/data/technical-detail.module.css"),
    read("app/snooker/data/data-history-records-content-v2.tsx"),
    read("app/snooker/data/data-history-records.module.css"),
  ]);
  assert.match(rootUi, /eventTableHeadPinned/);
  assert.match(priority, /\.eventTableHeadPinned\{border-radius:0\}/);
  assert.match(ranking, /rankingTableHeaderPinned/);
  assert.match(dataCss, /\.rankingTableHeaderPinned\{border-radius:0\}/);
  assert.match(technicalCss, /\.technicalTableStickyPinned \.technicalTableHeader\{[\s\S]*?border-radius:0/);
  assert.match(history, /pinned \? styles\.listHeaderPinned/);
  assert.match(historyCss, /\.listHeaderSticky\{[\s\S]*?border-radius:20px 20px 0 0/);
  assert.match(historyCss, /\.listHeaderPinned\{border-radius:0\}/);
});
