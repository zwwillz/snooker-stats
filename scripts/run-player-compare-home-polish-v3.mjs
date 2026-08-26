import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = 'scripts/apply-player-compare-home-polish-v3.mjs';
const tempPath = 'scripts/.apply-player-compare-home-polish-v3.runtime.mjs';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = '// 7) Regression coverage for this polish pass.';
const cutoff = source.indexOf(marker);
if (cutoff < 0) throw new Error('Unable to sanitize polish patch script');
fs.writeFileSync(tempPath, source.slice(0, cutoff));
try {
  await import(`${pathToFileURL(process.cwd() + '/' + tempPath).href}?v=${Date.now()}`);
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}

const test = `import test from 'node:test';
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

test('homepage exposes up to four priority live matches and hides ops copy', () => {
  const live = read('lib/snooker/live-client.ts');
  const home = read('app/snooker/snooker-data-center-v2.tsx');
  assert.equal(live.includes('selectHomepageHeadlineMatches'), true);
  assert.equal(live.includes('Math.min(4, limit)'), true);
  assert.equal(home.includes('headlineCarousel'), true);
  assert.equal(home.includes('左右滑动'), true);
  assert.equal(home.includes('sourceHealth?.sourceLabel ??'), false);
});

test('compare page uses the shared site background and detail-style back control', () => {
  const css = read('app/snooker/compare/player-compare.module.css');
  assert.equal(css.includes('PLAYER_COMPARE_NAV_BACKGROUND_V3'), true);
  assert.equal(css.includes('topbar>button.backLink'), true);
  assert.equal(css.includes('linear-gradient(180deg,#edf4f1'), true);
});
`;
fs.writeFileSync('tests/snooker-player-compare-home-polish-v3.test.mjs', test);
