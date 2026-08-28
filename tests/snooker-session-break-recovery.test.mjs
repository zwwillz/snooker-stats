import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("WST suspended variants remain session-break states", async () => {
  const [migration, liveRead] = await Promise.all([
    read("supabase/migrations/20260828131208_recognize_frame_ended_mid_session_interval.sql"),
    read("lib/snooker/live-read-through.ts"),
  ]);

  assert.match(migration, /v_source in \('suspended', 'paused', 'interrupted'\)/);
  assert.match(liveRead, /\["suspended", "paused", "interrupted"\]\.includes\(sourceStatus\)/);
  assert.match(migration, /new\.status := 'session-break'/);
});

test("Live FRAME_HAS_ENDED is only treated as the standard fourth-frame interval", async () => {
  const [migration, liveRead] = await Promise.all([
    read("supabase/migrations/20260828131208_recognize_frame_ended_mid_session_interval.sql"),
    read("lib/snooker/live-read-through.ts"),
  ]);

  assert.match(migration, /v_meta = 'frame_has_ended'/);
  assert.match(migration, /coalesce\(new\.score1, 0\) \+ coalesce\(new\.score2, 0\) = 4/);
  assert.match(migration, /coalesce\(new\.best_of, 0\) >= 9/);
  assert.match(migration, /greatest\(coalesce\(new\.score1, 0\), coalesce\(new\.score2, 0\)\) < v_win_target/);

  assert.match(liveRead, /function isFrameEndedMidSessionInterval/);
  assert.match(liveRead, /sourceMeta === "frame_has_ended"/);
  assert.match(liveRead, /previous\.bestOf >= 9/);
  assert.match(liveRead, /completedFrames === 4/);
  assert.match(liveRead, /Math\.max\(homeFrames, awayFrames\) < winTarget/);
});

test("session-break normalization runs before generic live handling", async () => {
  const liveRead = await read("lib/snooker/live-read-through.ts");
  const frameEnded = liveRead.indexOf("if (isFrameEndedMidSessionInterval(row, previous)) return \"session-break\"");
  const genericLive = liveRead.indexOf("if (canonical === \"live\" || sourceStatus === \"live\") return \"live\"");
  assert.ok(frameEnded >= 0, "frame-ended interval guard must exist");
  assert.ok(genericLive > frameEnded, "frame-ended interval guard must run before generic live status");
});
