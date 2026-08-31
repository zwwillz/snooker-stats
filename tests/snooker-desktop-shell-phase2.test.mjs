import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("phase two adds one semantic desktop navigation without replacing mobile navigation", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const css = await read("app/snooker/snooker-data-center.module.css");

  assert.match(ui, /labelEn:\s*"HOME"/);
  assert.match(ui, /className=\{styles\.desktopNav\}\s+aria-label="主要导航"/);
  assert.match(ui, /aria-current=\{item\.id === activeView \? "page" : undefined\}/);
  assert.match(ui, /className=\{`\$\{styles\.bottomNav\} \$\{polish\.fastNav\}`\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.shell\{width:min\(calc\(100% - 40px\),1440px\)/);
  assert.match(css, /\.desktopNav\{display:none\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.desktopNav\{[\s\S]*display:flex/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.bottomNav\{display:none\}/);
});

test("phase two desktop shell keeps each main view inside an intentional content width", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const css = await read("app/snooker/snooker-data-center.module.css");

  assert.match(ui, /styles\.contentHome/);
  assert.match(ui, /styles\.contentMatches/);
  assert.match(ui, /styles\.contentPlayers/);
  assert.match(ui, /styles\.contentData/);
  assert.match(css, /\.content\{width:min\(100%,1280px\)/);
  assert.match(css, /\.contentHome\{max-width:1040px\}/);
  assert.match(css, /\.contentMatches,\.contentPlayers,\.contentData\{max-width:1220px\}/);
});

test("technical leaderboard is a desktop table pilot while mobile keeps the compact list", async () => {
  const technical = await read("app/snooker/data/data-technical-content.tsx");
  const css = await read("app/snooker/data/data.module.css");

  assert.match(technical, /<span>\{list\.shortLabelZh\}<\/span><small>\{list\.labelEn\}<\/small>/);
  assert.match(technical, /className=\{styles\.technicalMatchesHeader\}>场次/);
  assert.match(technical, /className=\{styles\.technicalMatches\}>\{row\.matchesPlayed \?\? "—"\}/);
  assert.match(css, /\.technicalMatchesHeader,\.technicalMatches,\.technicalArrowHeader\{display:none\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.detailContent\{display:grid;grid-template-columns:250px minmax\(0,1fr\)/);
  assert.match(css, /\.technicalMetricNav button small\{display:block/);
  assert.match(css, /\.technicalMatches\{display:block!important/);
  assert.match(css, /\.technicalRankingList button:nth-child\(-n\+3\)>strong/);
});
