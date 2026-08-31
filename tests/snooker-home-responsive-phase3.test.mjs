import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("phase three gives the homepage a real desktop grid without duplicating mobile content", async () => {
  const [ui, css, leaders] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/home-season-leaders.module.css"),
  ]);

  assert.match(ui, /className=\{styles\.homeLeadGrid\}/);
  assert.match(ui, /styles\.homeCompareSlot/);
  assert.match(ui, /styles\.homeRankingSlot/);
  assert.match(ui, /styles\.homeNextSlot/);
  assert.match(ui, /styles\.homeChinaSlot/);
  assert.match(ui, /styles\.homeLeadersSlot/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.contentHome\{display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css, /\.homeLeadGrid\{grid-column:1\/-1;grid-row:1;display:grid;grid-template-columns:minmax\(0,7fr\) minmax\(0,5fr\)/);
  assert.match(leaders, /@media \(min-width:1024px\)[\s\S]*\.grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.equal((ui.match(/<HomeSeasonLeaders/g) ?? []).length, 1);
  assert.equal((ui.match(/<HomeAboutCard/g) ?? []).length, 1);
});

test("phase three compacts only the desktop header and shares its sticky offset", async () => {
  const [css, dataCss, playerCss] = await Promise.all([
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/data/data.module.css"),
    read("app/snooker/players/player.module.css"),
  ]);

  assert.match(css, /--snooker-header-height:68px/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*--snooker-header-height:64px/);
  assert.match(css, /\.brand>span\{width:36px;height:36px;font-size:16px\}/);
  assert.match(css, /\.themeSwitch button\{width:30px;height:25px;font-size:9px/);
  assert.match(dataCss, /top:var\(--snooker-header-height,68px\)/);
  assert.match(playerCss, /\.directoryToolbar\{top:var\(--snooker-header-height,68px\)\}/);
});
