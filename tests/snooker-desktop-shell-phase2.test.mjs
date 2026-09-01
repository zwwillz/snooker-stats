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
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.shell\{width:100%/);
  assert.match(css, /\.appRoot\{--snooker-header-height:64px/);
  assert.match(css, /\.header\{height:var\(--snooker-header-height\);padding:0 max\(20px,calc\(\(100% - 1120px\)\/2\)\)/);
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
  assert.match(css, /\.content\{width:min\(1120px,calc\(100% - 40px\)\)/);
  assert.match(css, /\.contentHome,\.contentMatches,\.contentPlayers,\.contentData\{max-width:none\}/);
});

test("technical leaderboard is a desktop table pilot while mobile keeps the compact list", async () => {
  const technical = await read("app/snooker/data/data-technical-content.tsx");
  const css = await read("app/snooker/data/data.module.css");
  const shellCss = await read("app/snooker/snooker-data-center.module.css");

  assert.match(technical, /<span>\{list\.shortLabelZh\}<\/span><small>\{list\.labelEn\}<\/small>/);
  assert.match(technical, /className=\{styles\.technicalMatchesHeader\}>场次/);
  assert.match(technical, /className=\{styles\.technicalMatches\}>\{row\.matchesPlayed \?\? "—"\}/);
  assert.match(css, /\.technicalMatchesHeader,\.technicalMatches,\.technicalArrowHeader\{display:none\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.detailContent\{display:grid;grid-template-columns:230px minmax\(0,1fr\)/);
  assert.match(css, /\.technicalPageHeader/);
  assert.doesNotMatch(technical, /TechnicalDetailOverlay/);
  assert.match(css, /\.technicalMetricNav button small\{display:block/);
  assert.match(css, /\.technicalMatches\{display:block!important/);
  assert.match(css, /\.technicalRankingList button:nth-child\(-n\+3\)>strong/);
  assert.match(technical, /<h1 id="technical-page-title">本赛季球员技术榜<\/h1>/);
  assert.match(technical, /className=\{styles\.technicalDesktopBack\}/);
  assert.match(technical, /className=\{styles\.technicalTableStickyHead\}/);
  assert.match(css, /\.technicalDesktopBack\{display:none\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.technicalMobileBack\{display:none\}/);
  assert.doesNotMatch(css, /\.technicalPage::before/);
  assert.match(css, /\.technicalSidebar\{position:sticky;top:calc\(var\(--snooker-header-height,68px\) \+ 18px\)/);
  assert.match(css, /\.technicalTableStickyHead\{position:sticky;top:var\(--snooker-header-height,68px\);z-index:2;margin:-18px -18px 0;padding:18px 0 0;background:#f3f5f4\}/);
  assert.match(css, /\.technicalTableHeader\{grid-template-columns:[^}]+border-radius:20px 20px 0 0/);
  assert.doesNotMatch(css, /\.technicalTableHeader\{position:sticky/);
  assert.doesNotMatch(css, /\.technicalTableHeader::before/);
  assert.match(technical, /data-technical-detail="true"/);
  assert.match(shellCss, /\.contentData:has\(\[data-technical-detail\]\)>\.dataStatus\{display:none\}/);
});

test("main navigation always exits nested data views", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const data = await read("app/snooker/data/data-ranking-content.tsx");

  assert.match(ui, /window\.dispatchEvent\(new Event\("snooker:root-navigation"\)\)/);
  assert.match(data, /window\.addEventListener\("snooker:root-navigation", syncTechnicalFromUrl\)/);
  assert.match(data, /window\.addEventListener\("snooker:root-navigation", syncHonoursFromUrl\)/);
});
