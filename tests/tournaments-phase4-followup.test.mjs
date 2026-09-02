import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("tournament detail uses stable tabs-only sticky behavior", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);
  assert.doesNotMatch(ui, /eventHeaderCompact/);
  assert.doesNotMatch(ui, /data-event-header-state/);
  assert.match(css, /TOURNAMENTS_PHASE4_FOLLOWUP_V1/);
  assert.match(css, /\.eventDetailTabs\{position:sticky!important;top:var\(--snooker-header-height\)!important/);
});

test("secondary and tertiary tournament pages restore mobile back controls and web width", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);
  assert.match(ui, /aria-label="返回上一页"/);
  assert.match(css, /\.eventDetailShell,\.matchDetailShell,\.playerDetailShell\{width:min\(1120px,calc\(100% - 40px\)\)!important/);
  assert.match(css, /\.eventScheduleStack\{margin-left:0!important;margin-right:0!important\}/);
  assert.match(css, /\.matchDetailBody,\.matchDetailBodyWithData\{margin-left:0!important;margin-right:0!important\}/);
});

test("detail website navigation selects players only on player details", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const shared = await read("app/snooker/public-site-header.tsx");
  const start = ui.indexOf("const detailSiteHeader");
  const end = ui.indexOf("if (detail?.type === \"player\")", start);
  const header = ui.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(header, /selectedView\?: NavId/);
  assert.match(header, /<PublicSiteHeader active=\{selectedView \?\? null\}/);
  assert.match(shared, /aria-current=\{active === item\.id \? "page" : undefined\}/);
  assert.match(ui, /detailSiteHeader\("players"\)/);
  assert.ok((ui.match(/detailSiteHeader\(\)/g) ?? []).length >= 4);
  assert.doesNotMatch(ui, /detailSiteHeader\("matches"\)/);
});
