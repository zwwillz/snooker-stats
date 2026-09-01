import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("historical season catalog is lightweight and independent from current-season dashboard data", async () => {
  const [calendar, route, ui] = await Promise.all([
    read("lib/snooker/event-calendar.ts"),
    read("app/api/snooker/v1/calendar/route.ts"),
    read("app/snooker/snooker-data-center-v2.tsx"),
  ]);
  assert.match(calendar, /snooker_events\?select=id,slug,season/);
  assert.match(calendar, /seasonFilter = season \? `&season=eq\.\$\{encodeURIComponent\(season\)\}`/);
  assert.doesNotMatch(calendar, /snooker_rounds|snooker_matches|snooker_frames|snooker_match_statistics/);
  assert.match(route, /loadSnookerEventCalendar\(season\)/);
  assert.match(ui, /const \[calendarEvents, setCalendarEvents\]/);
  assert.match(ui, /const effectiveCalendarEvents = useMemo/);
  assert.match(ui, /const seasonOptions = useMemo\(\(\) => seasonOptionsFromCurrent\(initialCurrentSeason\)/);
  assert.match(ui, /calendar\?season=\$\{encodeURIComponent\(season\)\}/);
  assert.match(ui, /const seasonCalendar = useMemo\(\(\) => \[\.\.\.snapshot\.calendar\]\.filter\(\(item\) => item\.season === initialCurrentSeason\)/);
});

test("historical event and match screens keep explicit time context", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /const isHistoricalEvent = calendarEvent\.season !== initialCurrentSeason/);
  assert.match(ui, /\{calendarEvent\.season\}赛季 · 历史赛事/);
  assert.match(ui, /!isCurrentSeasonMatch \? `\$\{selectedEvent\.season\}赛季 · 历史赛事 · `/);
});

test("event navigation restores season, list mode and scroll positions", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /eventReturnState = useRef<\{ view: MainView; mode: EventListMode; season: string; scrollY: number \}/);
  assert.match(ui, /snookerScrollY\?: number/);
  assert.match(ui, /snookerEventMode\?: EventListMode/);
  assert.match(ui, /snookerEventSeason\?: string/);
  assert.match(ui, /replaceState\([\s\S]*?snookerEventMode: eventListMode,[\s\S]*?snookerEventSeason: selectedSeason/);
  assert.match(ui, /pushState\([\s\S]*?snookerReturnDetail: nextDetail,[\s\S]*?snookerScrollY: 0/);
  assert.match(ui, /const restoreMode = state\?\.snookerEventMode/);
  assert.match(ui, /const restoreSeason = state\?\.snookerEventSeason/);
  assert.match(ui, /window\.scrollTo\(\{ top: restoreScrollY, behavior: "auto" \}\)/);
  assert.match(ui, /type MatchReturnState =[\s\S]*?kind: "event"[\s\S]*?slug: string; tab: EventTab; scrollY: number/);
  assert.match(ui, /matchReturnState\.current = \{ kind: "event", slug: eventSlug, tab: detail\.tab, scrollY: window\.scrollY \}/);
  assert.match(ui, /snookerReturnDetail: detail,[\s\S]*?snookerScrollY: window\.scrollY/);
  assert.match(ui, /state\?\.snookerOrigin && state\.snookerReturnDetail[\s\S]*?setDetail\(state\.snookerReturnDetail\)/);
});

test("event tabs are already sticky below the detail header", async () => {
  const css = await read("app/snooker/snooker-data-center.module.css");
  assert.match(css, /\.eventTabs\{position:sticky;top:68px;z-index:50/);
});

test("database series schema stays intact while frontend does not consume merge identity", async () => {
  const [migration, database, ui, page] = await Promise.all([
    read("supabase/migrations/20260824051746_add_event_series_and_season_catalog.sql"),
    read("lib/snooker/database-public.ts"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/page.tsx"),
  ]);
  assert.match(migration, /snooker_event_series/);
  assert.match(migration, /series_id/);
  assert.match(database, /snooker_event_series\?select=/);
  assert.doesNotMatch(ui, /SnookerEventSeries|seriesSlug|SeriesCard/);
  assert.doesNotMatch(page, /initialEventSeries/);
});
