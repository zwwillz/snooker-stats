import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('compare teaser keeps link navigation and proactively prefetches the route', () => {
  const source = read('app/snooker/compare/player-compare-teaser.tsx');
  assert.equal(source.includes('import Link from "next/link"'), true);
  assert.equal(source.includes('href={compareHref}'), true);
  assert.equal(source.includes('router.push(compareHref)'), false);
  assert.equal(source.includes('router.prefetch(compareHref)'), true);
  assert.equal(source.includes('if (variant === "data") returnUrl.searchParams.set("view", "data")'), true);
});

test('home and data compare actions inherit neighboring button typography', () => {
  const css = read('app/snooker/compare/player-compare-teaser.module.css');
  assert.match(css, /\.actionFrame \.actionReset\s*\{[^}]*font-size:\s*inherit;/);
  assert.match(css, /\.actionFrame \.actionReset\s*\{[^}]*font-weight:\s*inherit;/);
  assert.doesNotMatch(css, /\.actionFrame \.actionReset\s*\{[^}]*font-weight:\s*850/);
});

test('compare teaser keeps each rank grouped under the matching player name', () => {
  const css = read('app/snooker/compare/player-compare-teaser.module.css');
  assert.match(css, /\.players > div:first-child \.avatar\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1 \/ span 2;/);
  assert.match(css, /\.players > div:first-child strong,\s*\.players > div:first-child small\s*\{[^}]*grid-column:\s*2;/);
  assert.match(css, /\.players > div:last-child \.avatar\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ span 2;/);
  assert.match(css, /\.players > div:last-child strong,\s*\.players > div:last-child small\s*\{[^}]*grid-column:\s*1;/);
});

test('world ranking snapshots keep public player ranking fields synchronized', () => {
  const migration = read('supabase/migrations/20260904092000_keep_player_world_rank_in_sync.sql');
  assert.match(migration, /when \(new\.ranking_type = 'world_official'\)/);
  assert.match(migration, /current_rank = new\.rank/);
  assert.match(migration, /ranking_points = coalesce\(new\.ranking_money, new\.points\)/);
  assert.match(migration, /from public\.snooker_latest_rankings r/);
  assert.match(migration, /r\.list_key = 'world_official'/);
});

test('compare return restores the exact source route including player/data SPA state', () => {
  const compare = read('app/snooker/compare/player-compare-client.tsx');
  const player = read('app/snooker/players/player-detail-inline.tsx');
  const root = read('app/snooker/snooker-data-center-v2.tsx');
  assert.equal(compare.includes('target.pathname'), true);
  assert.equal(compare.includes('target.search'), true);
  assert.equal(compare.includes('target.hash'), true);
  assert.equal(compare.includes('window.history.back()'), true);
  assert.equal(compare.includes('sessionStorage.setItem("snooker-compare-restore", target.href)'), true);
  assert.equal(player.includes('sessionStorage.setItem("snooker-compare-return", window.location.href)'), true);
  assert.equal(player.includes('router.prefetch(compareHref)'), true);
  assert.equal(root.includes('sessionStorage.getItem("snooker-compare-restore")'), true);
  assert.equal(root.includes('setDetail({ type: "player", slug: playerSlug'), true);
  assert.equal(root.includes('setActiveView(restoredView)'), true);
});

test('homepage exposes up to four priority live matches and keeps only user-facing update copy', () => {
  const live = read('lib/snooker/live-client.ts');
  const home = read('app/snooker/snooker-data-center-v2.tsx');
  assert.equal(live.includes('selectHomepageHeadlineMatches'), true);
  assert.equal(live.includes('Math.min(4, limit)'), true);
  assert.equal(home.includes('headlineCarousel'), true);
  assert.equal(home.includes('左右滑动'), true);
  assert.equal(home.includes('className={priority.scoreUpdated}'), true);
  assert.equal(home.includes('className={styles.dataStatus}'), false);
  assert.equal(home.includes('30秒同步 ·'), false);
});

test('compare page uses the shared site background and detail-style back control', () => {
  const css = read('app/snooker/compare/player-compare.module.css');
  assert.equal(css.includes('PLAYER_COMPARE_NAV_BACKGROUND_V3'), true);
  assert.equal(css.includes('topbar>button.backLink'), true);
  assert.equal(css.includes('linear-gradient(180deg,#edf4f1'), true);
});
