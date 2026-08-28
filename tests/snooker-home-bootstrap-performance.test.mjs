import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const bootstrap = readFileSync("lib/snooker/home-bootstrap.ts", "utf8");
const leaders = readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const compare = readFileSync("app/snooker/compare/player-compare-teaser.tsx", "utf8");
const gate = readFileSync("app/snooker/live-striker-indicator-gated.tsx", "utf8");

test("homepage uses a dedicated bootstrap while deep views keep the full loaders", () => {
  assert.match(page, /loadSnookerHomeBootstrap/);
  assert.match(page, /useHomeBootstrap/);
  assert.match(page, /loadSnookerDatabaseViewV2/);
  assert.match(page, /loadSnookerRankingHub/);
});

test("home bootstrap scopes event detail and ranking payloads", () => {
  assert.match(bootstrap, /focusedRows\(eventRows\)/);
  assert.match(bootstrap, /list_key=eq\.world_official/);
  assert.match(bootstrap, /limit=16/);
  assert.doesNotMatch(bootstrap, /snooker_event_series/);
  assert.doesNotMatch(bootstrap, /snooker_event_prizes/);
  assert.doesNotMatch(bootstrap, /snooker_match_head_to_head/);
});

test("season leaders are four bounded top-one queries rather than a full season scan", () => {
  const limits = bootstrap.match(/&limit=1`/g) ?? [];
  assert.equal(limits.length, 4);
  assert.match(bootstrap, /season_147s=gt\.0/);
  assert.match(bootstrap, /matches_played=gte\.5&match_win_rate=not\.is\.null/);
  assert.match(bootstrap, /matches_played=gte\.5&average_shot_time=gt\.0/);
});

test("homepage no longer prewarms technical and compare is viewport deferred", () => {
  assert.doesNotMatch(leaders, /setTimeout|\/api\/snooker\/v1\/technical/);
  assert.match(compare, /IntersectionObserver/);
  assert.match(compare, /prefetch=\{false\}/);
});

test("live striker dashboard enhancer is gated behind a visible match detail", () => {
  assert.match(page, /LiveStrikerIndicatorGated/);
  assert.match(gate, /matchDetailVisible/);
  assert.match(gate, /return active \? <LiveStrikerIndicator \/> : null/);
});
