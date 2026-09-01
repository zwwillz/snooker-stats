import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("phase 4 tournament experience keeps the approved event hierarchy", async () => {
  const [uiSource, priorityCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);

  assert.match(uiSource, /activeEventCard \?\? firstUpcomingMain \?\? graceEventCard/);
  assert.match(uiSource, /const recentFeaturedEvent = activeEventCard/);
  assert.match(uiSource, /const recentCompletedEvents = \[\.\.\.mainSeasonEvents\]/);
  assert.match(uiSource, /const recentCardEvents = \[firstUpcomingCurrent, \.\.\.recentCompletedEvents\]/);
  assert.match(uiSource, /查看本赛季完整赛历/);
  assert.match(uiSource, /data-event-detail/);
  assert.match(uiSource, /data-match-detail/);
  assert.match(priorityCss, /TOURNAMENTS_PHASE4A_DETAIL_REFINEMENT/);
  assert.match(uiSource, /detailSiteHeader/);
  assert.match(uiSource, /eventHeaderCompact/);
  assert.match(uiSource, /data-event-header-state/);
  assert.match(uiSource, /eventStickyNav/);
  assert.doesNotMatch(uiSource, /eventStickyIdentity/);
  assert.doesNotMatch(uiSource, /matchBackButton/);
  assert.match(uiSource, /scheduleDesktopMatch/);
  assert.match(uiSource, /scheduleDetailAction/);
  assert.match(priorityCss, /\.recentEventGrid\{grid-template-columns:1fr!important/);
  assert.match(priorityCss, /\.eventDetailCompact \.eventDetailHeroDesktop/);
  assert.match(priorityCss, /\.scheduleDetailAction\{/);
  assert.doesNotMatch(priorityCss, /\.scheduleAction>span/);
  assert.match(priorityCss, /matchDetailBody,.matchDetailBodyWithData\{display:flex!important;flex-direction:column!important/);
  assert.doesNotMatch(uiSource, /matchContextBar/);
});

test("phase 4 detail pages keep event and match data scoped on demand", async () => {
  const uiSource = await read("app/snooker/snooker-data-center-v2.tsx");

  assert.match(uiSource, /fetch\(`\/api\/snooker\/v1\/event\?slug=/);
  assert.match(uiSource, /ensureMatchDetail\(currentDetail\.matchId, \{ silent: true \}\)/);
  assert.doesNotMatch(uiSource, /Promise\.all\([^)]*ensureMatchDetail/);
});
