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
});

test("detail website navigation does not keep a root item selected", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const start = ui.indexOf("const detailSiteHeader");
  const end = ui.indexOf("if (detail?.type === \"player\")", start);
  const header = ui.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(header, /desktopNavActive/);
  assert.doesNotMatch(header, /aria-current=/);
});
