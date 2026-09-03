import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web detail pages share the same 1120 pixel canvas as the site header", async () => {
  const [ui, priority] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);

  assert.match(priority, /\.eventDetailShell,\.matchDetailShell,\.playerDetailShell\{width:min\(1120px,calc\(100% - 40px\)\)!important/);
  assert.doesNotMatch(priority, /width:min\(1280px,calc\(100% - 48px\)\)!important/);
  assert.match(ui, /styles\.detailShell\} \$\{priority\.playerDetailShell/);
});

test("web player directory uses a left filter rail, sticky search, and one-column list", async () => {
  const [directory, css] = await Promise.all([
    read("app/snooker/players/player-directory.tsx"),
    read("app/snooker/players/player.module.css"),
  ]);

  assert.match(css, /PLAYER_WEB_LAYOUT_V1/);
  assert.match(css, /@media \(min-width:1024px\)\{[\s\S]*?\.pageIntro h1\{margin-top:7px;font-size:42px\}/);
  assert.match(directory, /className=\{styles\.directorySidebar\}/);
  assert.match(directory, /searchStuck \? styles\.searchBoxStuck/);
  assert.match(css, /\.directoryLayout\{display:grid;grid-template-columns:200px minmax\(0,1fr\)/);
  assert.match(css, /\.searchBox\{position:sticky;top:var\(--snooker-header-height,64px\)/);
  assert.match(css, /\.searchBoxStuck\{border-radius:0!important\}/);
  assert.match(css, /\.playerDirectory\{display:block;overflow:visible\}/);
  assert.match(css, /\.rowMain b\{font-size:15px/);
});

test("web player detail keeps compare below trend and profile/history on full rows", async () => {
  const [css, detailCss, content, inline] = await Promise.all([
    read("app/snooker/players/player.module.css"),
    read("app/snooker/players/player-detail-refresh.module.css"),
    read("app/snooker/players/player-detail-content.tsx"),
    read("app/snooker/players/player-detail-inline.tsx"),
  ]);

  assert.match(css, /\.content\{width:100%;margin:0 auto;padding:0 0 42px;display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css, /\.content>\.card:has\(\.careerGrid\)\{grid-column:1\/7\}/);
  assert.match(css, /\.content>\.card:has\(\.tripleGrid\)\{grid-column:7\/-1\}/);
  assert.doesNotMatch(css, /\.card:has\(\.bioText\)\{grid-column:1\/7\}/);
  assert.doesNotMatch(css, /\.card:has\(\.timeline\)\{grid-column:7\/-1\}/);
  assert.ok(content.indexOf("{compareAction}") > content.indexOf("{activeTrend ? ("));
  assert.ok(content.indexOf("{compareAction}") < content.indexOf("<small>PROFILE</small>"));
  assert.ok(content.indexOf("<small>CAREER HISTORY</small>") > content.indexOf("<small>PROFILE</small>"));
  assert.match(inline, /<PlayerDetailContent player=\{player\} compareAction=\{compareAction\}/);
  assert.match(detailCss, /@media \(min-width:1024px\)\{[\s\S]*?\.heroCompact\{min-height:360px!important\}/);
  assert.match(css, /@media \(max-width:767px\)\{/);
});
