import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migrationPath = "supabase/migrations/20260828105529_harden_suspended_live_recovery.sql";

test("WST Suspended states stay in the realtime pipeline", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /v_source in \('suspended', 'paused', 'interrupted'\)/);
  assert.match(migration, /new\.status := 'session-break'/);
  assert.match(migration, /create trigger snooker_guard_live_match_state_trigger/);
  assert.match(migration, /old\.status in \('live', 'session-break'\) and new\.status = 'upcoming'/);
  assert.match(migration, /old\.source_updated_at is not null[\s\S]*new\.source_updated_at < old\.source_updated_at/);
});

test("live sync self-heals already-started matches that were demoted to upcoming", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /m\.scheduled_at between v_now-interval '12 hours' and v_now/);
  assert.match(migration, /coalesce\(m\.score1,0\)\+coalesce\(m\.score2,0\)>0/);
  assert.match(migration, /source_status,''\)\) in \('live','suspended','paused','interrupted'\)/);
  assert.match(migration, /source_status_meta,''\)\) ~ '\(interval\|session\[ _-\]\?break\|mid\[ _-\]\?session\|break\|pause\)'/);
});

test("recovered matches that finish while detached get their final frames immediately", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /status='completed' and completed_detected_at>=now\(\)-interval '15 minutes'/);
  assert.match(migration, /perform public\.snooker_sync_wst_match_frames\(v_match\.id\)/);
  assert.match(migration, /realtime_finalized_at is null/);
});
