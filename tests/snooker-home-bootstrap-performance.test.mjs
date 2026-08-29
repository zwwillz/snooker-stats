import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const bootstrap = readFileSync("lib/snooker/home-bootstrap.ts", "utf8");
const bootstrapV3 = readFileSync("lib/snooker/home-bootstrap-v3.ts", "utf8");
const leaders = readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const about = readFileSync("app/snooker/home-about-card.tsx", "utf8");
const extras = readFileSync("app/snooker/home-extras.tsx", "utf8");
const compare = readFileSync("app/snooker/compare/player-compare-teaser.tsx", "utf8");
const comparePage = readFileSync("app/snooker/compare/page.tsx", "utf8");
const compareDeferred = readFileSync("app/snooker/compare/player-compare-deferred.tsx", "utf8");
const compareLoading = readFileSync("app/snooker/compare/loading.tsx", "utf8");
const gate = readFileSync("app/snooker/live-striker-indicator-gated.tsx", "utf8");
const striker = readFileSync("app/snooker/live-striker-indicator.tsx", "utf8");
const urlSync = readFileSync("app/snooker/snooker-view-url-sync.tsx", "utf8");

test("homepage uses the V3 lightweight bootstrap while deep views keep the full loaders", () => {
  assert.match(page, /loadSnookerHomeBootstrapV3/);
  assert.match(page, /useHomeBootstrap/);
  assert.match(page, /loadSnookerDatabaseViewV2/);
  assert.match(page, /loadSnookerRankingHub/);
  assert.match(page, /initialPlayerCompare=\{bootstrapCompare\}/);
});

test("base home bootstrap scopes event detail and ranking payloads", () => {
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

test("homepage player compare is server-prefilled from bounded aggregate queries", () => {
  assert.match(bootstrapV3, /snooker_player_season_aggregates/);
  assert.match(bootstrapV3, /snooker_player_h2h_aggregates/);
  assert.doesNotMatch(bootstrapV3, /snooker_player_career_aggregates/);
  assert.doesNotMatch(bootstrapV3, /snooker_matches\?/);
  assert.doesNotMatch(compare, /IntersectionObserver/);
  assert.match(compare, /variant !== "data"/);
  assert.doesNotMatch(compare, /prefetch=\{false\}/);
});

test("fixed homepage cards render directly without portals or body observers", () => {
  assert.match(page, /<HomeExtras leaders=\{homeLeaders\} \/>/);
  assert.match(extras, /<HomeSeasonLeaders initialPayload=\{leaders\} \/>/);
  assert.match(extras, /<HomeAboutCard \/>/);
  assert.doesNotMatch(leaders, /createPortal|MutationObserver|findHomepagePortalTarget/);
  assert.doesNotMatch(about, /createPortal|MutationObserver|findHomepagePortalTarget/);
});

test("player compare route switches to a loading shell before the full payload finishes", () => {
  assert.match(comparePage, /PlayerCompareDeferred/);
  assert.doesNotMatch(comparePage, /loadPlayerCompare/);
  assert.match(compareDeferred, /\/api\/snooker\/v1\/player-compare/);
  assert.match(compareLoading, /PlayerCompareLoadingShell/);
});

test("live striker keeps 30 second refresh without body MutationObservers", () => {
  assert.match(page, /LiveStrikerIndicatorGated/);
  assert.match(gate, /matchDetailVisible/);
  assert.doesNotMatch(gate, /MutationObserver/);
  assert.doesNotMatch(striker, /MutationObserver/);
  assert.match(striker, /\/api\/snooker\/v1\/dashboard/);
  assert.match(striker, /30_000/);
});

test("homepage navigation can start a server view transition before main hydration", () => {
  assert.match(urlSync, /router\.push\(rootUrl\(view\)\)/);
  assert.match(urlSync, /serverLoadData && view !== "home"/);
  assert.match(urlSync, /stopImmediatePropagation\(\)/);
  assert.match(urlSync, /setNavigating\(true\)/);
});
