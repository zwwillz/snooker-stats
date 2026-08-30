import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("mobile browsers share one explicit text sizing and format detection baseline", async () => {
  const globals = await read("app/globals.css");
  const layout = await read("app/layout.tsx");

  assert.match(globals, /-webkit-text-size-adjust:\s*100%/);
  assert.match(globals, /text-size-adjust:\s*100%/);
  assert.match(globals, /@media \(max-width:\s*767px\)[\s\S]*font-size:\s*16px !important/);
  assert.doesNotMatch(layout, /userScalable:\s*false|max(?:imum)?Scale:\s*1/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /telephone:\s*false/);
  assert.match(layout, /address:\s*false/);
  assert.match(layout, /email:\s*false/);
});

test("the public site exposes the approved mobile typography scale", async () => {
  const globals = await read("app/globals.css");

  assert.match(globals, /--snooker-type-decorative:\s*8px/);
  assert.match(globals, /--snooker-type-auxiliary:\s*9px/);
  assert.match(globals, /--snooker-type-secondary:\s*10px/);
  assert.match(globals, /--snooker-type-body-small:\s*12px/);
  assert.match(globals, /--snooker-type-list-title:\s*13px/);
  assert.match(globals, /--snooker-type-feature-name:\s*14px/);
  assert.match(globals, /--snooker-type-card-title:\s*19px/);
  assert.match(globals, /--snooker-type-page-title:\s*30px/);
});

test("homepage event and ranking cards use the approved mobile information hierarchy", async () => {
  const core = await read("app/snooker/snooker-data-center.module.css");
  const priority = await read("app/snooker/snooker-priority.module.css");
  const polish = await read("app/snooker/snooker-ui-polish.module.css");

  assert.match(core, /\.calendarList strong\{font-size:var\(--snooker-type-feature-name\)\}/);
  assert.match(core, /\.calendarList small,\.calendarList p\{font-size:var\(--snooker-type-secondary\)\}/);
  assert.match(priority, /\.eventModeTabs button\{height:44px;font-size:var\(--snooker-type-body-small\)\}/);
  assert.match(polish, /\.rankingStaticRow>span b\{font-size:var\(--snooker-type-list-title\)\}/);
  assert.match(polish, /\.rankingStaticRow>span small\{font-size:var\(--snooker-type-secondary\)\}/);
  assert.match(polish, /\.rankingStaticRow>em\{font-size:var\(--snooker-type-compact-data\)\}/);
});

test("player directory and match cards share the approved 13 pixel primary name rule", async () => {
  const players = await read("app/snooker/players/player.module.css");
  const priority = await read("app/snooker/snooker-priority.module.css");

  assert.match(players, /\.rowMain b\{font-size:var\(--snooker-type-list-title\)\}/);
  assert.match(players, /\.rowMain small,\.rowMain p\{font-size:var\(--snooker-type-secondary\)\}/);
  assert.match(players, /\.rankBlock small\{font-size:var\(--snooker-type-auxiliary\)\}/);
  assert.match(priority, /\.matchVersusRow>span\{font-size:var\(--snooker-type-list-title\)\}/);
});

test("player comparison preserves emphasized names and readable metric labels", async () => {
  const teaser = await read("app/snooker/compare/player-compare-teaser.module.css");

  assert.match(teaser, /\.players strong \{ font-size: var\(--snooker-type-feature-name\); \}/);
  assert.match(teaser, /\.metrics strong \{ font-size: var\(--snooker-type-stat-value\); \}/);
  assert.match(teaser, /\.metrics span \{ font-size: var\(--snooker-type-body-small\); \}/);
});
