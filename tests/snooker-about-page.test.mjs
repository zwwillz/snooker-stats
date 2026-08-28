import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aboutPage = readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const aboutStats = readFileSync(new URL("../lib/snooker/public-site-stats.ts", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeCard = readFileSync(new URL("../app/snooker/home-about-card.tsx", import.meta.url), "utf8");

test("about page keeps the approved project positioning and contact", () => {
  assert.match(aboutPage, /因为喜欢斯诺克，所以想把它的数据认真整理下来/);
  assert.match(aboutPage, /1977年至今的世界斯诺克巡回赛/);
  assert.match(aboutPage, /zw\.will@outlook\.com/);
  assert.match(aboutPage, /任浩江老师/);
  assert.match(aboutPage, /系统性、批量化复制/);
});

test("about statistics use warehouse counts with the requested display factors", () => {
  assert.match(aboutStats, /players: 1\.2/);
  assert.match(aboutStats, /events: 1\.8/);
  assert.match(aboutStats, /matches: 1\.8/);
  assert.match(aboutStats, /frames: 1\.8/);
  assert.match(aboutStats, /h2hPairs: 1\.5/);
  assert.match(aboutStats, /count=exact/);
  assert.match(aboutStats, /revalidate: ABOUT_STATS_REVALIDATE_SECONDS/);
});

test("homepage exposes only the lightweight about entry on the home view", () => {
  assert.match(homePage, /import HomeAboutCard/);
  assert.match(homePage, /<HomeAboutCard \/>/);
  assert.match(homeCard, /href="\/about"/);
  assert.match(homeCard, /isHomeUrl\(\)/);
});
