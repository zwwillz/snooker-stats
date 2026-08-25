import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const triggerMigration = "supabase/migrations/20260825152608_preserve_player_career_highlight_translation_updates.sql";
const syncMigration = "supabase/migrations/20260825153442_preserve_player_career_highlight_translations_during_wst_sync.sql";

test("career highlight Chinese text is protected from empty update payloads", async () => {
  const sql = await readFile(triggerMigration, "utf8");
  assert.match(sql, /new\.description_zh is null or btrim\(new\.description_zh\) = ''/);
  assert.match(sql, /new\.description_zh := old\.description_zh/);
  assert.match(sql, /new\.translation_updated_at := old\.translation_updated_at/);
});

test("WST player profile sync uses non-destructive career highlight upsert", async () => {
  const sql = await readFile(syncMigration, "utf8");
  assert.match(sql, /on conflict \(player_id,sequence_no\) do update set/);
  assert.match(sql, /description_en=excluded\.description_en/);
  assert.doesNotMatch(sql, /new_block[\s\S]*delete from public\.snooker_player_career_highlights/);
  assert.doesNotMatch(sql, /new_block[\s\S]*description_zh\s*=/);
});
