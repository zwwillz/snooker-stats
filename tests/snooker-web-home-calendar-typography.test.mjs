import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web homepage cards keep primary player names at or above mobile size", async () => {
  const [core, polish, leaders] = await Promise.all([
    read("app/snooker/snooker-data-center.module.css"),
    read("app/snooker/snooker-ui-polish.module.css"),
    read("app/snooker/home-season-leaders.module.css"),
  ]);

  assert.match(core, /WEB_HOME_TYPOGRAPHY_V1[\s\S]*@media \(min-width:1024px\)[\s\S]*\.nextEvent strong\{font-size:15px\}[\s\S]*\.chinaTopGrid strong\{font-size:14px\}/);
  assert.match(polish, /WEB_HOME_TYPOGRAPHY_V1[\s\S]*@media \(min-width:1024px\)[\s\S]*\.homePlayerName\{[^}]*font-size:14px!important\}[\s\S]*\.rankingStaticRow>span b\{font-size:14px\}/);
  assert.match(leaders, /@media \(min-width:1024px\)[\s\S]*\.player strong\{font-size:14px\}[\s\S]*\.player small\{font-size:11px\}/);
});

test("web season calendar uses readable event, metadata, and sticky header type", async () => {
  const priority = await read("app/snooker/snooker-priority.module.css");

  assert.match(priority, /\.eventTableHead\{[^}]*font-size:10px/);
  assert.match(priority, /calendarList[^}]*>strong\{[^}]*font-size:16px/);
  assert.match(priority, /calendarList[^}]*>small\{[^}]*font-size:11px/);
  assert.match(priority, /calendarList[^}]*>p\{[^}]*font-size:12px/);
  assert.match(priority, /calendarDate[^}]*\) b\{font-size:14px\}/);
  assert.match(priority, /calendarDate[^}]*\) small\{[^}]*font-size:10px\}/);
});

test("the ten pixel historical season control stays isolated from homepage and calendar typography", async () => {
  const priority = await read("app/snooker/snooker-priority.module.css");

  assert.match(priority, /\.seasonSelector>\.seasonMoreButton\{[^}]*font-size:10px!important/);
  assert.doesNotMatch(priority, /\.seasonMoreButton[^}]*\}[\s\S]{0,80}(?:\.eventTableHead|calendarList|homePlayerName)/);
});
