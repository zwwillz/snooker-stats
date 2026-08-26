import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Anchor not found in ${path}: ${before.slice(0, 80)}`);
  await writeFile(path, source.replace(before, after));
}

async function appendOnce(path, marker, block) {
  const source = await readFile(path, "utf8");
  if (source.includes(marker)) return;
  await writeFile(path, `${source.trimEnd()}\n\n${block.trim()}\n`);
}

const teaser = "app/snooker/compare/player-compare-teaser.tsx";
await replaceOnce(
  teaser,
  'import Link from "next/link";\nimport { useEffect, useMemo, useState } from "react";\n',
  'import Link from "next/link";\nimport { useRouter } from "next/navigation";\nimport { useEffect, useMemo, useState } from "react";\n',
);
await replaceOnce(
  teaser,
  '  actionClassName,\n}: {\n  players: SnookerPlayerListItem[];\n  variant?: "home" | "data";\n  initialData?: PlayerCompareSnapshot | null;\n  actionClassName?: string;\n}) {\n  const pair = useMemo(() => players.filter((player) => player.isCurrentTour).slice(0, 2), [players]);\n',
  '  actionClassName,\n  headerClassName,\n}: {\n  players: SnookerPlayerListItem[];\n  variant?: "home" | "data";\n  initialData?: PlayerCompareSnapshot | null;\n  actionClassName?: string;\n  headerClassName: string;\n}) {\n  const router = useRouter();\n  const pair = useMemo(() => players.filter((player) => player.isCurrentTour).slice(0, 2), [players]);\n',
);
await replaceOnce(
  teaser,
  '  const [data, setData] = useState<PlayerCompareSnapshot | null>(() => initialMatchesPair ? initialData : null);\n\n  useEffect(() => {\n',
  '  const [data, setData] = useState<PlayerCompareSnapshot | null>(() => initialMatchesPair ? initialData : null);\n  const compareHref = pair.length === 2\n    ? `/snooker/compare?player1=${encodeURIComponent(pair[0].slug)}&player2=${encodeURIComponent(pair[1].slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`\n    : "/snooker/compare";\n\n  useEffect(() => {\n    if (pair.length === 2) router.prefetch(compareHref);\n  }, [compareHref, pair.length, router]);\n\n  useEffect(() => {\n',
);
await replaceOnce(
  teaser,
  '  const href = `/snooker/compare?player1=${encodeURIComponent(left.slug)}&player2=${encodeURIComponent(right.slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`;\n',
  '',
);
await replaceOnce(
  teaser,
  '  return <section className={`${styles.card} ${variant === "data" ? styles.dataVariant : ""}`}>\n    <header className={styles.header}>\n      <div><small>PLAYER COMPARE</small><h2>球员对比</h2><p>{variant === "data" ? "赛季表现、职业生涯、直接交手与荣誉，一页比较。" : "谁的赛季表现更强？"}</p></div>\n      <span>{data?.season ?? "当前赛季"}</span>\n    </header>\n',
  '  return <section className={`${styles.card} ${variant === "data" ? styles.dataVariant : ""}`}>\n    <div className={styles.headerFrame}>\n      <header className={`${styles.header} ${headerClassName}`}>\n        <div><small>PLAYER COMPARE</small><h2>球员对比</h2><p>{variant === "data" ? "赛季表现、职业生涯、直接交手与荣誉，一页比较。" : "谁的赛季表现更强？"}</p></div>\n        <span>{data?.season ?? "当前赛季"}</span>\n      </header>\n    </div>\n',
);
await replaceOnce(
  teaser,
  '    <Link className={actionClassName ? `${styles.actionReset} ${actionClassName}` : styles.action} href={href} onClick={rememberReturn}>{variant === "data" ? "开始球员对比" : "查看完整球员对比"}<span>›</span></Link>\n',
  '    <div className={styles.actionFrame}>\n      <Link\n        className={actionClassName ? `${styles.actionReset} ${actionClassName}` : styles.action}\n        href={compareHref}\n        prefetch={true}\n        onPointerEnter={() => router.prefetch(compareHref)}\n        onPointerDown={() => router.prefetch(compareHref)}\n        onFocus={() => router.prefetch(compareHref)}\n        onClick={rememberReturn}\n      >\n        {variant === "data" ? <>开始球员对比 <span>›</span></> : "查看完整球员对比"}\n      </Link>\n    </div>\n',
);

const teaserCss = "app/snooker/compare/player-compare-teaser.module.css";
await replaceOnce(
  teaserCss,
  '.header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 18px;\n  padding: 20px 22px 15px;\n}\n\n.header small {\n  color: #0f6a4a;\n  font-size: 10px;\n  font-weight: 900;\n  letter-spacing: .15em;\n}\n\n.header h2 {\n  margin: 4px 0 4px;\n  color: #18241e;\n  font-size: 21px;\n}\n',
  '.headerFrame {\n  padding: 18px 18px 0;\n}\n\n.header {\n  min-width: 0;\n}\n\n.header > div {\n  min-width: 0;\n}\n',
);
await replaceOnce(
  teaserCss,
  '@media (max-width: 560px) {\n  .header {\n    padding: 17px 16px 12px;\n  }\n\n  .players {\n',
  '@media (max-width: 560px) {\n  .players {\n',
);
await appendOnce(teaserCss, "PLAYER_COMPARE_SHARED_CARD_RULES_V2", `
/* PLAYER_COMPARE_SHARED_CARD_RULES_V2 */
.header p {
  margin-top: 4px;
}
.actionFrame {
  padding: 0 18px 18px;
}
.actionFrame .actionReset {
  width: 100%;
}
`);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '<PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} />',
  '<PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} headerClassName={styles.sectionHeader} />',
);
await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  '<PlayerCompareTeaser players={players} variant="data" initialData={initialPlayerCompare} actionClassName={styles.primaryAction} />',
  '<PlayerCompareTeaser players={players} variant="data" initialData={initialPlayerCompare} actionClassName={styles.primaryAction} headerClassName={styles.sectionHeader} />',
);

await appendOnce("app/snooker/compare/player-compare.module.css", "PLAYER_COMPARE_UI_CONSISTENCY_V2", `
/* PLAYER_COMPARE_UI_CONSISTENCY_V2 */
.summaryCard {
  padding: 18px;
}
.summaryHead {
  align-items: flex-end;
  padding-bottom: 14px;
}
.summaryHead small,
.sectionHeader small {
  display: block;
  margin-bottom: 4px;
  font-size: 8px;
  letter-spacing: .13em;
}
.summaryHead h2,
.sectionHeader h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -.035em;
}
.sectionCard {
  padding: 18px;
}
.sectionHeader {
  padding-bottom: 14px;
}
.playerHero > div strong {
  font-size: 19px;
}
.metricRow > strong {
  font-size: 17px;
}
.swapButton {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--line));
  color: var(--accent-strong);
  background: color-mix(in srgb, var(--accent-soft) 72%, #fff);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent-shadow) 42%, transparent);
}
.swapButton span {
  color: color-mix(in srgb, var(--accent) 72%, #6c7973);
}
.swapButton:hover {
  border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
  background: var(--accent-soft);
}
@media (max-width: 620px) {
  .summaryCard,
  .sectionCard {
    padding: 18px;
  }
  .playerHero > div strong {
    font-size: 16px;
  }
  .metricRow > strong {
    font-size: 16px;
  }
}
`);

await writeFile("tests/snooker-player-compare-ui-consistency.test.mjs", `import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\nconst root = new URL("../", import.meta.url);\nconst read = (path) => readFile(new URL(path, root), "utf8");\n\ntest("player compare teaser reuses page section headers and action buttons", async () => {\n  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");\n  const home = await read("app/snooker/snooker-data-center-v2.tsx");\n  const data = await read("app/snooker/data/data-ranking-content.tsx");\n  assert.match(teaser, /headerClassName: string/);\n  assert.match(home, /actionClassName={styles\\.fullButton} headerClassName={styles\\.sectionHeader}/);\n  assert.match(data, /actionClassName={styles\\.primaryAction} headerClassName={styles\\.sectionHeader}/);\n  assert.match(teaser, /variant === "data" \\? <>开始球员对比 <span>›<\\/span><\\/> : "查看完整球员对比"/);\n});\n\ntest("player compare route is proactively prefetched before first click", async () => {\n  const teaser = await read("app/snooker/compare/player-compare-teaser.tsx");\n  assert.match(teaser, /router\\.prefetch\\(compareHref\\)/);\n  assert.match(teaser, /prefetch={true}/);\n  assert.match(teaser, /onPointerDown=.*router\\.prefetch\\(compareHref\\)/s);\n});\n\ntest("player compare mobile typography and VS control follow the site theme", async () => {\n  const css = await read("app/snooker/compare/player-compare.module.css");\n  assert.match(css, /PLAYER_COMPARE_UI_CONSISTENCY_V2/);\n  assert.match(css, /summaryCard[\\s\\S]*padding: 18px/);\n  assert.match(css, /playerHero > div strong[\\s\\S]*font-size: 16px/);\n  assert.match(css, /metricRow > strong[\\s\\S]*font-size: 16px/);\n  assert.match(css, /swapButton[\\s\\S]*var\\(--accent-strong\\)[\\s\\S]*var\\(--accent-soft\\)/);\n});\n`);

console.log("Player Compare UI consistency V2 patch applied.");
