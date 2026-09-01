import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const database = fs.readFileSync(new URL("../lib/snooker/database-public.ts", import.meta.url), "utf8");
const databaseV2 = fs.readFileSync(new URL("../lib/snooker/database-public-v2.ts", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../lib/snooker/event-detail-complete.ts", import.meta.url), "utf8");
const eventCore = fs.readFileSync(new URL("../lib/snooker/event-detail-core.ts", import.meta.url), "utf8");
const scopedPlayers = fs.readFileSync(new URL("../lib/snooker/scoped-player-data.ts", import.meta.url), "utf8");
const eventRoute = fs.readFileSync(new URL("../app/api/snooker/v1/event/route.ts", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../app/snooker/snooker-data-center-v2.tsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20260827084000_fix_public_player_scope_and_championship_league_empty_final.sql", import.meta.url), "utf8");

test("event detail owns participant player scope instead of depending on the homepage player subset", () => {
  assert.match(eventCore, /loadSnookerPlayersByDbIds\(participantDbIds\)/);
  assert.match(scopedPlayers, /export async function loadSnookerPlayersByDbIds/);
  assert.match(eventRoute, /players: scopedPlayers/);
  assert.match(client, /mergeScopedPlayers\(data\.players\)/);
  assert.match(client, /for \(const player of eventScopedPlayers\)/);
  assert.doesNotMatch(client, /if \(!p1 \|\| !p2\) return null/);
  assert.match(client, /players\.get\(match\.player1Id\) \?\? fallbackPlayer/);
  assert.match(client, /eventPlayerStats[\s\S]*players\.get\(stats\.playerId\)[\s\S]*isChina\(player\)/);
});

test("event core remains lightweight while match detail is targeted to one match", () => {
  assert.doesNotMatch(eventCore, /snooker_frames|snooker_match_statistics|snooker_match_head_to_head/);
  assert.match(eventCore, /snooker_matches\?select=/);
  assert.match(eventCore, /snooker_event_prizes\?select=/);
  assert.match(eventCore, /players: scopedPlayers\.players/);
  assert.doesNotMatch(eventRoute, /loadSnookerEventDetailComplete/);
});

test("legacy public event scope remains available as a fallback", () => {
  assert.match(database, /snooker_public_players\?select=id,slug,name_en,name_zh/);
  assert.match(databaseV2, /snooker_public_players\?select=id,slug/);
  assert.match(detail, /snooker_public_players\?select=id,slug/);
  assert.match(migration, /create or replace view public\.snooker_public_players/);
  assert.match(migration, /e\.start_date >= date '2019-01-01'/);
});

test("2026 Championship League stage one does not keep an empty final round", () => {
  assert.match(migration, /betvictor-championship-league-snooker-2026-stage-one-wk1/);
  assert.match(migration, /r\.round_key = 'final'/);
  assert.match(migration, /not exists/);
});
