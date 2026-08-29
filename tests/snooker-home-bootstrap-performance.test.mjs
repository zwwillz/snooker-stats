import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const bootstrap = readFileSync("lib/snooker/home-bootstrap.ts", "utf8");
const bootstrapV3 = readFileSync("lib/snooker/home-bootstrap-v3.ts", "utf8");
const homeLive = readFileSync("lib/snooker/home-live-read-through.ts", "utf8");
const leaders = readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const about = readFileSync("app/snooker/home-about-card.tsx", "utf8");
const extras = readFileSync("app/snooker/home-extras.tsx", "utf8");
const compare = readFileSync("app/snooker/compare/player-compare-teaser.tsx", "utf8");
const comparePage = readFileSync("app/snooker/compare/page.tsx", "utf8");
const compareDeferred = readFileSync("app/snooker/compare/player-compare-deferred.tsx", "utf8");
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

test("homepage player compare runs in parallel with the base bootstrap and uses resilient bounded aggregates", () => {
  assert.match(bootstrapV3, /Promise\.all\(\[\s*loadSnookerHomeBootstrap\(\),\s*loadHomePlayerCompare\(\)/);
  assert.match(bootstrapV3, /snooker_latest_rankings\?select=player_id,rank/);
  assert.match(bootstrapV3, /snooker_player_season_aggregates/);
  assert.match(bootstrapV3, /snooker_player_h2h_aggregates/);
  assert.match(bootstrapV3, /player_low_id=eq\.\$\{lowUuid\}&player_high_id=eq\.\$\{highUuid\}/);
  assert.match(bootstrapV3, /\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(bootstrapV3, /snooker_player_career_aggregates/);
  assert.doesNotMatch(bootstrapV3, /snooker_matches\?/);
  assert.doesNotMatch(compare, /IntersectionObserver/);
  assert.match(compare, /variant !== "data"/);
});

test("homepage live correction reads only score and status, not frames or match statistics", () => {
  assert.match(page, /refreshSnookerHomeLiveScore/);
  assert.match(page, /useHomeBootstrap[\s\S]*refreshSnookerHomeLiveScore\(cachedDatabase\)[\s\S]*refreshSnookerDatabaseViewLive\(cachedDatabase\)/);
  assert.match(homeLive, /cache: "no-store"/);
  assert.match(homeLive, /snooker_matches\?select=/);
  assert.doesNotMatch(homeLive, /snooker_frames|snooker_match_statistics/);
});

test("homepage links do not automatically prefetch expensive routes", () => {
  assert.match(compare, /prefetch=\{false\}/);
  assert.doesNotMatch(compare, /onPointerDown=\{warmCompare\}/);
  assert.match(about, /prefetch=\{false\}/);
});

test("fixed homepage cards render directly and hide from client detail views", () => {
  assert.match(page, /<HomeExtras leaders=\{homeLeaders\} \/>/);
  assert.match(extras, /<HomeSeasonLeaders initialPayload=\{leaders\} \/>/);
  assert.match(extras, /<HomeAboutCard \/>/);
  assert.match(extras, /dataStyles\.detailShell/);
  assert.match(extras, /document\.addEventListener\("click", scheduleSync, true\)/);
  assert.doesNotMatch(leaders, /createPortal|MutationObserver|findHomepagePortalTarget/);
  assert.doesNotMatch(about, /createPortal|MutationObserver|findHomepagePortalTarget/);
  assert.doesNotMatch(extras, /MutationObserver/);
});

test("player compare uses one stable in-page loading shell without a route loading flash", () => {
  assert.match(comparePage, /PlayerCompareDeferred/);
  assert.doesNotMatch(comparePage, /loadPlayerCompare/);
  assert.match(compareDeferred, /\/api\/snooker\/v1\/player-compare/);
  assert.equal(existsSync("app/snooker/compare/loading.tsx"), false);
});

test("live striker keeps 30 second refresh without body MutationObservers", () => {
  assert.match(page, /LiveStrikerIndicatorGated/);
  assert.match(gate, /matchDetailVisible/);
  assert.doesNotMatch(gate, /MutationObserver/);
  assert.doesNotMatch(striker, /MutationObserver/);
  assert.match(striker, /\/api\/snooker\/v1\/dashboard/);
  assert.match(striker, /30_000/);
});

test("homepage navigation stays client-local and never blocks on a server route", () => {
  assert.match(urlSync, /window\.history\.replaceState/);
  assert.match(urlSync, /snooker-view-url-change/);
  assert.doesNotMatch(urlSync, /useRouter|router\.push|stopImmediatePropagation|setNavigating/);
  assert.match(page, /<SnookerViewUrlSync \/>/);
});
