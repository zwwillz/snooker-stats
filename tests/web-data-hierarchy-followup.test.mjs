import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web data home uses the shared canvas and an intentional twelve-column layout", async () => {
  const [content, css] = await Promise.all([
    read("app/snooker/data/data-ranking-content.tsx"),
    read("app/snooker/data/data.module.css"),
  ]);

  assert.match(content, /className=\{styles\.dataDashboard\}/);
  assert.match(css, /DATA_WEB_HIERARCHY_V1/);
  assert.match(css, /\.dataDashboard\{display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css, /\.dataHistorySlot\{grid-column:1\/-1\}/);
  assert.match(css, /\.pageIntro h1\{margin:7px 0 6px;font-size:42px\}/);
});

test("ranking and honours details follow the technical leaderboard web pattern", async () => {
  const [rootUi, ranking, honours, priority, detailCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/data/data-ranking-content.tsx"),
    read("app/snooker/data/data-honours-content.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/snooker/data/technical-detail.module.css"),
  ]);

  assert.match(rootUi, /styles\.detailShell\} \$\{priority\.dataDetailShell/);
  assert.match(priority, /\.eventDetailShell,\.matchDetailShell,\.dataDetailShell\{width:min\(1120px,calc\(100% - 40px\)\)/);
  assert.match(ranking, /className=\{styles\.rankingDesktopIntro\}/);
  assert.match(honours, /export function HonoursDetailPage/);
  assert.match(honours, /className=\{detailStyles\.technicalDesktopIntro\}/);
  assert.match(honours, /technicalTableStickyPinned/);
  assert.match(detailCss, /\.honoursRankingList button\{grid-template-columns:48px 38px minmax\(0,1fr\) 110px 14px\}/);
});

test("history secondary and tertiary pages use browser scroll and a nested left menu", async () => {
  const [content, css] = await Promise.all([
    read("app/snooker/data/data-history-records-content-v2.tsx"),
    read("app/snooker/data/data-history-records.module.css"),
  ]);

  assert.doesNotMatch(content, /desktopDetailBar/);
  assert.match(content, /className=\{styles\.historySidebar\}/);
  assert.match(content, /className=\{styles\.historyRecordNav\}/);
  assert.match(content, /data-history-records-page="true"/);
  assert.match(content, /listHeaderPinned/);
  assert.match(css, /\.overlay\{position:static;inset:auto/);
  assert.match(css, /\.overlay\{position:static;inset:auto;z-index:auto/);
  assert.match(css, /\.overlayScroll\{width:100%;height:auto;margin:0;overflow:visible/);
  assert.match(css, /\.mobileHeader\{display:none\}/);
  assert.match(css, /\.historyDesktopLayout\{display:grid;grid-template-columns:230px minmax\(0,1fr\)/);
  assert.match(css, /\.historySidebar\{[\s\S]*?top:var\(--snooker-header-height,64px\)/);
});
