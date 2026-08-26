import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('compare teaser reuses neighboring button semantics and prefetches route', () => {
  const source = read('app/snooker/compare/player-compare-teaser.tsx');
  assert.equal(source.includes('import Link from "next/link"'), false);
  assert.equal(source.includes('router.push(compareHref)'), true);
  assert.equal(source.includes('router.prefetch(compareHref)'), true);
});

test('compare return restores the exact source route including player/data SPA state', () => {
  const compare = read('app/snooker/compare/player-compare-client.tsx');
  const player = read('app/snooker/players/player-detail-inline.tsx');
  assert.equal(compare.includes('target.pathname'), true);
  assert.equal(compare.includes('target.search'), true);
  assert.equal(compare.includes('target.hash'), true);
  assert.equal(compare.includes('window.history.back()'), false);
  assert.equal(player.includes('sessionStorage.setItem("snooker-compare-return", window.location.href)'), true);
});

test('homepage exposes up to four priority live matches and keeps only user-facing update copy', () => {
  const live = read('lib/snooker/live-client.ts');
  const home = read('app/snooker/snooker-data-center-v2.tsx');
  assert.equal(live.includes('selectHomepageHeadlineMatches'), true);
  assert.equal(live.includes('Math.min(4, limit)'), true);
  assert.equal(home.includes('headlineCarousel'), true);
  assert.equal(home.includes('左右滑动'), true);
  assert.equal(home.includes('className={priority.scoreUpdated}'), true);
  assert.equal(home.includes('<span>更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span>'), true);
  assert.equal(home.includes('30秒同步 ·'), false);
});

test('compare page uses the shared site background and detail-style back control', () => {
  const css = read('app/snooker/compare/player-compare.module.css');
  assert.equal(css.includes('PLAYER_COMPARE_NAV_BACKGROUND_V3'), true);
  assert.equal(css.includes('topbar>button.backLink'), true);
  assert.equal(css.includes('linear-gradient(180deg,#edf4f1'), true);
});
