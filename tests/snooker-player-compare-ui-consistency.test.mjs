import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("player compare teaser reuses page section headers and action buttons", async () => {
  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");
  const home = await read("app/snooker/snooker-data-center-v2.tsx");
  const data = await read("app/snooker/data/data-ranking-content.tsx");
  assert.match(teaser, /headerClassName: string/);
  assert.match(home, /actionClassName={styles\.fullButton} headerClassName={styles\.sectionHeader}/);
  assert.match(data, /actionClassName={styles\.primaryAction} headerClassName={styles\.sectionHeader}/);
  assert.match(teaser, /variant === "data" \? <>开始球员对比 <span>›<\/span><\/> : "查看完整球员对比"/);
});

test("player compare route warms only when the shared action is approached or used", async () => {
  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");
  assert.match(teaser, /const warmCompare = \(\) => \{/);
  assert.match(teaser, /router\.prefetch\(compareHref\)/);
  assert.match(teaser, /onPointerEnter=\{warmCompare\}/);
  assert.match(teaser, /onPointerDown=\{warmCompare\}/);
  assert.match(teaser, /onFocus=\{warmCompare\}/);
  assert.match(teaser, /prefetch=\{false\}/);
  assert.match(teaser, /import Link from "next\/link"/);
  assert.match(teaser, /href=\{compareHref\}/);
  assert.doesNotMatch(teaser, /router\.push\(compareHref\)/);
});

test("player compare mobile typography and VS control follow the site theme", async () => {
  const css = await read("app/snooker/compare/player-compare.module.css");
  assert.match(css, /PLAYER_COMPARE_UI_CONSISTENCY_V2/);
  assert.match(css, /summaryCard[\s\S]*padding: 18px/);
  assert.match(css, /playerHero > div strong[\s\S]*font-size: 16px/);
  assert.match(css, /metricRow > strong[\s\S]*font-size: 16px/);
  assert.match(css, /swapButton[\s\S]*var\(--accent-strong\)[\s\S]*var\(--accent-soft\)/);
});
