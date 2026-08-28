import { readFile, writeFile } from "node:fs/promises";

const target = "app/snooker/snooker-data-center-v2.tsx";
let source = await readFile(target, "utf8");

function replaceOnce(from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  source = source.slice(0, first) + to + source.slice(first + from.length);
}

replaceOnce(
  '<div className={styles.liveHeader}><div><small>{headlineMatch.roundLabelZh} · {headlineMatch.timeLabelZh ?? ""}</small><h2>{headlineEvent.nameZh} · {headlineMatch.roundLabelZh}</h2></div><StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} /></div>',
  '<div className={styles.liveHeader}><div><small>{headlineMatch.roundLabelZh} · {headlineMatch.timeLabelZh ?? ""}{headlineMatch.matchNo ? ` · #${headlineMatch.matchNo}` : ""}</small><h2>{headlineEvent.nameZh} · {headlineMatch.roundLabelZh}</h2></div><StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} /></div>',
  "home match number",
);

replaceOnce(
  '<button onClick={() => openPlayer(headlineMatch.player1Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player1} size="lg" />{headlineMatch.winnerId === headlineMatch.player1Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player1.shortNameZh}</span></button>',
  '<button onClick={() => openPlayer(headlineMatch.player1Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player1} size="lg" />{headlineMatch.winnerId === headlineMatch.player1Id ? <em className={polish.winBadge}>胜</em> : null}{headlineMatch.status === "walkover" && headlineMatch.winnerId && headlineMatch.winnerId !== headlineMatch.player1Id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><span className={polish.homePlayerName}>{player1.shortNameZh}</span></button>',
  "home player1 walkover",
);

replaceOnce(
  '<button onClick={() => openPlayer(headlineMatch.player2Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player2} size="lg" />{headlineMatch.winnerId === headlineMatch.player2Id ? <em className={polish.winBadge}>胜</em> : null}</div><span className={polish.homePlayerName}>{player2.shortNameZh}</span></button>',
  '<button onClick={() => openPlayer(headlineMatch.player2Id)}><div className={polish.homeAvatarWrap}><PlayerAvatar player={player2} size="lg" />{headlineMatch.winnerId === headlineMatch.player2Id ? <em className={polish.winBadge}>胜</em> : null}{headlineMatch.status === "walkover" && headlineMatch.winnerId && headlineMatch.winnerId !== headlineMatch.player2Id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><span className={polish.homePlayerName}>{player2.shortNameZh}</span></button>',
  "home player2 walkover",
);

replaceOnce(
  '<span>{match.timeLabelZh ?? match.roundLabelZh}</span>\n        <span>{bestOfLabel(match.bestOf)}</span>',
  '<span>{match.timeLabelZh ?? match.roundLabelZh}{match.matchNo ? ` · #${match.matchNo}` : ""}</span>\n        <span>{bestOfLabel(match.bestOf)}</span>',
  "schedule match number",
);

replaceOnce(
  '<span>{p1.shortNameZh}{match.winnerId === p1.id ? <em className={polish.matchWin}>胜</em> : null}</span>',
  '<span>{p1.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p1.id ? <em className={polish.withdrawnBadge}>退赛</em> : null}{match.winnerId === p1.id ? <em className={polish.matchWin}>胜</em> : null}</span>',
  "schedule player1 walkover",
);

replaceOnce(
  '<span>{match.winnerId === p2.id ? <em className={polish.matchWin}>胜</em> : null}{p2.shortNameZh}</span>',
  '<span>{match.winnerId === p2.id ? <em className={polish.matchWin}>胜</em> : null}{p2.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p2.id ? <em className={polish.withdrawnBadge}>退赛</em> : null}</span>',
  "schedule player2 walkover",
);

replaceOnce(
  '<div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : <><span>{match.score1 ?? "-"}</span> <i className={match.status === "live" ? priority.liveSeparator : ""}>-</i> <span>{match.score2 ?? "-"}</span></>}</strong><StatusPill status={match.status} label={statusLabel} /><small>{bestOfLabel(match.bestOf)}</small>{realtime ? <small>{refreshing ? "正在更新…" : `最近更新 ${updated}`}</small> : null}</div>',
  '<div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : <><span>{match.score1 ?? "-"}</span> <i className={match.status === "live" ? priority.liveSeparator : ""}>-</i> <span>{match.score2 ?? "-"}</span></>}</strong><StatusPill status={match.status} label={statusLabel} /><small>{match.matchNo ? `#${match.matchNo}` : ""}</small>{realtime ? <small>{refreshing ? "正在更新…" : `最近更新 ${updated}`}</small> : null}</div>',
  "detail match number",
);

replaceOnce(
  '<div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p1} size="xl" />{match.winnerId === p1.id ? <em>胜</em> : null}</div><strong>{p1.nameZh}</strong><small>{p1.nameEn}</small></div>',
  '<div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p1} size="xl" />{match.winnerId === p1.id ? <em>胜</em> : null}{match.status === "walkover" && match.winnerId && match.winnerId !== p1.id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><strong>{p1.nameZh}</strong><small>{p1.nameEn}</small></div>',
  "detail player1 walkover",
);

replaceOnce(
  '<div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p2} size="xl" />{match.winnerId === p2.id ? <em>胜</em> : null}</div><strong>{p2.nameZh}</strong><small>{p2.nameEn}</small></div>',
  '<div className={styles.versusPlayer}><div className={styles.avatarWrap}><PlayerAvatar player={p2} size="xl" />{match.winnerId === p2.id ? <em>胜</em> : null}{match.status === "walkover" && match.winnerId && match.winnerId !== p2.id ? <span className={polish.withdrawnAvatarBadge}>退赛</span> : null}</div><strong>{p2.nameZh}</strong><small>{p2.nameEn}</small></div>',
  "detail player2 walkover",
);

await writeFile(target, source);

const cssTarget = "app/snooker/snooker-ui-polish.module.css";
let css = await readFile(cssTarget, "utf8");
const cssMarker = '.matchPlayerRight .matchWin{margin-left:0;margin-right:4px}\n';
if (!css.includes(cssMarker)) throw new Error("Missing CSS marker");
css = css.replace(cssMarker, cssMarker + '.withdrawnBadge{display:inline-flex;margin-left:5px;vertical-align:middle;padding:2px 5px;border-radius:999px;background:#f5edf7;color:#76517c;font-size:6px;font-weight:900;font-style:normal;line-height:1.2}.matchPlayerRight .withdrawnBadge{margin-left:5px}.withdrawnAvatarBadge{position:absolute;right:-13px;top:-3px;z-index:2;padding:3px 5px;border-radius:999px;background:#f5edf7;color:#76517c;font-size:6px;font-weight:900;line-height:1;box-shadow:0 0 0 2px #fff;white-space:nowrap}\n');
await writeFile(cssTarget, css);
