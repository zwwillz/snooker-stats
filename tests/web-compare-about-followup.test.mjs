import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("web player compare uses the shared canvas, global navigation, and readable desktop type", async () => {
  const [client, css, header] = await Promise.all([
    read("app/snooker/compare/player-compare-client.tsx"),
    read("app/snooker/compare/player-compare.module.css"),
    read("app/snooker/public-site-header.tsx"),
  ]);

  assert.match(client, /<PublicSiteHeader active="players" \/>/);
  assert.match(header, /label: "球员", labelEn: "PLAYERS"/);
  assert.doesNotMatch(client, /shareButton|navigator\.clipboard/);
  assert.match(css, /PLAYER_COMPARE_WEB_FOLLOWUP_V1/);
  assert.match(css, /\.hero,\.tabs,\.seasonToolbar,\.tabContent,\.dataFooter,\.errorBox,\.emptyState\{width:min\(1120px,calc\(100% - 40px\)\);max-width:none\}/);
  assert.match(css, /\.tabs\{top:64px\}/);
  assert.match(css, /\.metricRow>span small\{font-size:10px\}/);
});

test("web about page uses the shared header and raises small desktop copy", async () => {
  const [chrome, css] = await Promise.all([
    read("app/about/about-chrome.tsx"),
    read("app/about/about.module.css"),
  ]);

  assert.match(chrome, /<PublicSiteHeader \/>/);
  assert.match(css, /ABOUT_WEB_FOLLOWUP_V1/);
  assert.match(css, /\.shell\{width:min\(1120px,calc\(100% - 40px\)\);padding:38px 0 42px\}/);
  assert.match(css, /\.sourceCards small\{font-size:11px/);
  assert.match(css, /\.noteCard p\{font-size:13px/);
  assert.match(css, /\.independent p\{font-size:11px/);
});
