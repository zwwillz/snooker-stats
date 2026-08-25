import { readFile, writeFile, appendFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Anchor not found in ${path}: ${before.slice(0, 100)}`);
  await writeFile(path, source.replace(before, after));
  return true;
}

async function ensureContains(path, needle) {
  const source = await readFile(path, "utf8");
  if (!source.includes(needle)) throw new Error(`Expected integration missing from ${path}: ${needle}`);
}

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  'import { DataHubContent, RankingDetailContent } from "./data/data-ranking-content";\n',
  'import { DataHubContent, RankingDetailContent } from "./data/data-ranking-content";\nimport PlayerCompareTeaser from "./compare/player-compare-teaser";\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '        {nextEventCard ? <section className={styles.card}>',
  '        <PlayerCompareTeaser players={directoryPlayers} />\n\n        {nextEventCard ? <section className={styles.card}>',
);

await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  'import { HonoursDetailOverlay, HonoursLeadersSection } from "./data-honours-content";\nimport styles from "./data.module.css";\n',
  'import { HonoursDetailOverlay, HonoursLeadersSection } from "./data-honours-content";\nimport PlayerCompareTeaser from "../compare/player-compare-teaser";\nimport styles from "./data.module.css";\n',
);

await replaceOnce(
  "app/snooker/data/data-ranking-content.tsx",
  '    </section>\n\n    <section className={`${styles.card} ${styles.rankingCard}`}>',
  '    </section>\n\n    <PlayerCompareTeaser players={players} variant="data" />\n\n    <section className={`${styles.card} ${styles.rankingCard}`}>',
);

await replaceOnce(
  "app/snooker/players/player-detail-inline.tsx",
  'import { useEffect, useState } from "react";\n',
  'import Link from "next/link";\nimport { useEffect, useState } from "react";\n',
);

await replaceOnce(
  "app/snooker/players/player-detail-inline.tsx",
  '      {player ? <PlayerDetailContent player={player} /> : <section className={styles.card}><div className={styles.emptyState}>正在加载球员资料…</div></section>}\n      {loadFailed ?',
  '      {player ? <PlayerDetailContent player={player} /> : <section className={styles.card}><div className={styles.emptyState}>正在加载球员资料…</div></section>}\n      {player?.isCurrentTour ? <section className={styles.card}><Link className={styles.compareAction} href={`/snooker/compare?player1=${encodeURIComponent(player.slug)}`}><span><small>PLAYER COMPARE</small><strong>与其他球员比较</strong><em>将该球员固定在左侧，选择另一名职业球员开始对比</em></span><b>›</b></Link></section> : null}\n      {loadFailed ?',
);

const playerCssPath = "app/snooker/players/player.module.css";
const playerCss = await readFile(playerCssPath, "utf8");
if (!playerCss.includes(".compareAction{")) {
  await appendFile(playerCssPath, '\n.compareAction{display:flex;align-items:center;justify-content:space-between;gap:14px;color:inherit;text-decoration:none}.compareAction span{min-width:0;display:flex;flex-direction:column}.compareAction small{color:var(--accent);font-size:8px;font-weight:850;letter-spacing:.13em}.compareAction strong{margin-top:5px;font-size:15px}.compareAction em{margin-top:4px;color:var(--muted);font-size:8px;font-style:normal;line-height:1.5}.compareAction b{color:var(--accent);font-size:24px;font-weight:500}.compareAction:hover strong{color:var(--accent-strong)}\n');
}

await ensureContains("app/snooker/snooker-data-center-v2.tsx", "<PlayerCompareTeaser players={directoryPlayers} />");
await ensureContains("app/snooker/data/data-ranking-content.tsx", '<PlayerCompareTeaser players={players} variant="data" />');
await ensureContains("app/snooker/players/player-detail-inline.tsx", "与其他球员比较");
console.log("Player Compare V1 integrations applied.");
