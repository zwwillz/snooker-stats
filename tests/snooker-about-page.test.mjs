import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aboutPage = readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const aboutChrome = readFileSync(new URL("../app/about/about-chrome.tsx", import.meta.url), "utf8");
const aboutCss = readFileSync(new URL("../app/about/about.module.css", import.meta.url), "utf8");
const aboutStats = readFileSync(new URL("../lib/snooker/public-site-stats.ts", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeExtras = readFileSync(new URL("../app/snooker/home-extras.tsx", import.meta.url), "utf8");
const homeCard = readFileSync(new URL("../app/snooker/home-about-card.tsx", import.meta.url), "utf8");
const homeCardCss = readFileSync(new URL("../app/snooker/home-about-card.module.css", import.meta.url), "utf8");

test("about page keeps the approved project positioning and private contact presentation", () => {
  assert.match(aboutPage, /因为喜欢斯诺克，所以想把它的数据认真整理下来/);
  assert.match(aboutPage, /1977年至今的世界斯诺克巡回赛/);
  assert.match(aboutPage, /const CONTACT_EMAIL = "zw\.will@outlook\.com"/);
  assert.doesNotMatch(aboutPage, />zw\.will@outlook\.com</);
  assert.match(aboutPage, /反馈数据问题/);
  assert.match(aboutPage, /联系147数据局/);
  assert.match(aboutPage, /任浩江老师/);
  assert.match(aboutPage, /系统性、批量化复制/);
  assert.match(aboutPage, /className={styles\.eyebrow}>ABOUT</);
  assert.doesNotMatch(aboutPage, /ABOUT 147 DATA/);
});

test("about page follows the main site theme and fast homepage return pattern", () => {
  assert.match(aboutChrome, /snooker-theme/);
  assert.match(aboutChrome, /dataset\.snookerTheme/);
  assert.match(aboutChrome, /window\.history\.back\(\)/);
  assert.match(aboutChrome, /brandMark}>S</);
  assert.match(aboutChrome, /147数据局/);
  assert.match(aboutCss, /data-snooker-theme="red"/);
  assert.match(aboutCss, /--accent:#d81336/);
  assert.match(aboutCss, /--accent:#0b7a55/);
  assert.match(aboutCss, /margin-top:14px/);
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

test("homepage exposes the lightweight theme-aware about entry directly on the home view", () => {
  assert.match(homePage, /import HomeExtras/);
  assert.match(homePage, /useHomeBootstrap \? <HomeExtras leaders=\{homeLeaders\} \/> : null/);
  assert.match(homeExtras, /<HomeAboutCard \/>/);
  assert.match(homeCard, /href="\/about"/);
  assert.doesNotMatch(homeCard, /findHomepagePortalTarget|createPortal|MutationObserver/);
  assert.match(homeCard, /<small>ABOUT<\/small>/);
  assert.match(homeCard, /snooker-about-return/);
  assert.match(homeCardCss, /var\(--accent-faint/);
  assert.match(homeCardCss, /var\(--accent-soft/);
});
