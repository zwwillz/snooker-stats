import { appendFile, readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Anchor not found in ${path}: ${before.slice(0, 140)}`);
  await writeFile(path, source.replace(before, after));
  return true;
}

async function appendOnce(path, marker, block) {
  const source = await readFile(path, "utf8");
  if (source.includes(marker)) return false;
  await appendFile(path, `\n${block}\n`);
  return true;
}

// 1) Root page preloads the default comparison snapshot so homepage/data-page cards render immediately.
await replaceOnce(
  "app/page.tsx",
  'import { CURRENT_RANKING_KEYS, loadSnookerRankingHub, type SnookerCurrentRankingKey, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";\n',
  'import { CURRENT_RANKING_KEYS, loadSnookerRankingHub, type SnookerCurrentRankingKey, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";\nimport { loadPlayerCompare } from "@/lib/snooker/player-compare";\n',
);

await replaceOnce(
  "app/page.tsx",
  '  const database = await refreshSnookerDatabaseViewLive(cachedDatabase);\n  const requestedPlayer = query.player?.trim() || null;\n',
  '  const database = await refreshSnookerDatabaseViewLive(cachedDatabase);\n  const teaserPlayers = [...database.snapshot.players]\n    .filter((player) => player.isCurrentTour ?? player.currentRank !== null)\n    .sort((a, b) => (a.currentRank ?? 9999) - (b.currentRank ?? 9999) || a.nameEn.localeCompare(b.nameEn))\n    .slice(0, 2);\n  const initialPlayerCompare = teaserPlayers.length === 2\n    ? await loadPlayerCompare(teaserPlayers[0].slug, teaserPlayers[1].slug).catch(() => null)\n    : null;\n  const requestedPlayer = query.player?.trim() || null;\n',
);

await replaceOnce(
  "app/page.tsx",
  '        initialRankingSection={initialDataSection ? rankingSection(query.group) : "current"}\n',
  '        initialRankingSection={initialDataSection ? rankingSection(query.group) : "current"}\n        initialPlayerCompare={initialPlayerCompare}\n',
);

// 2) Main shell persists the color theme and feeds preloaded comparison data into both entry cards.
await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  'import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";\n',
  'import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";\nimport type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '  initialRankingSection = "current",\n}: {\n',
  '  initialRankingSection = "current",\n  initialPlayerCompare,\n}: {\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '  initialRankingSection?: SnookerRankingSection;\n}) {\n',
  '  initialRankingSection?: SnookerRankingSection;\n  initialPlayerCompare?: PlayerCompareSnapshot | null;\n}) {\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '  const playerDirectoryScrollY = useRef(0);\n\n  const players = useMemo(() => playerMap(snapshot), [snapshot]);\n',
  '  const playerDirectoryScrollY = useRef(0);\n\n  useEffect(() => {\n    try {\n      const stored = window.localStorage.getItem("snooker-theme");\n      if (stored === "green" || stored === "red") setTheme(stored);\n    } catch {\n      // Keep the default theme when storage is unavailable.\n    }\n  }, []);\n\n  useEffect(() => {\n    document.documentElement.dataset.snookerTheme = theme;\n    try {\n      window.localStorage.setItem("snooker-theme", theme);\n    } catch {\n      // Theme still applies for the current document.\n    }\n  }, [theme]);\n\n  const players = useMemo(() => playerMap(snapshot), [snapshot]);\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '        <PlayerCompareTeaser players={directoryPlayers} />',
  '        <PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} />',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '      {activeView === "data" ? <DataHubContent hub={initialRankingHub} players={directoryPlayers} selectedKey={selectedRankingKey} onSelectKey={setSelectedRankingKey} onOpenRankings={openRankings} onOpenPlayer={openPlayerBySlug} /> : null}',
  '      {activeView === "data" ? <DataHubContent hub={initialRankingHub} players={directoryPlayers} selectedKey={selectedRankingKey} onSelectKey={setSelectedRankingKey} onOpenRankings={openRankings} onOpenPlayer={openPlayerBySlug} initialPlayerCompare={initialPlayerCompare} /> : null}',
);

// 3) Data center entry uses the same primary button style as the rest of the page.
await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  'import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";\n',
  'import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";\nimport type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";\n',
);

await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  '  onOpenRankings,\n  onOpenPlayer,\n}: {\n',
  '  onOpenRankings,\n  onOpenPlayer,\n  initialPlayerCompare,\n}: {\n',
);

await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  '  onOpenPlayer: (slug: string) => void;\n}) {\n',
  '  onOpenPlayer: (slug: string) => void;\n  initialPlayerCompare?: PlayerCompareSnapshot | null;\n}) {\n',
);

await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  '    <PlayerCompareTeaser players={players} variant="data" />',
  '    <PlayerCompareTeaser players={players} variant="data" initialData={initialPlayerCompare} actionClassName={styles.primaryAction} />',
);

// 4) Teaser accepts preloaded data and adopts parent-page button styles.
await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '  variant = "home",\n}: {\n  players: SnookerPlayerListItem[];\n  variant?: "home" | "data";\n}) {\n',
  '  variant = "home",\n  initialData = null,\n  actionClassName,\n}: {\n  players: SnookerPlayerListItem[];\n  variant?: "home" | "data";\n  initialData?: PlayerCompareSnapshot | null;\n  actionClassName?: string;\n}) {\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '  const pair = useMemo(() => players.filter((player) => player.isCurrentTour).slice(0, 2), [players]);\n  const [data, setData] = useState<PlayerCompareSnapshot | null>(null);\n\n  useEffect(() => {\n    if (pair.length < 2) return;\n',
  '  const pair = useMemo(() => players.filter((player) => player.isCurrentTour).slice(0, 2), [players]);\n  const initialMatchesPair = Boolean(initialData && pair.length === 2 && initialData.players[0].slug === pair[0].slug && initialData.players[1].slug === pair[1].slug);\n  const [data, setData] = useState<PlayerCompareSnapshot | null>(() => initialMatchesPair ? initialData : null);\n\n  useEffect(() => {\n    if (pair.length < 2) return;\n    if (initialMatchesPair && initialData) {\n      setData(initialData);\n      return;\n    }\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '  }, [pair]);\n\n  if (pair.length < 2) return null;\n',
  '  }, [initialData, initialMatchesPair, pair]);\n\n  if (pair.length < 2) return null;\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '  const href = `/snooker/compare?player1=${encodeURIComponent(left.slug)}&player2=${encodeURIComponent(right.slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`;\n\n  return <section',
  '  const href = `/snooker/compare?player1=${encodeURIComponent(left.slug)}&player2=${encodeURIComponent(right.slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`;\n  const rememberReturn = () => {\n    try {\n      window.sessionStorage.setItem("snooker-compare-return", window.location.href);\n    } catch {\n      // Browser history remains the fallback.\n    }\n  };\n\n  return <section',
);

await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '      <div><strong>{percent(leftStats?.matchWinRate)}</strong><span>比赛胜率</span><strong>{percent(rightStats?.matchWinRate)}</strong></div>\n      <div><strong>{percent(leftStats?.frameWinRate)}</strong><span>局胜率</span><strong>{percent(rightStats?.frameWinRate)}</strong></div>\n      <div><strong>{integer(leftStats?.breaks100Plus)}</strong><span>破百</span><strong>{integer(rightStats?.breaks100Plus)}</strong></div>\n      <div><strong>{data ? integer(data.h2h.leftWins) : "—"}</strong><span>历史交手胜场</span><strong>{data ? integer(data.h2h.rightWins) : "—"}</strong></div>\n    </div>\n    <Link className={styles.action} href={href}>{variant === "data" ? "开始球员对比" : "查看完整对比"}<span>›</span></Link>\n',
  '      <div><strong>{data ? percent(leftStats?.matchWinRate) : "…"}</strong><span>比赛胜率</span><strong>{data ? percent(rightStats?.matchWinRate) : "…"}</strong></div>\n      <div><strong>{data ? percent(leftStats?.frameWinRate) : "…"}</strong><span>局胜率</span><strong>{data ? percent(rightStats?.frameWinRate) : "…"}</strong></div>\n      <div><strong>{data ? integer(leftStats?.breaks100Plus) : "…"}</strong><span>破百</span><strong>{data ? integer(rightStats?.breaks100Plus) : "…"}</strong></div>\n      <div><strong>{data ? integer(data.h2h.leftWins) : "…"}</strong><span>历史交手胜场</span><strong>{data ? integer(data.h2h.rightWins) : "…"}</strong></div>\n    </div>\n    <Link className={actionClassName ? `${styles.actionReset} ${actionClassName}` : styles.action} href={href} onClick={rememberReturn}>{variant === "data" ? "开始球员对比" : "查看完整球员对比"}<span>›</span></Link>\n',
);

// 5) Compare page: instant history-back, inherited theme, smaller typography, season control below the season tab.
await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  'import Link from "next/link";\nimport { useMemo, useState } from "react";\n',
  'import { useEffect, useMemo, useState } from "react";\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  'function leadCount(left: PlayerCompareSeason | null, right: PlayerCompareSeason | null, players: [PlayerComparePlayer, PlayerComparePlayer]) {\n  if (!left || !right) return { left: 0, right: 0, ties: 0 };\n  const values: Array<[number | null | undefined, number | null | undefined, Trend]> = [\n    [left.ranking ?? players[0].currentRank, right.ranking ?? players[1].currentRank, "lower"],\n',
  'function seasonRanking(data: PlayerCompareSnapshot, stat: PlayerCompareSeason | null, player: PlayerComparePlayer) {\n  const currentSeason = data.availableSeasons[0] ?? data.season;\n  return data.season === currentSeason ? player.currentRank : stat?.ranking ?? null;\n}\n\nfunction leadCount(data: PlayerCompareSnapshot) {\n  const [left, right] = data.seasonStats;\n  const players = data.players;\n  if (!left || !right) return { left: 0, right: 0, ties: 0 };\n  const values: Array<[number | null | undefined, number | null | undefined, Trend]> = [\n    [seasonRanking(data, left, players[0]), seasonRanking(data, right, players[1]), "lower"],\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '  const leads = leadCount(left, right, data.players);\n',
  '  const leads = leadCount(data);\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '      <MetricRow label="世界排名" left={left?.ranking ?? leftPlayer.currentRank} right={right?.ranking ?? rightPlayer.currentRank} format={fmtRank} trend="lower" />\n',
  '      <MetricRow label="世界排名" left={seasonRanking(data, left, leftPlayer)} right={seasonRanking(data, right, rightPlayer)} format={fmtRank} trend="lower" />\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '  const [copied, setCopied] = useState(false);\n\n  const load = async',
  '  const [copied, setCopied] = useState(false);\n\n  useEffect(() => {\n    try {\n      const stored = window.localStorage.getItem("snooker-theme");\n      if (stored === "green" || stored === "red") document.documentElement.dataset.snookerTheme = stored;\n    } catch {\n      // Keep the default compare theme when storage is unavailable.\n    }\n  }, []);\n\n  const load = async',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '  const share = async () => {\n',
  '  const goBack = () => {\n    try {\n      const returnUrl = window.sessionStorage.getItem("snooker-compare-return");\n      if (returnUrl && new URL(returnUrl).origin === window.location.origin && window.history.length > 1) {\n        window.sessionStorage.removeItem("snooker-compare-return");\n        window.history.back();\n        return;\n      }\n    } catch {\n      // Fall through to the lightweight data-center route.\n    }\n    router.replace("/?view=data", { scroll: false });\n  };\n\n  const share = async () => {\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '      <Link href="/?view=data" className={styles.backLink}>‹ <span>返回数据中心</span></Link>\n',
  '      <button type="button" className={styles.backLink} onClick={goBack}>‹ <span>返回</span></button>\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '        <button className={styles.swapButton} type="button" onClick={swapPlayers} aria-label="交换球员">⇄<span>VS</span></button>\n',
  '        <div className={styles.vsControl}><button className={styles.swapButton} type="button" onClick={swapPlayers} aria-label="交换球员">⇄<span>VS</span></button><small>{loading ? "同步中…" : data ? `更新 ${displayUpdated(data.updatedAt)}` : "数据加载中"}</small></div>\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '\n      <div className={styles.heroControls}>\n        <label>赛季<select value={data?.season ?? ""} disabled={!data || loading} onChange={(event) => void load(selected, event.target.value)}>{data?.availableSeasons.map((season) => <option value={season} key={season}>{season}</option>)}</select></label>\n        <span>{loading ? "正在更新对比…" : data ? `数据更新 ${displayUpdated(data.updatedAt)}` : "数据加载中"}</span>\n      </div>\n',
  '\n',
);

await replaceOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '    </nav>\n\n    {error ?',
  '    </nav>\n\n    {tab === "season" ? <div className={styles.seasonToolbar}><label><span>赛季</span><select value={data?.season ?? ""} disabled={!data || loading} onChange={(event) => void load(selected, event.target.value)}>{data?.availableSeasons.map((season) => <option value={season} key={season}>{season}</option>)}</select></label><small>仅影响赛季表现数据</small></div> : null}\n\n    {error ?',
);

// 6) Theme-aware teaser styles and inherited standard actions.
await appendOnce(
  "app/snooker/compare/player-compare-teaser.module.css",
  ".actionReset {",
  `.header small { color: var(--accent, #0b7a55); }\n.header > span { color: var(--accent-strong, #075b40); background: var(--accent-soft, #eaf6f1); }\n.action { color: var(--accent-strong, #075b40); }\n.actionReset { display:flex; align-items:center; justify-content:center; gap:5px; text-decoration:none; }\n.actionReset span { font-size:16px; line-height:1; }`,
);

// 7) Compare page visual tuning, theme inheritance and new control layout.
await appendOnce(
  "app/snooker/compare/player-compare.module.css",
  "/* PLAYER_COMPARE_POLISH_V1 */",
  `/* PLAYER_COMPARE_POLISH_V1 */\n.page {\n  --accent:#0b7a55;\n  --accent-strong:#075b40;\n  --accent-dark:#063d2d;\n  --accent-soft:#eaf6f1;\n  --accent-faint:#f5faf7;\n  --accent-shadow:rgba(6,61,45,.16);\n  --green:var(--accent);\n  --green-strong:var(--accent-strong);\n  --green-soft:var(--accent-soft);\n}\n:global(html[data-snooker-theme="red"]) .page {\n  --accent:#d81336;\n  --accent-strong:#b80e2b;\n  --accent-dark:#7b071d;\n  --accent-soft:#fff0f3;\n  --accent-faint:#fff7f8;\n  --accent-shadow:rgba(123,7,29,.14);\n  background:linear-gradient(180deg,#f9ecef 0,#f8f7f7 180px,#f6f6f5 100%);\n}\n.hero { padding-top:32px; padding-bottom:22px; }\n.heroTitle small,.sectionHeader small,.summaryHead small { font-size:8px; letter-spacing:.14em; }\n.heroTitle h1 { margin:6px 0 7px; font-size:clamp(30px,4vw,40px); }\n.heroTitle p { font-size:11px; }\n.playerHero > div strong { font-size:20px; }\n.playerHero > div small,.playerHero > div span { font-size:11px; }\n.summaryHead h2,.sectionHeader h2 { font-size:19px; }\n.metricRow > strong { font-size:18px; }\n.metricRow > span b { font-size:11px; }\n.metricRow > span small { font-size:8px; }\n.summaryText,.h2hNote { font-size:10px; }\n.tabs button { min-height:54px; }\n.tabs button span { font-size:11px; }\n.tabs button small { font-size:7px; }\n.h2hHero { background:linear-gradient(135deg,var(--accent-dark),var(--accent)); box-shadow:0 14px 30px var(--accent-shadow); }\n.h2hHero > div > strong { font-size:44px; }\n.vsControl { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:7px; }\n.vsControl > small { max-width:96px; color:#87928c; font-size:8px; line-height:1.35; text-align:center; white-space:nowrap; }\n.seasonToolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; max-width:1124px; margin:10px auto 0; padding:10px 14px; border:1px solid var(--line); border-radius:13px; background:rgba(255,255,255,.9); }\n.seasonToolbar label { display:flex; align-items:center; gap:9px; color:var(--muted); font-size:10px; }\n.seasonToolbar select { min-width:112px; padding:7px 30px 7px 11px; border:1px solid #d7e0db; border-radius:10px; color:var(--ink); background:#fff; font-size:10px; font-weight:800; }\n.seasonToolbar small { color:#98a09c; font-size:8px; }\n.backLink { padding:7px 6px; }\n.topbar > button.backLink { justify-self:start; }\n@media (max-width:620px) {\n  .hero { padding-top:26px; padding-bottom:18px; }\n  .heroTitle h1 { font-size:30px; }\n  .heroTitle p { font-size:10px; }\n  .playerHero > div strong { font-size:17px; }\n  .playerHero > div small,.playerHero > div span { font-size:10px; }\n  .summaryHead h2,.sectionHeader h2 { font-size:18px; }\n  .metricRow > strong { font-size:17px; }\n  .metricRow > span b { font-size:10px; }\n  .seasonToolbar { margin:8px 12px 0; padding:9px 11px; }\n  .seasonToolbar small { display:none; }\n  .vsControl > small { max-width:72px; font-size:7px; }\n}`,
);

// 8) Regression coverage for the requested polish points.
await appendOnce(
  "tests/snooker-player-compare.test.mjs",
  'test("player compare polish keeps historical rankings honest"',
  `test("player compare polish keeps historical rankings honest", async () => {\n  const client = await read("app/snooker/compare/player-compare-client.tsx");\n  assert.match(client, /data\\.season === currentSeason \\? player\\.currentRank : stat\\?\\.ranking \\?\\? null/);\n  assert.doesNotMatch(client, /left\\?\\.ranking \\?\\? leftPlayer\\.currentRank/);\n});\n\ntest("player compare polish moves season selection below the season tab and keeps update time near VS", async () => {\n  const client = await read("app/snooker/compare/player-compare-client.tsx");\n  assert.match(client, /tab === "season" \\? <div className={styles\\.seasonToolbar}/);\n  assert.match(client, /className={styles\\.vsControl}/);\n  assert.doesNotMatch(client, /className={styles\\.heroControls}/);\n});\n\ntest("player compare entry cards can render from server-preloaded data and inherit page buttons", async () => {\n  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");\n  const rootPage = await read("app/page.tsx");\n  assert.match(teaser, /initialData\\?: PlayerCompareSnapshot/);\n  assert.match(teaser, /actionClassName\\?: string/);\n  assert.match(rootPage, /initialPlayerCompare={initialPlayerCompare}/);\n});\n\ntest("player compare follows the main green-red theme selection", async () => {\n  const shell = await read("app/snooker/snooker-data-center-v2.tsx");\n  const css = await read("app/snooker/compare/player-compare.module.css");\n  assert.match(shell, /localStorage\\.setItem\\("snooker-theme", theme\\)/);\n  assert.match(css, /html\\[data-snooker-theme="red"\\]/);\n});`,
);

console.log("Player Compare polish V1 patch applied.");
