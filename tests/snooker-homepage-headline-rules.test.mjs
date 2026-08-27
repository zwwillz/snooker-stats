import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const NOW = Date.parse("2026-08-28T12:00:00.000Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const source = await readFile(new URL("../lib/snooker/live-client.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const liveClient = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const { mergeLiveMatchMonotonic, selectHomepageHeadlineMatches } = liveClient;

function iso(offset = 0) {
  return new Date(NOW + offset).toISOString();
}

function match(id, status, fields = {}) {
  return {
    id,
    roundKey: "round-1",
    roundLabelZh: "第一轮",
    matchNo: Number(id.replace(/\D/g, "")) || 1,
    bestOf: 7,
    player1Id: "p1",
    player2Id: "p2",
    score1: 0,
    score2: 0,
    status,
    ...fields,
  };
}

function select(matches, now = NOW, limit = 4) {
  const event = {
    id: "event-1",
    rounds: [{ key: "round-1", matches }],
  };
  return selectHomepageHeadlineMatches([event], new Map(), now, limit).map(({ match: selected }) => selected);
}

test("case 1: a live match hides recently completed and upcoming matches", () => {
  const selected = select([
    match("m1", "completed", { completedDetectedAt: iso(-10 * MINUTE) }),
    match("m2", "upcoming", { scheduledAt: iso(2 * HOUR) }),
    match("m3", "live"),
  ]);
  assert.deepEqual(selected.map(({ id }) => id), ["m3"]);
});

test("case 2: no more than four active matches are returned", () => {
  const selected = select(Array.from({ length: 5 }, (_, index) => match(`m${index + 1}`, "live")));
  assert.equal(selected.length, 4);
  assert.equal(selected.every(({ status }) => status === "live"), true);
});

test("cases 3 and 4: completed matches remain through the 45-minute protection window", () => {
  assert.equal(select([match("m1", "completed", { completedDetectedAt: iso(-10 * MINUTE) })])[0]?.id, "m1");
  assert.equal(select([match("m2", "walkover", { completedDetectedAt: iso(-44 * MINUTE) })])[0]?.id, "m2");
  assert.equal(select([match("m3", "completed", { completedDetectedAt: iso(-45 * MINUTE) })])[0]?.id, "m3");
});

test("case 5: after protection expires, a match two hours away takes over", () => {
  const selected = select([
    match("m1", "completed", { completedDetectedAt: iso(-45 * MINUTE - 1) }),
    match("m2", "upcoming", { scheduledAt: iso(2 * HOUR) }),
  ]);
  assert.equal(selected[0]?.id, "m2");
});

test("case 6: a match four hours away is returned by the three-day fallback", () => {
  const selected = select([
    match("m1", "completed", { completedDetectedAt: iso(-46 * MINUTE) }),
    match("m2", "upcoming", { scheduledAt: iso(4 * HOUR) }),
  ]);
  assert.equal(selected[0]?.id, "m2");
});

test("case 7: tomorrow's nearest match is returned", () => {
  assert.equal(select([match("m1", "upcoming", { scheduledAt: iso(DAY) })])[0]?.id, "m1");
});

test("case 8: a match beyond three days is not returned", () => {
  assert.deepEqual(select([match("m1", "upcoming", { scheduledAt: iso(3 * DAY + 1) })]), []);
});

test("case 9: the earliest of several future matches is returned", () => {
  const selected = select([
    match("m1", "upcoming", { scheduledAt: iso(8 * HOUR) }),
    match("m2", "upcoming", { scheduledAt: iso(DAY) }),
    match("m3", "upcoming", { scheduledAt: iso(5 * HOUR) }),
  ]);
  assert.equal(selected[0]?.id, "m3");
});

test("case 10: sourceUpdatedAt is only the final completion-time fallback", () => {
  assert.equal(select([match("m1", "completed", { sourceUpdatedAt: iso(-10 * MINUTE) })])[0]?.id, "m1");
  assert.deepEqual(select([match("m2", "completed", { sourceUpdatedAt: iso(-2 * HOUR) })]), []);
});

test("a newly detected terminal transition is timestamped when the source omits completion time", () => {
  const current = match("m1", "live", { sourceUpdatedAt: iso(-MINUTE), score1: 3, score2: 2 });
  const incoming = match("m1", "completed", { sourceUpdatedAt: iso(), score1: 4, score2: 2 });
  const merged = mergeLiveMatchMonotonic(current, incoming, iso());
  assert.equal(merged.completedDetectedAt, iso());
  assert.equal(select([merged], NOW + 44 * MINUTE)[0]?.id, "m1");
  assert.deepEqual(select([merged], NOW + 45 * MINUTE + 1), []);
});

test("the forward migration stamps both completed and walkover transitions", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260827181727_protect_homepage_completed_detection.sql", import.meta.url), "utf8");
  assert.match(migration, /new\.status in \('completed', 'walkover'\) and new\.completed_detected_at is null/);
  assert.match(migration, /set completed_detected_at = source_updated_at/);
});
