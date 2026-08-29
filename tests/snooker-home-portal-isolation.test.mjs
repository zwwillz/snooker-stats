import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("app/page.tsx", "utf8");
const extras = fs.readFileSync("app/snooker/home-extras.tsx", "utf8");
const leaders = fs.readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const about = fs.readFileSync("app/snooker/home-about-card.tsx", "utf8");

test("homepage-only extras are mounted only by the lightweight home bootstrap", () => {
  assert.match(page, /useHomeBootstrap \? <HomeExtras leaders=\{homeLeaders\} \/> : null/);
  assert.match(extras, /function isHomepage\(\)/);
  assert.match(extras, /view && view !== "home"/);
  assert.match(extras, /params\.has\("player"\)/);
  assert.match(extras, /dataStyles\.detailShell/);
});

test("season leaders and about card render directly without portal infrastructure", () => {
  assert.match(extras, /<HomeSeasonLeaders initialPayload=\{leaders\} \/>/);
  assert.match(extras, /<HomeAboutCard \/>/);
  for (const source of [leaders, about]) {
    assert.doesNotMatch(source, /createPortal|findHomepagePortalTarget|MutationObserver/);
  }
});

test("homepage extras follow local root/detail changes without observing the body", () => {
  assert.match(extras, /snooker-view-url-change/);
  assert.match(extras, /popstate/);
  assert.match(extras, /document\.addEventListener\("click", scheduleSync, true\)/);
  assert.doesNotMatch(extras, /MutationObserver/);
});
