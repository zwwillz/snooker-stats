import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const root = read("app/snooker/snooker-data-center-v2.tsx");
const directory = read("app/snooker/players/player-directory.tsx");
const playerData = read("lib/snooker/player-data.ts");
const playerRoute = read("app/api/snooker/v1/player-directory/route.ts");
const rankingRoute = read("app/api/snooker/v1/ranking-hub/route.ts");
const rankingHub = read("lib/snooker/ranking-hub.ts");
const technicalRoute = read("app/api/snooker/v1/technical/route.ts");
const honoursRoute = read("app/api/snooker/v1/honours/route.ts");

test("player directory renders the first 32 tour players then fills the tour during idle time", () => {
  assert.match(root, /searchParams\.set\("scope", "tour"\)/);
  assert.match(root, /searchParams\.set\("limit", "32"\)/);
  assert.match(root, /requestIdleCallback/);
  assert.match(root, /do \{[\s\S]*?\} while \(cursor\)/);
  assert.match(playerData, /params\.set\("current_rank", `gt\.\$\{decoded\.rank\}`\)/);
  assert.doesNotMatch(playerRoute, /getSnookerPlayerDirectory\(\)/);
});

test("former players use stable keyset pagination and load only near the directory end", () => {
  assert.match(playerData, /order: scope === "tour" \? "current_rank\.asc,name_en\.asc,id\.asc" : "name_en\.asc,id\.asc"/);
  assert.match(playerData, /name_en\.gt/);
  assert.match(playerData, /id\.gt/);
  assert.doesNotMatch(playerData, /offset/);
  assert.match(root, /searchParams\.set\("scope", "archive"\)/);
  assert.match(root, /searchParams\.set\("limit", "64"\)/);
  assert.match(directory, /rootMargin: "720px 0px"/);
  assert.match(directory, /onLoadMore/);
  assert.match(root, /hasMore=\{directoryHasMore && playerFilter === "all" && !playerQuery\.trim\(\)\}/);
  assert.match(root, /cache: "no-store"/);
  assert.match(root, /AbortSignal\.timeout\(12_000\)/);
  assert.match(root, /data\.nextCursor === requestedCursor/);
  assert.match(root, /onLoadMore=\{loadMorePlayerDirectory\}/);
  assert.match(directory, /loadMoreError \|\| !onLoadMore/);
  assert.match(directory, /加载失败，点击重试/);
  assert.match(playerRoute, /scope === "archive" \? "private, no-store"/);
});

test("player search and China filter are scoped queries instead of a full archive download", () => {
  assert.match(playerRoute, /mode === "search"/);
  assert.match(playerRoute, /searchSnookerPlayerDirectory/);
  assert.match(playerData, /CHINA_REGION_COUNTRY_CODES/);
  assert.match(playerData, /"HK", "HKG", "MO", "MAC", "TW", "TWN", "TPE"/);
  assert.match(directory, /CHINA_REGION_NAMES/);
  assert.match(playerData, /Math\.min\(128/);
  assert.match(root, /window\.setTimeout\(\(\) => \{/);
});

test("ranking technical and honours return only referenced player profiles", () => {
  assert.match(rankingRoute, /loadedHub\.lists\.flatMap/);
  assert.match(rankingRoute, /getSnookerPlayersByIds/);
  assert.doesNotMatch(rankingRoute, /getSnookerPlayerDirectory/);
  assert.match(rankingHub, /id: `in\.\(\$\{batch\.join\(","\)\}\)`/);
  assert.doesNotMatch(rankingHub, /new URLSearchParams\(\{ select: "id,slug" \}\)/);
  assert.match(technicalRoute, /getSnookerPlayersByIds/);
  assert.match(honoursRoute, /getSnookerPlayersByIds/);
  assert.match(playerData, /for \(let index = 0; index < unique\.length; index \+= 100\)/);
});

test("progressive rows preserve nearby and high-priority player detail prefetch", () => {
  assert.match(directory, /prefetchPlayerExperience\(player\.slug, player\.avatarUrl, priority\)/);
  assert.match(directory, /rootMargin: "420px 0px"/);
  assert.match(directory, /onPointerEnter=\{\(\) => warmHighPriority\(player\)\}/);
  assert.match(directory, /onTouchStart=\{\(\) => warmHighPriority\(player\)\}/);
  assert.match(root, /onPrefetchPlayer=\{\(player\) => prefetchPlayerDetail\(player\.slug\)\}/);
});

test("players and data reuse one stable structural loading shell", () => {
  assert.match(root, /function RootViewLoading/);
  assert.match(root, /root-view-shell\.module\.css/);
  assert.match(root, /Array\.from\(\{ length: 7 \}/);
  assert.match(root, /Array\.from\(\{ length: 4 \}/);
  assert.doesNotMatch(root, /正在加载球员目录/);
  assert.doesNotMatch(root, /正在加载数据中心/);
});
