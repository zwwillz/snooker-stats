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

test("technical leaderboard uses one page scroll with an opaque real sticky gap", async () => {
  const technical = await read("app/snooker/data/data-technical-content.tsx");
  const css = await read("app/snooker/data/technical-detail.module.css");
  const shellCss = await read("app/snooker/snooker-data-center.module.css");

  assert.match(technical, /<span>\{list\.shortLabelZh\}<\/span><small>\{list\.labelEn\}<\/small>/);
  assert.match(technical, /className=\{detailStyles\.technicalMatchesHeader\}>场次/);
  assert.match(technical, /className=\{detailStyles\.technicalMatches\}>\{row\.matchesPlayed \?\? "—"\}/);
  assert.match(css, /\.technicalMatchesHeader,\.technicalMatches,\.technicalArrowHeader\{display:none\}/);
  assert.match(css, /\.technicalMobileHeader[\s\S]*grid-template-columns:48px minmax\(0,1fr\) 48px/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.detailContent\{[\s\S]*grid-template-columns:230px minmax\(0,1fr\);[\s\S]*align-items:start/);
  assert.doesNotMatch(css, /\.detailContent\{[^}]*position:sticky/);
  assert.doesNotMatch(css, /\.detailContent\{[^}]*height:calc\(100dvh/);
  assert.match(technical, /className=\{detailStyles\.technicalStickyGap\}\s+aria-hidden="true"/);
  assert.match(technical, /className=\{detailStyles\.technicalTableSticky\}/);
  assert.match(technical, /className=\{detailStyles\.technicalTableBody\}/);
  assert.match(css, /\.technicalSidebar\{[\s\S]*position:sticky;[\s\S]*top:var\(--snooker-header-height,64px\)/);
  assert.match(css, /\.technicalStickyGap\{[\s\S]*height:var\(--technical-workspace-gap\);[\s\S]*background:var\(--bg\)/);
  assert.match(css, /\.technicalTableSticky\{[\s\S]*position:sticky;[\s\S]*top:var\(--snooker-header-height,64px\);[\s\S]*z-index:4/);
  assert.match(css, /\.technicalTableHeader\{[\s\S]*position:static;[\s\S]*background:#fff/);
  assert.match(css, /\.technicalTableBody\{[\s\S]*overflow:hidden;[\s\S]*border-top:0;[\s\S]*background:#fff/);
  assert.doesNotMatch(technical, /tableScrollRef|technicalTableScroll/);
  assert.doesNotMatch(css, /\.technicalTableScroll/);
  assert.doesNotMatch(css, /overflow-y:auto|scrollbar-gutter:stable/);
  assert.match(css, /\.technicalTablePanel\{[\s\S]*overflow:visible;[\s\S]*background:transparent/);
  assert.doesNotMatch(technical, /technicalStickyGutter/);
  assert.doesNotMatch(technical, /technicalTableStickyHead/);
  assert.doesNotMatch(css, /technicalStickyGutter|technicalTableStickyHead|\.technicalPage::before/);
  assert.match(css, /\.technicalMetricNav button small\{[\s\S]*display:block/);
  assert.match(css, /\.technicalMatches\{[\s\S]*display:block!important/);
  assert.match(css, /\.technicalRankingList button:nth-child\(-n\+3\)>strong/);
  assert.match(technical, /className=\{detailStyles\.technicalMobileHeader\}/);
  assert.match(technical, /aria-label="返回数据"/);
  assert.match(technical, /<strong>本赛季球员技术榜<\/strong>\s*<span>DATA<\/span>/);
  assert.match(technical, /className=\{detailStyles\.technicalDesktopIntro\}/);
  assert.match(technical, /<h1>本赛季球员技术榜<\/h1>/);
  assert.match(technical, /className=\{detailStyles\.technicalDesktopBack\}/);
  assert.match(css, /\.technicalDesktopBack\{display:none\}/);
  assert.match(css, /@media \(min-width:1024px\)[\s\S]*\.technicalMobileHeader\{display:none\}/);
  assert.match(css, /\.technicalDesktopIntro\{[\s\S]*margin-bottom:2px;[\s\S]*padding:24px 2px 0/);
  assert.match(technical, /data-technical-detail="true"/);
  assert.match(shellCss, /\.contentData:has\(\[data-technical-detail\]\)>\.dataStatus\{display:none\}/);
  assert.match(shellCss, /@media \(max-width:1023px\)[\s\S]*\.shell:has\(\[data-technical-detail\]\)>\.header,[\s\S]*\.bottomNav,[\s\S]*\.buildMark\{display:none\}/);
  assert.match(shellCss, /\.contentData:has\(\[data-technical-detail\]\)\{width:100%;max-width:none;margin:0;padding:0;gap:0\}/);
  assert.doesNotMatch(technical, />‹<\/span> 返回数据/);
});

test("main navigation always exits nested data views", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const data = await read("app/snooker/data/data-ranking-content.tsx");

  assert.match(ui, /window\.dispatchEvent\(new Event\("snooker:root-navigation"\)\)/);
  assert.match(data, /window\.addEventListener\("snooker:root-navigation", syncTechnicalFromUrl\)/);
  assert.match(data, /window\.addEventListener\("snooker:root-navigation", syncHonoursFromUrl\)/);
});
