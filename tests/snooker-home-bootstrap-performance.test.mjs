import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const bootstrap = readFileSync("lib/snooker/home-bootstrap.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260829233500_add_homepage_bootstrap_v1.sql", "utf8");
const leaders = readFileSync("app/snooker/home-season-leaders.tsx", "utf8");
const compare = readFileSync("app/snooker/compare/player-compare-teaser.tsx", "utf8");
const ui = readFileSync("app/snooker/snooker-data-center-v2.tsx", "utf8");

test("homepage uses a dedicated bootstrap while deep views keep the full loaders", () => {
  assert.match(page, /loadSnookerHomeBootstrap/);
  assert.match(page, /useHomeBootstrap/);
  assert.match(page, /loadSnookerDatabaseViewV2/);
  assert.match(page, /loadSnookerRankingHub/);
  assert.match(page, /if \(useHomeBootstrap\)[\s\S]*?loadSnookerHomeBootstrap\(\)[\s\S]*?else[\s\S]*?loadSnookerDatabaseViewV2\(\)/);
});

test("home bootstrap is one bounded RPC instead of a REST waterfall or full player directory", () => {
  assert.match(bootstrap, /rpc\/snooker_homepage_bootstrap_v1/);
  assert.match(bootstrap, /cache: "force-cache"/);
  assert.doesNotMatch(bootstrap, /snooker_public_players\?select=/);
  assert.doesNotMatch(bootstrap, /Promise\.all\(\[/);
  assert.match(migration, /create or replace function public\.snooker_homepage_bootstrap_v1/);
  assert.match(migration, /from public\.snooker_latest_rankings where list_key='world_official' order by rank asc limit 16/);
  assert.match(migration, /jsonb_build_object\([\s\S]*?'events'/);
  assert.match(migration, /'players'/);
  assert.match(migration, /'matches'/);
  assert.match(migration, /'leaders'/);
  assert.match(migration, /'compare_season'/);
  assert.match(migration, /'h2h'/);
});

test("season leaders are selected inside the single homepage RPC with bounded top-one subqueries", () => {
  assert.match(migration, /order by s\.season_147s desc[\s\S]*?limit 1/);
  assert.match(migration, /order by s\.breaks_100_plus desc[\s\S]*?limit 1/);
  assert.match(migration, /s\.matches_played>=5[\s\S]*?order by s\.match_win_rate desc[\s\S]*?limit 1/);
  assert.match(migration, /s\.average_shot_time>0[\s\S]*?order by s\.average_shot_time asc[\s\S]*?limit 1/);
});

test("homepage avoids normal compare refetches while recovering an absent bootstrap comparison", () => {
  assert.doesNotMatch(leaders, /setTimeout|\/api\/snooker\/v1\/technical|MutationObserver|createPortal/);
  assert.doesNotMatch(compare, /IntersectionObserver/);
  assert.match(compare, /if \(hasUsableInitialData \|\| !leftSlug \|\| !rightSlug\) return/);
  assert.match(compare, /\/api\/snooker\/v1\/player-compare\?player1=/);
  assert.match(compare, /attempt === 0/);
  assert.match(compare, /const data = hasUsableInitialData \? initialData : matchesRecoveredPair \? recoveredData : null/);
  assert.match(compare, /prefetch=\{false\}/);
});

test("home event and match detail stay summary-first and hydrate full detail only after entry", () => {
  assert.match(bootstrap, /detailPartial: true/);
  assert.match(ui, /existing && !existing\.detailPartial/);
  assert.match(ui, /const openMatch = \(matchId: string, eventSlug: string\) => \{[\s\S]*?const nextDetail: DetailState = \{ type: "match", matchId, eventSlug \};[\s\S]*?void ensureEventDetail\(eventSlug\);[\s\S]*?setDetail\(nextDetail\)/);
});

test("live striker state renders inside match detail without a second dashboard poller", () => {
  assert.doesNotMatch(page, /LiveStrikerIndicator/);
  assert.match(ui, /match\.currentPlayerSide === "home"/);
  assert.match(ui, /match\.currentPlayerSide === "away"/);
  assert.match(ui, /liveIndicator\.strikerDot/);
  assert.equal(existsSync("app/snooker/live-striker-indicator-gated.tsx"), false);
  assert.equal(existsSync("app/snooker/live-striker-indicator.tsx"), false);
});
