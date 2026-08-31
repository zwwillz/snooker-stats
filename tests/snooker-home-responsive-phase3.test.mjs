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

test("phase three homepage adapts ranking, focus matches and China players by viewport and item count", async () => {
  const [ui, css, priority] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/snooker-priority.module.css"),
  ]);

  assert.match(ui, /rankingRows\.slice\(0, 5\)/);
  assert.match(ui, /styles\.rankingDesktopRow/);
  assert.match(css, /\.rankingDesktopRow\{display:none!important\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.rankingDesktopRow\{display:grid!important\}/);
  assert.match(css, /\.homeRankingSlot>\*\{display:flex;flex-direction:column\}/);
  assert.match(css, /\.homeRankingSlot \.rankingList>\*\{flex:1\}/);

  assert.match(ui, /ref=\{headlineRail\}/);
  assert.match(ui, /aria-label="上一场焦点比赛"/);
  assert.match(ui, /aria-label="下一场焦点比赛"/);
  assert.match(ui, /title="比赛间歇"/);
  assert.match(ui, /下一场比赛进入预热或直播状态后/);
  assert.match(priority, /\.desktopRailControls\{display:none/);
  assert.match(priority, /@media \(min-width:1024px\)[\s\S]*\.desktopRailControls\{display:flex\}/);

  assert.match(ui, /row\.rank <= 16 && isChina\(row\.player\)/);
  assert.match(ui, /styles\.chinaTopGridFour/);
  assert.match(ui, /styles\.chinaTopGridScrollable/);
  assert.match(css, /\.chinaTopGridFour\{grid-template-columns:repeat\(4,1fr\)\}/);
  assert.match(css, /\.chinaTopGridScrollable\{display:flex;overflow-x:auto/);
  assert.match(ui, /aria-label="查看更多中国球员"/);
});
