import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("event series migration is additive, secured and data driven", async () => {
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

test("public loader separates lightweight all-season series from current-season details", async () => {
  const database = await read("lib/snooker/database-public.ts");
  assert.match(database, /currentSnookerSeason/);
  assert.match(database, /snooker_event_series\?select=/);
  assert.match(database, /stage_name_en,stage_name_zh,stage_order/);
  assert.match(database, /filter\(\(series\) => Number\(series\.season\.slice\(0, 4\)\) >= 2019\)/);
  assert.match(database, /loadSnookerEventDetail/);
  assert.doesNotMatch(database, /season=eq\.2026%2F27/);
});

test("event UI exposes swipeable seasons and multi-stage drill-down", async () => {
  const [ui, css, page, dashboard] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
    read("app/page.tsx"),
    read("app/api/snooker/v1/dashboard/route.ts"),
  ]);
  assert.match(ui, /function SeasonSelector/);
  assert.match(ui, /setSelectedSeason/);
  assert.match(ui, /function SeriesCard/);
  assert.match(ui, /preferredSeriesStage/);
  assert.match(ui, /seriesDetail\.stages\.map/);
  assert.match(ui, /api\/snooker\/v1\/event\?slug=/);
  assert.match(css, /\.seasonRail\{[^}]*overflow-x:auto/s);
  assert.match(css, /\.stageSelector\{[^}]*overflow-x:auto/s);
  assert.match(page, /initialEventSeries=\{database\.eventSeries\}/);
  assert.match(dashboard, /eventSeries: database\.eventSeries/);
});
