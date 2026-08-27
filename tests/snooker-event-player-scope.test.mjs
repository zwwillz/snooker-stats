import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const database = fs.readFileSync(new URL("../lib/snooker/database-public.ts", import.meta.url), "utf8");
const databaseV2 = fs.readFileSync(new URL("../lib/snooker/database-public-v2.ts", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../lib/snooker/event-detail-complete.ts", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../app/snooker/snooker-data-center-v2.tsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20260827084000_fix_public_player_scope_and_championship_league_empty_final.sql", import.meta.url), "utf8");

test("public event player scope includes all players needed by user-facing events", () => {
  assert.match(database, /snooker_public_players\?select=id,slug,name_en,name_zh/);
  assert.match(databaseV2, /snooker_public_players\?select=id,slug/);
  assert.match(detail, /snooker_public_players\?select=id,slug/);
  assert.match(migration, /create or replace view public\.snooker_public_players/);
  assert.match(migration, /e\.start_date >= date '2019-01-01'/);
  assert.match(client, /if \(!p1 \|\| !p2\) return null/);
});

test("2026 Championship League stage one does not keep an empty final round", () => {
  assert.match(migration, /betvictor-championship-league-snooker-2026-stage-one-wk1/);
  assert.match(migration, /r\.round_key = 'final'/);
  assert.match(migration, /not exists/);
});
