import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("players and data keep one stable loading shell while code and data warm together", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /function RootViewLoading/);
  assert.match(ui, /loadPlayerDirectoryModule\(\).*setDirectoryModuleLoaded/s);
  assert.match(ui, /loadDataContentModule\(\).*setDataModuleLoaded/s);
  assert.match(ui, /directoryLoaded && directoryModuleLoaded/);
  assert.match(ui, /dataModuleLoaded && \(rankingHubLoaded \|\| requestedTechnicalMetric\)/);
  assert.match(ui, /onPointerEnter=\{\(\) => warmRootView\(item\.id\)\}/);
});

test("calendar renders the current season immediately and fetches older seasons on demand", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /loadedCalendarSeasons.*\[initialCurrentSeason\]/);
  assert.match(ui, /ensureCalendarSeason\(season\)/);
  assert.match(ui, /setEventListMode\("calendar"\)/);
  assert.doesNotMatch(ui, /setEventListMode\("calendar"\); void ensureCalendar\(\)/);
  assert.match(ui, /selectedSeasonLoading \? "正在加载…"/);
  assert.match(ui, /onPrefetch=\{\(season\) => \{ void ensureCalendarSeason\(season\); \}\}/);
});

test("event navigation reuses one in-flight detail request for champion and schedule", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-ui-polish.module.css"),
  ]);
  assert.match(ui, /eventDetailInFlight = useRef\(new Map/);
  assert.match(ui, /eventDetailInFlight\.current\.get\(slug\)/);
  assert.match(ui, /onPrefetch=\{\(\) => void ensureEventDetail\(item\.slug\)\}/);
  assert.match(ui, /正在读取冠军信息/);
  assert.match(ui, /决赛结果与赛程同步加载中/);
  assert.match(css, /\.championCardLoading/);
});

test("technical and honours modules load near their viewport instead of both at data entry", async () => {
  const data = await read("app/snooker/data/data-ranking-content.tsx");
  assert.match(data, /technicalSectionRef/);
  assert.match(data, /honoursSectionRef/);
  assert.match(data, /new IntersectionObserver/);
  assert.match(data, /rootMargin: "480px 0px"/);
  assert.match(data, /if \(!technicalKey\) return/);
  assert.match(data, /if \(!honoursKey\) return/);
});
