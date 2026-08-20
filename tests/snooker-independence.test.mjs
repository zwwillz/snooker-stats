import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function missing(path) {
  await assert.rejects(access(new URL(path, root)));
}

test("repository contains only the independent snooker application surface", async () => {
  await Promise.all([
    missing("app/admin/page.tsx"),
    missing("app/api/admin/overview/route.ts"),
    missing("app/api/public/visit/route.ts"),
    missing("db/index.ts"),
    missing("drizzle.config.ts"),
  ]);

  const [manifest, layout, tracker, redirectPage, opsApi] = await Promise.all([
    read("package.json"),
    read("app/layout.tsx"),
    read("app/snooker-visit-tracker.tsx"),
    read("app/snooker/page.tsx"),
    read("lib/snooker/ops-api.ts"),
  ]);

  for (const dependency of ["drizzle-orm", "drizzle-kit", "postgres", "bcryptjs", "ws"]) {
    assert.doesNotMatch(manifest, new RegExp(`"${dependency}"`));
  }
  assert.match(layout, /SnookerVisitTracker/);
  assert.match(tracker, /\/api\/snooker\/v1\/visit/);
  assert.doesNotMatch(tracker, /huacai/i);
  assert.match(redirectPage, /redirect\("\/"\)/);
  assert.match(opsApi, /rtlvncsmbueatdzqvhbn\.supabase\.co/);
  assert.doesNotMatch(opsApi, /SERVICE_ROLE|DATABASE_URL/);
});
