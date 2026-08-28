import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync("app/snooker/home-portal-target.ts", "utf8");
const leaders = fs.readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const about = fs.readFileSync("app/snooker/home-about-card.tsx", "utf8");

test("homepage portals require the actual active bottom navigation item to be 首页", () => {
  assert.match(helper, /activeMainNavLabel\(nav\) !== "首页"/);
  assert.match(helper, /return null/);
  assert.match(helper, /previousElementSibling/);
});

test("both homepage-only modules share the same guarded portal target", () => {
  assert.match(leaders, /findHomepagePortalTarget/);
  assert.match(about, /findHomepagePortalTarget/);
  assert.doesNotMatch(leaders, /isHomeUrl|homeActive/);
  assert.doesNotMatch(about, /isHomeUrl|homeActive/);
});

test("portal lifecycle resynchronizes after root view and history changes", () => {
  for (const source of [leaders, about]) {
    assert.match(source, /new MutationObserver\(sync\)/);
    assert.match(source, /snooker-view-url-change/);
    assert.match(source, /popstate/);
  }
});
