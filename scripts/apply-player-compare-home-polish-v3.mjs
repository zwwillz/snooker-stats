import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Missing replacement target: ${label}`);
  return content.replace(from, to);
}
function replaceRange(content, start, end, replacement, label) {
  const startIndex = content.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing range start: ${label}`);
  const endIndex = content.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`Missing range end: ${label}`);
  return content.slice(0, startIndex) + replacement + content.slice(endIndex);
}
function appendMarker(content, marker, css) {
  return content.includes(marker) ? content : `${content.trimEnd()}\n\n${css.trim()}\n`;
}

// 1) Teaser: use the exact same button element/classes as neighboring cards and prefetch the compare route.
{
  const path = 'app/snooker/compare/player-compare-teaser.tsx';
  let s = read(path);
  s = s.replace('import Link from "next/link";\n', '');
  const old = `    <div className={styles.actionFrame}>\n      <Link\n        className={actionClassName ? \`${'${styles.actionReset} ${actionClassName}'}\` : styles.action}\n        href={compareHref}\n        prefetch={true}\n        onPointerEnter={() => router.prefetch(compareHref)}\n        onPointerDown={() => router.prefetch(compareHref)}\n        onFocus={() => router.prefetch(compareHref)}\n        onClick={rememberReturn}\n      >\n        {variant === "data" ? <>开始球员对比 <span>›</span></> : "查看完整球员对比"}\n      </Link>\n    </div>`;
  const next = `    <div className={styles.actionFrame}>\n      <button\n        type="button"\n        className={actionClassName ? \`${'${styles.actionReset} ${actionClassName}'}\` : styles.action}\n        onPointerEnter={() => router.prefetch(compareHref)}\n        onPointerDown={() => router.prefetch(compareHref)}\n        onFocus={() => router.prefetch(compareHref)}\n        onClick={() => { rememberReturn(); router.push(compareHref); }}\n      >\n        {variant === "data" ? <>开始球员对比 <span>›</span></> : "查看完整球员对比"}\n      </button>\n    </div>`;
  s = replaceOnce(s, old, next, 'teaser action button');
  write(path, s);
}

// 2) Player detail: remember the exact SPA URL before entering compare, so return goes back to the player page.
{
  const path = 'app/snooker/players/player-detail-inline.tsx';
  let s = read(path);
  const marker = '  return (\n    <div className={styles.content}>';
  const helper = `  const rememberCompareReturn = () => {\n    try {\n      window.sessionStorage.setItem("snooker-compare-return", window.location.href);\n    } catch {\n      // The compare page keeps a safe fallback when session storage is unavailable.\n    }\n  };\n\n`;
  s = replaceOnce(s, marker, helper + marker, 'player detail return helper');
  s = replaceOnce(
    s,
    `<Link className={styles.compareAction} href={\`/snooker/compare?player1=${'${encodeURIComponent(player.slug)}'}\`}>`,
    `<Link className={styles.compareAction} href={\`/snooker/compare?player1=${'${encodeURIComponent(player.slug)}'}\`} prefetch={true} onClick={rememberCompareReturn}>`,
    'player detail compare link',
  );
  write(path, s);
}

// 3) Compare page: explicit origin-aware return instead of browser-history guessing.
{
  const path = 'app/snooker/compare/player-compare-client.tsx';
  let s = read(path);
  const oldBack = `  const goBack = () => {\n    try {\n      const returnUrl = window.sessionStorage.getItem("snooker-compare-return");\n      if (returnUrl && new URL(returnUrl).origin === window.location.origin && window.history.length > 1) {\n        window.sessionStorage.removeItem("snooker-compare-return");\n        window.history.back();\n        return;\n      }\n    } catch {\n      // Fall through to the lightweight data-center route.\n    }\n    router.replace("/?view=data", { scroll: false });\n  };`;
  const newBack = `  const goBack = () => {\n    try {\n      const returnUrl = window.sessionStorage.getItem("snooker-compare-return");\n      if (returnUrl) {\n        const target = new URL(returnUrl);\n        if (target.origin === window.location.origin) {\n          window.sessionStorage.removeItem("snooker-compare-return");\n          router.replace(\`${'${target.pathname}${target.search}${target.hash}'}\`, { scroll: false });\n          return;\n        }\n      }\n    } catch {\n      // Fall through to the lightweight data-center route.\n    }\n    router.replace("/?view=data", { scroll: false });\n  };`;
  s = replaceOnce(s, oldBack, newBack, 'compare explicit back route');
  s = replaceOnce(
    s,
    `<button type="button" className={styles.backLink} onClick={goBack}>‹ <span>返回</span></button>`,
    `<button type="button" className={styles.backLink} onClick={goBack} aria-label="返回上一页">‹</button>`,
    'compare back icon',
  );
  write(path, s);
}

// 4) Multiple simultaneous live matches: keep existing priority ordering, cap at four, and otherwise keep a single fallback card.
{
  const path = 'lib/snooker/live-client.ts';
  let s = read(path);
  const start = 'export type HeadlineSelection = { event: SnookerEvent; match: SnookerMatch } | null;';
  const replacement = `export type HeadlineSelection = { event: SnookerEvent; match: SnookerMatch };\n\nfunction sortHeadlineCandidates(candidates: HeadlineSelection[], players: Map<string, SnookerPlayer>, now: number) {\n  return candidates.sort((a, b) => {\n    const state = statePriority(b.match, now) - statePriority(a.match, now);\n    if (state) return state;\n    const round = roundPriority(b.match) - roundPriority(a.match);\n    if (round) return round;\n    const china = chinaPriority(b.match, players) - chinaPriority(a.match, players);\n    if (china) return china;\n    const scheduled = time(a.match.scheduledAt) - time(b.match.scheduledAt);\n    if (scheduled) return scheduled;\n    return a.match.matchNo - b.match.matchNo || a.match.id.localeCompare(b.match.id);\n  });\n}\n\nexport function selectHomepageHeadlineMatches(\n  events: SnookerEvent[],\n  players: Map<string, SnookerPlayer>,\n  now = Date.now(),\n  limit = 4,\n): HeadlineSelection[] {\n  const candidates: HeadlineSelection[] = events.flatMap((event) => event.rounds.flatMap((round) => round.matches.map((match) => ({ event, match }))));\n  const liveExists = candidates.some(({ match }) => match.status === "live" || match.status === "session-break");\n  const eligible = candidates.filter(({ match }) => {\n    if (match.status === "live" || match.status === "session-break") return true;\n    if (liveExists) return false;\n    if (FINAL_STATUSES.has(match.status)) {\n      const completedAt = time(match.completedDetectedAt || match.sourceUpdatedAt);\n      return completedAt > 0 && now - completedAt <= 60 * 60 * 1000;\n    }\n    if (match.status === "upcoming") {\n      const scheduled = time(match.scheduledAt);\n      return scheduled > 0 && scheduled >= now && scheduled - now <= 6 * 60 * 60 * 1000;\n    }\n    return false;\n  });\n  if (!eligible.length) return [];\n  sortHeadlineCandidates(eligible, players, now);\n  const cap = liveExists ? Math.max(1, Math.min(4, limit)) : 1;\n  return eligible.slice(0, cap);\n}\n\nexport function selectHomepageHeadlineMatch(events: SnookerEvent[], players: Map<string, SnookerPlayer>, now = Date.now()): HeadlineSelection | null {\n  return selectHomepageHeadlineMatches(events, players, now, 1)[0] ?? null;\n}\n`;
  const i = s.indexOf(start);
  if (i < 0) throw new Error('Missing headline selection block');
  s = s.slice(0, i) + replacement;
  write(path, s);
}

// 5) Homepage: swipe up to four live cards, reduce ops copy to user-facing update time only.
{
  const path = 'app/snooker/snooker-data-center-v2.tsx';
  let s = read(path);
  s = replaceOnce(
    s,
    `import { matchDisplayStatus, mergeEventSnapshotsMonotonic, selectHomepageHeadlineMatch } from "@/lib/snooker/live-client";`,
    `import { matchDisplayStatus, mergeEventSnapshotsMonotonic, selectHomepageHeadlineMatches } from "@/lib/snooker/live-client";`,
    'live client import',
  );
  s = replaceOnce(
    s,
    `  const headlineSelection = selectHomepageHeadlineMatch(databaseEvents, players);\n  const headlineMatch = headlineSelection?.match;\n  const headlineEvent = headlineSelection?.event;`,
    `  const headlineSelections = selectHomepageHeadlineMatches(databaseEvents, players);`,
    'headline selection state',
  );

  const cardStart = '        {headlineMatch && headlineEvent && players.get(headlineMatch.player1Id) && players.get(headlineMatch.player2Id) ? <section className={styles.card}>';
  const cardEnd = '        <PlayerCompareTeaser players={directoryPlayers} initialData={initialPlayerCompare} actionClassName={styles.fullButton} headerClassName={styles.sectionHeader} />';
  const newCards = `        {headlineSelections.length ? <div className={priority.headlineCarousel} aria-label="焦点比赛">\n          {headlineSelections.map(({ match: headlineMatch, event: headlineEvent }, index) => {\n            const player1 = players.get(headlineMatch.player1Id);\n            const player2 = players.get(headlineMatch.player2Id);\n            if (!player1 || !player2) return null;\n            return <section className={\`${'${styles.card} ${priority.headlineSlide}'}\`} key={\`${'${headlineEvent.id}-${headlineMatch.id}'}\`}>\n              <div className={styles.liveHeader}><div><small>{headlineMatch.roundLabelZh} · {headlineMatch.timeLabelZh ?? ""}</small><h2>{headlineEvent.nameZh} · {headlineMatch.roundLabelZh}</h2></div><StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} /></div>\n              <div className={styles.homeScore}>\n                <button onClick={() => openPlayer(headlineMatch.player1Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player1} size="lg" />{headlineMatch.winnerId === headlineMatch.player1Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player1.shortNameZh}</span></button>\n                <div><strong>{headlineMatch.score1 ?? "-"} <i className={headlineMatch.status === "live" ? priority.liveSeparator : ""}>:</i> {headlineMatch.score2 ?? "-"}</strong><small>{bestOfLabel(headlineMatch.bestOf)}</small><span className={priority.scoreUpdated}><i />更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span></div>\n                <button onClick={() => openPlayer(headlineMatch.player2Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player2} size="lg" />{headlineMatch.winnerId === headlineMatch.player2Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player2.shortNameZh}</span></button>\n              </div>\n              <button className={styles.fullButton} onClick={() => openMatch(headlineMatch.id, headlineEvent.slug)}>查看比赛详情</button>\n              {headlineSelections.length > 1 ? <div className={priority.headlineSwipeHint}>左右滑动 · {index + 1}/{headlineSelections.length}</div> : null}\n            </section>;\n          })}\n        </div> : null}\n\n`;
  s = replaceRange(s, cardStart, cardEnd, newCards, 'homepage headline card');

  const oldStatus = `      <div className={styles.dataStatus} role="status">\n        <i className={sourceHealth?.accepted ? styles.liveOk : styles.liveWait} />\n        <span>{sourceHealth?.sourceLabel ?? (sourceHealth?.online ? "Snooker Supabase" : "数据服务降级")}</span>\n        <small>更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}{sourceHealth?.cacheSeconds ? \` · 缓存 ${'${Math.round(sourceHealth.cacheSeconds / 60)}'} 分钟\` : ""}</small>\n      </div>`;
  const newStatus = `      <div className={styles.dataStatus} role="status">\n        <i className={styles.liveOk} />\n        <span>更新 {formatUpdatedAt(sourceHealth?.fetchedAt)}</span>\n      </div>`;
  s = replaceOnce(s, oldStatus, newStatus, 'user-facing bottom update status');
  write(path, s);
}

// 6) Styling: carousel, concise update text, compare background/back button, and exact neighboring-button behavior.
{
  const path = 'app/snooker/snooker-priority.module.css';
  let s = read(path);
  s = appendMarker(s, 'HOME_HEADLINE_CAROUSEL_V3', `/* HOME_HEADLINE_CAROUSEL_V3 */\n.headlineCarousel{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-inline:contain;scrollbar-width:none}.headlineCarousel::-webkit-scrollbar{display:none}.headlineSlide{min-width:0;scroll-snap-align:start;scroll-snap-stop:always}.scoreUpdated{display:flex!important;align-items:center;justify-content:center;gap:5px;margin-top:4px!important;color:#929b96!important;font-size:7px!important;font-weight:650}.scoreUpdated>i{width:5px;height:5px;border-radius:50%;background:#4db58a;box-shadow:0 0 0 3px rgba(77,181,138,.10)}.headlineSwipeHint{margin-top:7px;color:#9aa19d;font-size:7px;text-align:center;letter-spacing:.02em}`);
  write(path, s);
}
{
  const path = 'app/snooker/snooker-data-center.module.css';
  let s = read(path);
  s = appendMarker(s, 'USER_FACING_UPDATE_ONLY_V3', `/* USER_FACING_UPDATE_ONLY_V3 */\n.dataStatus{grid-template-columns:8px minmax(0,1fr)}.dataStatus>span{color:#8d9691;font-size:7px;font-weight:700}`);
  write(path, s);
}
{
  const path = 'app/snooker/compare/player-compare.module.css';
  let s = read(path);
  s = appendMarker(s, 'PLAYER_COMPARE_NAV_BACKGROUND_V3', `/* PLAYER_COMPARE_NAV_BACKGROUND_V3 */\n.page{background:linear-gradient(180deg,#edf4f1 0,#f7f8f7 180px,#f5f6f5 100%)}\n.topbar>button.backLink{justify-self:start;display:grid;place-items:center;width:36px;height:36px;padding:0;border:0;border-radius:50%;color:#202522;background:#f2f4f3;font-size:30px;line-height:1;box-shadow:none}\n.topbar>button.backLink:hover{background:#eaeeec}\n@media(max-width:620px){.topbar>button.backLink{width:34px;height:34px;padding:0;font-size:28px}}`);
  write(path, s);
}

// 7) Regression coverage for this polish pass.
{
  const path = 'tests/snooker-player-compare-home-polish-v3.test.mjs';
  const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst read = (path) => fs.readFileSync(path, 'utf8');\n\ntest('compare teaser reuses button semantics and prefetches route', () => {\n  const source = read('app/snooker/compare/player-compare-teaser.tsx');\n  assert.doesNotMatch(source, /import Link from \\"next\\/link\\"/);\n  assert.match(source, /type=\\"button\\"[\\s\\S]*router\\.push\\(compareHref\\)/);\n  assert.match(source, /router\\.prefetch\\(compareHref\\)/);\n});\n\ntest('compare return restores the exact source route including player/data SPA state', () => {\n  const compare = read('app/snooker/compare/player-compare-client.tsx');\n  const player = read('app/snooker/players/player-detail-inline.tsx');\n  assert.match(compare, /router\\.replace\\(`\\$\\{target\\.pathname\\}\\$\\{target\\.search\\}\\$\\{target\\.hash\\}`/);\n  assert.doesNotMatch(compare, /window\\.history\\.back\\(\\)/);\n  assert.match(player, /sessionStorage\\.setItem\\(\\"snooker-compare-return\\", window\\.location\\.href\\)/);\n});\n\ntest('homepage exposes up to four priority live matches and hides ops copy', () => {\n  const live = read('lib/snooker/live-client.ts');\n  const home = read('app/snooker/snooker-data-center-v2.tsx');\n  assert.match(live, /selectHomepageHeadlineMatches/);\n  assert.match(live, /Math\\.min\\(4, limit\\)/);\n  assert.match(home, /headlineCarousel/);\n  assert.match(home, /左右滑动/);\n  assert.match(home, /<span>更新 \\{formatUpdatedAt\\(sourceHealth\\?\\.fetchedAt\\)\\}<\\/span>/);\n  assert.doesNotMatch(home, /sourceHealth\\?\\.sourceLabel \\?\\?/);\n});\n\ntest('compare page uses the shared site background and detail-style back control', () => {\n  const css = read('app/snooker/compare/player-compare.module.css');\n  assert.match(css, /PLAYER_COMPARE_NAV_BACKGROUND_V3/);\n  assert.match(css, /topbar>button\\.backLink/);\n  assert.match(css, /linear-gradient\\(180deg,#edf4f1/);\n});\n`;
  write(path, test);
}
