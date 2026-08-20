import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("production Supabase migration history is versioned in the repository", async () => {
  const files = (await readdir(new URL("supabase/migrations/", root)))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  assert.equal(files.length, 59);
  assert.equal(files[0], "20260816151702_initialize_snooker_data_center.sql");
  assert.equal(files.at(-1), "20260820192152_harden_public_access_and_sync_queue.sql");

  const [checksumSource, hardening] = await Promise.all([
    read("supabase/migration-checksums.json"),
    read("supabase/migrations/20260820192152_harden_public_access_and_sync_queue.sql"),
  ]);
  const checksums = JSON.parse(checksumSource).migrations;
  const productionFiles = files.slice(0, checksums.length);
  const sources = await Promise.all(productionFiles.map((name) => read("supabase/migrations/" + name)));
  assert.equal(checksums.length, 58);
  productionFiles.forEach((name, index) => {
    const version = name.slice(0, 14);
    assert.equal(checksums[index].version, version);
    assert.equal(createHash("md5").update(sources[index]).digest("hex"), checksums[index].md5);
  });
  const combined = sources.join("\n");
  assert.match(combined, /create table if not exists public\.snooker_players/);
  assert.match(combined, /create schema if not exists snooker_internal/);
  assert.match(combined, /player-avatars/);
  assert.match(combined, /snooker-live-sync-v2/);
  assert.match(combined, /snooker-manual-sync-worker-v2/);
  assert.match(combined, /snooker-sync-supervisor-v2/);
  assert.doesNotMatch(combined, /sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(combined, /sb_publishable_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(combined, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.match(hardening, /drop extension if exists pg_net/);
  assert.match(hardening, /revoke execute on all functions in schema public/);
  assert.match(hardening, /snooker_sync_manual_queue_job_key_idx/);
  assert.match(hardening, /deny_client_snooker_visit_logs/);
});

test("active and retired Edge Functions are explicitly inventoried", async () => {
  const [config, ops, resize256, resize512, retiredProbe] = await Promise.all([
    read("supabase/config.toml"),
    read("supabase/functions/snooker-ops-api/index.ts"),
    read("supabase/functions/hyper-api/index.ts"),
    read("supabase/functions/generate-player-avatar-webp/index.ts"),
    read("supabase/retired-functions/avatar-resize-probe/index.ts"),
  ]);

  assert.match(config, /\[functions\.snooker-ops-api\][\s\S]*verify_jwt = false/);
  assert.match(config, /\[functions\.hyper-api\][\s\S]*verify_jwt = true/);
  assert.match(config, /\[functions\.generate-player-avatar-webp\][\s\S]*verify_jwt = true/);
  assert.match(ops, /snooker_ops_run_action/);
  assert.match(resize256, /TARGET_PREFIX = "wst\/256"/);
  assert.match(resize512, /TARGET_PREFIX = "wst\/512"/);
  assert.match(retiredProbe, /status: 410/);
});

test("runtime Supabase configuration is environment-only", async () => {
  const [config, database, operations, rankings, technical, honours] = await Promise.all([
    read("lib/snooker/supabase-config.ts"),
    read("lib/snooker/database-public.ts"),
    read("lib/snooker/ops-api.ts"),
    read("lib/snooker/ranking-hub.ts"),
    read("lib/snooker/technical-hub.ts"),
    read("lib/snooker/honours-hub.ts"),
  ]);

  assert.match(config, /SNOOKER_SUPABASE_URL/);
  assert.match(config, /SNOOKER_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(config, /SNOOKER_BUILD_OFFLINE/);
  assert.doesNotMatch(config, /rtlvncsmbueatdzqvhbn|sb_publishable_/);
  assert.match(database, /getSnookerSupabasePublicConfig/);
  assert.match(operations, /getSnookerSupabasePublicConfig/);
  for (const clientImportedModule of [rankings, technical, honours]) {
    assert.doesNotMatch(clientImportedModule, /const \\{ url: SUPABASE_URL, publishableKey: SUPABASE_KEY \\} = getSnookerSupabasePublicConfig\\(\\)/);
    assert.match(clientImportedModule, /const \\{ url, publishableKey \\} = getSnookerSupabasePublicConfig\\(\\)/);
  }
});

test("legacy public API routes use the independent Supabase read model", async () => {
  const routes = await Promise.all([
    read("app/api/snooker/v1/dashboard/route.ts"),
    read("app/api/snooker/v1/event/route.ts"),
    read("app/api/snooker/v1/players/route.ts"),
    read("app/api/snooker/v1/rankings/route.ts"),
  ]);

  for (const route of routes) {
    assert.match(route, /loadSnookerDatabaseViewV2/);
    assert.doesNotMatch(route, /getSnookerRepository/);
  }
});
