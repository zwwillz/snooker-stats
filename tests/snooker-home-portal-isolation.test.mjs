import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ui = fs.readFileSync("app/snooker/snooker-data-center-v2.tsx", "utf8");
const leaders = fs.readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const about = fs.readFileSync("app/snooker/home-about-card.tsx", "utf8");

test("homepage-only modules are native children of the home React branch", () => {
  assert.match(ui, /activeView === "home" \? <>[\s\S]*?<HomeSeasonLeaders[\s\S]*?<HomeAboutCard \/>[\s\S]*?<\/> : null/);
});

test("homepage-only modules do not depend on portals or DOM view discovery", () => {
  for (const source of [leaders, about]) {
    assert.doesNotMatch(source, /findHomepagePortalTarget|createPortal|MutationObserver|querySelector|snooker-view-url-change/);
  }
});

test("home cards disappear and return with the root home state", () => {
  assert.match(ui, /activeView === "home" \? <>/);
  assert.match(ui, /activeView !== "home" \? <div className=\{styles\.dataStatus\}/);
});
