import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const ui = read("app/snooker/snooker-data-center-v2.tsx");
const page = read("app/page.tsx");
const urlSync = read("app/snooker/snooker-view-url-sync.tsx");
const bootstrap = read("lib/snooker/home-bootstrap.ts");
const eventCore = read("lib/snooker/event-detail-core.ts");
const matchDetail = read("lib/snooker/match-detail.ts");
const eventRoute = read("app/api/snooker/v1/event/route.ts");
const matchRoute = read("app/api/snooker/v1/match/route.ts");
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
  assert.match(bootstrap, /detailPartial: true/);
});

test("homepage failure serves last success or stale-capable V2 before static fallback", () => {
  assert.match(bootstrap, /if \(previous && previous\.staleUntil > Date\.now\(\)\)[\s\S]*?return previous\.value/);
  assert.match(bootstrap, /const database = await loadSnookerDatabaseViewV2\(\)/);
  assert.doesNotMatch(bootstrap, /catch \(error\)[\s\S]{0,500}snapshot: dashboardSnapshot/);
});

test("home SSR no longer waits for live read-through", () => {
  assert.doesNotMatch(page, /useHomeBootstrap\s*\?\s*await refreshSnookerDatabaseViewLive/);
  assert.match(page, /if \(useHomeBootstrap\) \{[\s\S]*?loadSnookerHomeBootstrap\(\)[\s\S]*?\} else \{[\s\S]*?refreshSnookerDatabaseViewLive/);
  assert.match(page, /<SnookerViewUrlSync \/>/);
  assert.doesNotMatch(page, /serverLoadData/);
});

test("one React controller owns root URL/history after hydration", () => {
  assert.doesNotMatch(urlSync, /document\.addEventListener|querySelector|closest\(|replaceState|pushState/);
  assert.match(ui, /function rootUrl\(view: MainView\)/);
  assert.match(ui, /const changeView = \(view: NavId\) => \{[\s\S]*?window\.history\.pushState\(\{ snookerView: view \}/);
  assert.match(ui, /onClick=\{\(event\) => \{ event\.preventDefault\(\); changeView\(item\.id\); \}\}/);
  assert.doesNotMatch(ui, /window\.history\.replaceState\(window\.history\.state/);
});

test("root tabs stay usable before hydration and lazy datasets warm on intent or activation", () => {
  assert.match(page, /const useHomeBootstrap = !requestedPlayer && !query\.section && !query\.list && !query\.group/);
  assert.match(ui, /<nav className=\{`\$\{styles\.bottomNav\} \$\{polish\.fastNav\}`\}>\{navItems\.map\(\(item\) => <a key=\{item\.id\} href=/);
  assert.match(ui, /if \(activeView === "players"\) warmPlayerDirectoryView\(\);[\s\S]*?if \(activeView === "data"\) warmDataView\(\)/);
  assert.match(ui, /onPointerEnter=\{\(\) => warmRootView\(item\.id\)\}/);
});

test("live polling stays lightweight and selected match polling never falls back to full dashboard", () => {
  assert.match(ui, /const selectedMatchForPolling = detail\?\.type === "match"/);
  assert.match(ui, /detail\?\.type === "match"\s*\? Boolean\(selectedMatchForPolling && shouldPollMatch/);
  assert.match(ui, /if \(currentDetail\?\.type === "match"\) \{\s*await ensureMatchDetail\(currentDetail\.matchId, \{ silent: true \}\);/);
  assert.doesNotMatch(ui, /fetch\("\/api\/snooker\/v1\/dashboard"/);
  assert.match(ui, /fetch\(`\/api\/snooker\/v1\/home-live\?ids=/);
  assert.match(homeLiveRoute, /select: SELECT/);
  assert.match(homeLiveRoute, /cache: "no-store"/);
  assert.doesNotMatch(homeLiveRoute, /frames|match_statistics|event_prizes/);
  assert.match(homeLiveOverlay, /function monotonicScore/);
  assert.match(homeLiveOverlay, /Math\.max\(previous, incoming\)/);
  assert.match(ui, /\.slice\(0, 64\)/);
  assert.match(ui, /if \(liveRefreshInFlight\.current\) return;/);
  assert.match(ui, /document\.hidden/);
});

test("event core owns participant profiles without preloading every match detail", () => {
  assert.match(eventRoute, /loadSnookerEventCore\(slug\)/);
  assert.match(eventRoute, /players: scopedPlayers/);
  assert.doesNotMatch(eventRoute, /loadSnookerEventDetailComplete/);
  assert.doesNotMatch(eventCore, /snooker_frames|snooker_match_statistics|snooker_match_head_to_head/);
  assert.match(ui, /mergeScopedPlayers\(data\.players\)/);
  assert.doesNotMatch(ui, /if \(!p1 \|\| !p2\) return null/);
});

test("match detail loads frames statistics and h2h for only the requested match", () => {
  assert.match(matchRoute, /loadSnookerMatchDetail\(matchId\)/);
  assert.match(matchDetail, /snooker_frames\?select=[\s\S]*?match_id=eq\.\$\{uuid\}/);
  assert.match(matchDetail, /snooker_match_statistics\?select=[\s\S]*?match_id=eq\.\$\{uuid\}/);
  assert.match(matchDetail, /snooker_match_head_to_head\?select=[\s\S]*?match_id=eq\.\$\{uuid\}/);
  assert.match(ui, /void ensureMatchDetail\(matchId\)/);
  assert.match(ui, /正在加载逐局比分…/);
});

test("match detail never substitutes a final for a missing requested match", () => {
  assert.match(ui, /const match = allMatches\(selectedEvent\)\.find\(\(item\) => item\.id === detail\.matchId\);/);
  assert.doesNotMatch(ui, /find\(\(item\) => item\.id === detail\.matchId\) \?\? finalOf/);
  assert.match(ui, /未找到这场比赛，请返回赛程重新选择。/);
});

test("match return state restores exact event origin or the root origin", () => {
  assert.match(ui, /type MatchReturnState =[\s\S]*?kind: "event"[\s\S]*?kind: "root"/);
  assert.match(ui, /matchReturnState\.current = \{ kind: "event", slug: eventSlug, tab: detail\.tab, scrollY: window\.scrollY \}/);
  assert.match(ui, /matchReturnState\.current = \{ kind: "root", view: activeView, scrollY: window\.scrollY \}/);
  assert.match(ui, /restore\?\.kind === "root"[\s\S]*?setDetail\(null\);[\s\S]*?setActiveView\(restore\.view\)/);
});

test("home technical leaderboard uses clean history state so browser back resolves to home URL", () => {
  assert.match(ui, /const openTechnicalFromHome = \(key: HomeLeaderMetricKey\) => \{[\s\S]*?replaceState\(\{ snookerView: activeView \}/);
  assert.match(ui, /pushState\(\{ snookerView: "data", snookerTechnicalDetail: key \}/);
  assert.match(ui, /urlView === "data" && params\.get\("section"\) === "technical"/);
  assert.doesNotMatch(ui, /snookerTechnicalDetail: key, snookerReturnView: "home"/);
});

test("current striker and frame winners remain declarative", () => {
  assert.match(ui, /const leftStriking = liveFrame && match\.currentPlayerSide === "home"/);
  assert.match(ui, /const rightStriking = liveFrame && match\.currentPlayerSide === "away"/);
  assert.match(ui, /liveIndicator\.frameWinnerScore/);
  assert.match(ui, /liveIndicator\.strikerDot/);
  assert.doesNotMatch(page, /LiveStrikerIndicator/);
});

test("deep player and data code is dynamically loaded", () => {
  assert.match(ui, /loadPlayerDirectoryModule = \(\) => import\("\.\/players\/player-directory"\)/);
  assert.match(ui, /dynamic\(\(\) => loadPlayerDirectoryModule\(\)/);
  assert.match(ui, /dynamic\(\(\) => import\("\.\/players\/player-detail-inline"\)/);
  assert.match(ui, /loadDataContentModule = \(\) => import\("\.\/data\/data-ranking-content"\)/);
  assert.match(ui, /dynamic\(\(\) => loadDataContentModule\(\)/);
  assert.match(playerDirectoryRoute, /getSnookerPlayerDirectory\(\)/);
  assert.doesNotMatch(playerDirectoryRoute, /loadSnookerDatabaseViewV2/);
  assert.match(rankingHubRoute, /loadSnookerRankingHub\(\)/);
});

test("home season leader opens requested technical metric in one state transition", () => {
  assert.match(ui, /const openTechnicalFromHome = \(key: HomeLeaderMetricKey\) => \{[\s\S]*?searchParams\.set\("section", "technical"\)[\s\S]*?setRequestedTechnicalMetric\(key\);[\s\S]*?setActiveView\("data"\)/);
  assert.doesNotMatch(leaders, /dataButton\.click|findMainNav|window\.location\.assign/);
  assert.match(dataHub, /initialTechnicalMetric = null/);
});

test("home compare remains bootstrap-driven and compare route remains server rendered", () => {
  assert.doesNotMatch(teaser, /IntersectionObserver|\/api\/snooker\/v1\/player-compare/);
  assert.match(teaser, /const data = matchesInitialPair \? initialData : null/);
  assert.match(comparePage, /export const revalidate = 60/);
  assert.doesNotMatch(comparePage, /force-dynamic|revalidate = 0/);
  assert.match(comparePage, /const initialCompare = await loadPlayerCompare/);
  assert.doesNotMatch(comparePage, /PlayerCompareDeferred|LoadingShell/);
});
