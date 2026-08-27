import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("event series migration remains additive, secured and non-destructive", async () => {
  const migration = await read("supabase/migrations/20260824051746_add_event_series_and_season_catalog.sql");
  assert.match(migration, /create table if not exists public\.snooker_event_series/);
  assert.match(migration, /add column if not exists series_id uuid references public\.snooker_event_series/);
  assert.match(migration, /stage_name_en text/);
  assert.match(migration, /stage_name_zh text/);
  assert.match(migration, /stage_order integer/);
  assert.match(migration, /snooker_internal\.event_series_rules/);
  assert.match(migration, /assign_snooker_event_series/);
  assert.match(migration, /alter table public\.snooker_event_series enable row level security/);
  assert.match(migration, /revoke insert, update, delete, truncate/);
  assert.doesNotMatch(migration, /delete from public\.snooker_matches|update public\.snooker_matches/);
  assert.match(migration, /where r\.enabled[\s\S]*new\.name_en ~\* r\.event_name_pattern/);
});

test("database may retain dormant series metadata without changing WST event rows", async () => {
  const database = await read("lib/snooker/database-public.ts");
  assert.match(database, /currentSnookerSeason/);
  assert.match(database, /snooker_event_series\?select=/);
  assert.match(database, /stage_name_en,stage_name_zh,stage_order/);
  assert.match(database, /buildEventSeries/);
  assert.match(database, /loadSnookerEventDetail/);
  assert.doesNotMatch(database, /season=eq\.2026%2F27/);
});

test("frontend follows raw WST events while historical seasons use a lightweight catalog", async () => {
  const [ui, css, page, dashboard, calendar] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/page.tsx"),
    read("app/api/snooker/v1/dashboard/route.ts"),
    read("lib/snooker/event-calendar.ts"),
  ]);
  assert.match(ui, /function SeasonSelector/);
  assert.match(ui, /eventListMode === "calendar" \? <SeasonSelector/);
  assert.match(ui, /function EventCard/);
  assert.match(ui, /const effectiveCalendarEvents = useMemo/);
  assert.match(ui, /const seasonOptions = useMemo\(\(\) => \[\.\.\.new Set\(effectiveCalendarEvents\.map/);
  assert.match(ui, /const selectedSeasonEvents = useMemo\(\(\) => effectiveCalendarEvents/);
  assert.match(ui, /const recentEvents = seasonCalendar/);
  assert.match(ui, /\/api\/snooker\/v1\/calendar/);
  assert.doesNotMatch(ui, /SnookerEventSeries/);
  assert.doesNotMatch(ui, /seriesSlug/);
  assert.doesNotMatch(ui, /function SeriesCard/);
  assert.doesNotMatch(ui, /preferredSeriesStage/);
  assert.doesNotMatch(ui, /seriesDetail\.stages\.map/);
  assert.doesNotMatch(ui, /seriesStageSection/);
  assert.match(ui, /api\/snooker\/v1\/event\?slug=/);
  assert.match(css, /\.seasonRail\{[^}]*overflow-x:auto/s);
  assert.doesNotMatch(page, /initialEventSeries/);
  assert.doesNotMatch(dashboard, /eventSeries: database\.eventSeries/);
  assert.match(calendar, /snooker_events\?select=id,slug,season/);
  assert.doesNotMatch(calendar, /snooker_event_series/);
  assert.doesNotMatch(calendar, /snooker_matches|snooker_rounds|snooker_frames/);
});
