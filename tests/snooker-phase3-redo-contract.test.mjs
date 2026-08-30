import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const ui = read("app/snooker/snooker-data-center-v2.tsx");
const page = read("app/page.tsx");
const urlSync = read("app/snooker/snooker-view-url-sync.tsx");
const bootstrap = read("lib/snooker/home-bootstrap.ts");
const leaders = read("app/snooker/home-season-leaders.tsx");
const about = read("app/snooker/home-about-card.tsx");
const teaser = read("app/snooker/compare/player-compare-teaser.tsx");
const comparePage = read("app/snooker/compare/page.tsx");
const dataHub = read("app/snooker/data/data-ranking-content.tsx");
const playerDirectoryRoute = read("app/api/snooker/v1/player-directory/route.ts");
const rankingHubRoute = read("app/api/snooker/v1/ranking-hub/route.ts");
const homeLiveRoute = read("app/api/snooker/v1/home-live/route.ts");
const homeLiveOverlay = read("lib/snooker/home-live-overlay.ts");

test("brand identity is real React source rather than a homepage-only DOM or CSS disguise", () => {
  assert.match(ui, /<strong>147数据局<\/strong><small>中文斯诺克数据平台 · CN SNOOKER STATS<\/small>/);
  assert.doesNotMatch(ui, /世界斯诺克数据中心|WORLD SNOOKER DATA|DATA v0\.9/);
  for (const source of [leaders, about]) {
    assert.doesNotMatch(source, /MutationObserver|createPortal|querySelector|findHomepagePortalTarget|findMainNav/);
  }
});

test("home-only cards live inside the real home React branch and homepage update status is absent", () => {
  assert.match(ui, /activeView === "home" \? <>[\s\S]*?<HomeSeasonLeaders initialPayload=\{initialHomeLeaders\} onOpenMetric=\{openTechnicalFromHome\} \/>[\s\S]*?<HomeAboutCard \/>[\s\S]*?<\/> : null/);
  assert.match(ui, /activeView !== "home" \? <div className=\{styles\.dataStatus\} role="status">/);
  assert.doesNotMatch(page, /HomeExtras|<HomeSeasonLeaders|<HomeAboutCard/);
});

test("homepage bootstrap is one RPC and no longer requests the entire public player table", () => {
  assert.match(bootstrap, /rpc\/snooker_homepage_bootstrap_v1/);
  assert.match(bootstrap, /cache: "force-cache"/);
  assert.doesNotMatch(bootstrap, /snooker_public_players\?select=/);
  assert.doesNotMatch(bootstrap, /Promise\.all\(\[\s*rest<DbEvent/);
});

test("homepage failure serves last success or the stale-capable V2 loader before any static fallback", () => {
  assert.match(bootstrap, /if \(previous && previous\.staleUntil > Date\.now\(\)\)[\s\S]*?return previous\.value/);
  assert.match(bootstrap, /const database = await loadSnookerDatabaseViewV2\(\)/);
  assert.doesNotMatch(bootstrap, /catch \(error\)[\s\S]{0,500}snapshot: dashboardSnapshot/);
});

test("home SSR no longer waits for live read-through and root navigation is not converted to a hard reload", () => {
  assert.doesNotMatch(page, /useHomeBootstrap\s*\?\s*await refreshSnookerDatabaseViewLive/);
  assert.match(page, /if \(useHomeBootstrap\) \{[\s\S]*?loadSnookerHomeBootstrap\(\)[\s\S]*?\} else \{[\s\S]*?refreshSnookerDatabaseViewLive/);
  assert.match(page, /<SnookerViewUrlSync \/>/);
  assert.doesNotMatch(page, /serverLoadData/);
  assert.match(ui, /if \(!shouldPollLive\) return;\s*const firstRefreshFrame = window\.requestAnimationFrame\(\(\) => void refresh\(\)\);\s*const timer = window\.setInterval/);
  assert.match(ui, /window\.cancelAnimationFrame\(firstRefreshFrame\)/);
  assert.doesNotMatch(urlSync, /router\.push|router\.replace/);
});

test("live polling uses a score-only overlay outside match detail and keeps full dashboard reads detail-only", () => {
  const detailBranch = ui.indexOf('if (liveRefreshState.current.detailType === "match")');
  const dashboardFetch = ui.indexOf('fetch("/api/snooker/v1/dashboard"', detailBranch);
  const lightFetch = ui.indexOf('fetch(`/api/snooker/v1/home-live?ids=', dashboardFetch);
  assert.ok(detailBranch >= 0);
  assert.ok(dashboardFetch > detailBranch);
  assert.ok(lightFetch > dashboardFetch);
  assert.match(homeLiveRoute, /select: SELECT/);
  assert.match(homeLiveRoute, /cache: "no-store"/);
  assert.match(homeLiveRoute, /snooker_matches/);
  assert.doesNotMatch(homeLiveRoute, /frames|match_statistics|event_prizes/);
  assert.match(homeLiveOverlay, /sourceUpdatedAt && incomingUpdatedAt[\s\S]*?timestamp\(incomingUpdatedAt\) < timestamp\(previous\.sourceUpdatedAt\)/);
  assert.match(homeLiveOverlay, /previous\.status === "completed" \|\| previous\.status === "walkover"/);
  assert.match(homeLiveOverlay, /function monotonicScore/);
  assert.match(homeLiveOverlay, /Math\.max\(previous, incoming\)/);
  assert.match(ui, /pollingMatches[\s\S]*?\.slice\(0, 64\)/);
  assert.match(ui, /if \(liveRefreshInFlight\.current\) return;\s*liveRefreshInFlight\.current = true;/);
  assert.match(ui, /finally \{\s*liveRefreshInFlight\.current = false;\s*setRefreshing\(false\);/);
  assert.match(ui, /实时比分暂时不可用，继续显示最近成功数据。/);
});

test("current striker and frame winners are rendered declaratively in match detail", () => {
  assert.match(ui, /const leftStriking = liveFrame && match\.currentPlayerSide === "home"/);
  assert.match(ui, /const rightStriking = liveFrame && match\.currentPlayerSide === "away"/);
  assert.match(ui, /liveIndicator\.frameWinnerScore/);
  assert.match(ui, /liveIndicator\.strikerDot/);
  assert.doesNotMatch(page, /LiveStrikerIndicator/);
});

test("root tabs stay usable before hydration and lazy datasets start after the target view is active", () => {
  assert.match(page, /const useHomeBootstrap = !requestedPlayer && !query\.section && !query\.list && !query\.group/);
  assert.match(ui, /<nav className=\{`\$\{styles\.bottomNav\} \$\{polish\.fastNav\}`\}>\{navItems\.map\(\(item\) => <a key=\{item\.id\} href=/);
  assert.match(ui, /onClick=\{\(event\) => \{ event\.preventDefault\(\); window\.history\.replaceState[\s\S]*?changeView\(item\.id\); \}\}/);
  assert.match(ui, /if \(!initialHomeBootstrap\) return;\s*const frame = window\.requestAnimationFrame\(\(\) => \{\s*if \(activeView === "players"\) void ensurePlayerDirectory\(\);\s*if \(activeView === "data"\) void ensureRankingHub\(\);\s*\}\);\s*return \(\) => window\.cancelAnimationFrame\(frame\)/);
  assert.match(urlSync, /target\.closest\("nav a, nav button"\)/);
});

test("deep player and data code is dynamically loaded and full datasets are fetched only after view activation", () => {
  assert.match(ui, /dynamic\(\(\) => import\("\.\/players\/player-directory"\)/);
  assert.match(ui, /dynamic\(\(\) => import\("\.\/players\/player-detail-inline"\)/);
  assert.match(ui, /dynamic\(\(\) => import\("\.\/data\/data-ranking-content"\)/);
  assert.match(ui, /setActiveView\(view\);\s*if \(view === "players"\) void ensurePlayerDirectory\(\);\s*if \(view === "data"\) void ensureRankingHub\(\)/);
  assert.match(playerDirectoryRoute, /getSnookerPlayerDirectory\(\)/);
  assert.doesNotMatch(playerDirectoryRoute, /loadSnookerDatabaseViewV2/);
  assert.match(rankingHubRoute, /loadSnookerRankingHub\(\)/);
});

test("home season leader opens the requested technical metric in one state transition", () => {
  assert.match(ui, /const openTechnicalFromHome = \(key: HomeLeaderMetricKey\) => \{[\s\S]*?searchParams\.set\("section", "technical"\)[\s\S]*?setRequestedTechnicalMetric\(key\);[\s\S]*?setActiveView\("data"\)/);
  assert.doesNotMatch(leaders, /dataButton\.click|findMainNav|window\.location\.assign/);
  assert.match(dataHub, /initialTechnicalMetric = null/);
  assert.match(dataHub, /useState<SnookerTechnicalMetricKey \| null>\(\(\) => initialTechnicalMetric\)/);
});

test("home compare is bootstrap-driven and the full compare route stays stable without a green deferred shell", () => {
  assert.doesNotMatch(teaser, /IntersectionObserver|\/api\/snooker\/v1\/player-compare/);
  assert.match(teaser, /const data = matchesInitialPair \? initialData : null/);
  assert.match(comparePage, /export const revalidate = 60/);
  assert.doesNotMatch(comparePage, /force-dynamic|revalidate = 0/);
  assert.match(comparePage, /const initialCompare = await loadPlayerCompare/);
  assert.match(comparePage, /<PlayerCompareClient players=\{currentTour\} initialCompare=\{initialCompare\} \/>/);
  assert.doesNotMatch(comparePage, /PlayerCompareDeferred|LoadingShell/);
});

test("match detail switches immediately while full frames and statistics hydrate in the background", () => {
  assert.match(ui, /const openMatch = \(matchId: string, eventSlug: string\) => \{[\s\S]*?void ensureEventDetail\(eventSlug\);\s*setMatchDataTab\("match"\);\s*setDetail\(\{ type: "match", matchId, eventSlug \}\)/);
  assert.match(ui, /暂无逐局比分，当前仅显示比赛总比分。/);
});
