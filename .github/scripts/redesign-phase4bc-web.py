from pathlib import Path

TSX = Path('app/snooker/snooker-data-center-v2.tsx')
CSS = Path('app/snooker/snooker-priority.module.css')
FOUNDATION = Path('tests/snooker-data-foundation.test.mjs')
PHASE4 = Path('tests/tournaments-phase4.test.mjs')

s = TSX.read_text()

# 1) Desktop schedule helpers.
anchor = '''function formatMonthDay(value: string) {\n  const [, month, day] = value.split("-").map(Number);\n  return `${month}/${day}`;\n}\n'''
helpers = anchor + '''\nfunction formatMatchDateZh(value?: string) {\n  if (!value) return "日期待定";\n  const date = new Date(value);\n  if (Number.isNaN(date.getTime())) return "日期待定";\n  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric" }).format(date);\n}\n\nfunction formatMatchTimeZh(value?: string) {\n  if (!value) return null;\n  const date = new Date(value);\n  if (Number.isNaN(date.getTime())) return null;\n  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);\n}\n'''
if anchor not in s:
    raise SystemExit('formatMonthDay anchor missing')
s = s.replace(anchor, helpers, 1)

# 2) Redesign schedule match row while keeping a mobile-specific rendering.
start = s.index('function MatchListRow(')
end = s.index('\nfunction EventCard(', start)
new_match_row = r'''function MatchListRow({ match, players, onOpen }: { match: SnookerMatch; players: Map<string, SnookerPlayer>; onOpen: () => void }) {
  const p1 = players.get(match.player1Id) ?? fallbackPlayer(match.player1Id);
  const p2 = players.get(match.player2Id) ?? fallbackPlayer(match.player2Id);
  const score = match.status === "walkover" ? "W : O" : `${match.score1 ?? "-"} : ${match.score2 ?? "-"}`;
  const timeLabel = formatMatchTimeZh(match.scheduledAt) ?? match.timeLabelZh ?? "时间待定";
  return (
    <button className={`${styles.matchRow} ${priority.horizontalMatchRow} ${priority.scheduleMatchCard}`} data-schedule-match-id={match.id} onClick={onOpen}>
      <div className={priority.scheduleMobileMatch}>
        <div className={styles.matchRowMeta}>
          <span>{match.timeLabelZh ?? match.roundLabelZh}{match.matchNo ? ` · #${match.matchNo}` : ""}</span>
          <span>{bestOfLabel(match.bestOf)}</span>
          <StatusPill status={match.status} label={matchDisplayStatus(match)} />
        </div>
        <div className={priority.matchVersusRow}>
          <div className={polish.matchPlayerCell}>
            <PlayerAvatar player={p1} size="sm" />
            <span>{p1.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p1.id ? <em className={polish.withdrawnBadge}>退赛</em> : null}{match.winnerId === p1.id ? <em className={polish.matchWin}>胜</em> : null}</span>
          </div>
          <b className={match.status === "live" ? priority.liveScoreText : ""}>{score}</b>
          <div className={`${polish.matchPlayerCell} ${polish.matchPlayerRight}`}>
            <span>{match.winnerId === p2.id ? <em className={polish.matchWin}>胜</em> : null}{p2.shortNameZh}{match.status === "walkover" && match.winnerId && match.winnerId !== p2.id ? <span className={polish.withdrawnBadge}>退赛</span> : null}</span>
            <PlayerAvatar player={p2} size="sm" />
          </div>
        </div>
      </div>

      <div className={priority.scheduleDesktopMatch}>
        <div className={priority.scheduleMeta}>
          <strong>{timeLabel}</strong>
          <span>{formatMatchDateZh(match.scheduledAt)}</span>
          <small>{match.matchNo ? `#${match.matchNo}` : "#—"}</small>
        </div>
        <div className={priority.schedulePlayers}>
          <div className={`${priority.schedulePlayerName} ${priority.schedulePlayerLeft}`}>
            <strong>{p1.nameZh}</strong>
            <small>{p1.nameEn}</small>
          </div>
          <PlayerAvatar player={p1} size="lg" />
          <div className={priority.scheduleScore}>
            <b className={match.status === "live" ? priority.liveScoreText : ""}>{score}</b>
            <small>{bestOfLabel(match.bestOf)}</small>
          </div>
          <PlayerAvatar player={p2} size="lg" />
          <div className={`${priority.schedulePlayerName} ${priority.schedulePlayerRight}`}>
            <strong>{p2.nameZh}</strong>
            <small>{p2.nameEn}</small>
          </div>
        </div>
        <div className={priority.scheduleAction}>
          <StatusPill status={match.status} label={matchDisplayStatus(match)} />
          <span>查看比赛详情 ›</span>
        </div>
      </div>
    </button>
  );
}
'''
s = s[:start] + new_match_row + s[end:]

# 3) Reuse the full website header on all second/third-level desktop pages.
marker = '\n  if (detail?.type === "player") {'
detail_header = r'''
  const detailSiteHeader = <header className={`${styles.header} ${priority.detailSiteHeader}`}>
    <button className={styles.brand} onClick={() => changeView("home")}><span>S</span><div><strong>147数据局</strong><small>中文斯诺克数据平台 · CN SNOOKER STATS</small></div></button>
    <nav className={styles.desktopNav} aria-label="主要导航">{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} aria-current={item.id === activeView ? "page" : undefined} className={item.id === activeView ? styles.desktopNavActive : ""} onPointerEnter={() => warmRootView(item.id)} onFocus={() => warmRootView(item.id)} onTouchStart={() => warmRootView(item.id)} onClick={(event) => { event.preventDefault(); changeView(item.id); }}><span>{item.label}</span><small>{item.labelEn}</small></a>)}</nav>
    <div className={styles.headerRight}><div className={styles.themeSwitch} role="group" aria-label="主题颜色"><button className={theme === "green" ? styles.themeActive : ""} onClick={() => setTheme("green")} aria-pressed={theme === "green"}>绿</button><button className={theme === "red" ? styles.themeActive : ""} onClick={() => setTheme("red")} aria-pressed={theme === "red"}>红</button></div></div>
  </header>;
'''
if marker not in s:
    raise SystemExit('detail insertion marker missing')
s = s.replace(marker, detail_header + marker, 1)

plain_detail_header = '<header className={styles.detailHeader}>'
replacement_detail_header = '{detailSiteHeader}<header className={`${styles.detailHeader} ${priority.detailLocalHeader}`}> '
count_plain = s.count(plain_detail_header)
if count_plain < 4:
    raise SystemExit(f'expected detail headers, found {count_plain}')
s = s.replace(plain_detail_header, replacement_detail_header)

event_header = '<header className={`${styles.detailHeader} ${priority.eventNameHeader}`}> '
if event_header in s:
    s = s.replace(event_header, '{detailSiteHeader}<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader}`}> ', 1)
else:
    event_header = '<header className={`${styles.detailHeader} ${priority.eventNameHeader}` }>'

# actual source has no extra space before closing tag; handle exact form.
exact_event_header = '<header className={`${styles.detailHeader} ${priority.eventNameHeader}`}> '
# no-op if already replaced; now handle no trailing source-space variant around the tag.
if '{detailSiteHeader}<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader}`}' not in s:
    token = '<header className={`${styles.detailHeader} ${priority.eventNameHeader}`}> '
    if token in s:
        s = s.replace(token, '{detailSiteHeader}<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader}`}> ', 1)
    else:
        token = '<header className={`${styles.detailHeader} ${priority.eventNameHeader}`}> '

# fallback precise source sequence from current event return.
source_event_return = 'return <main className={styles.appRoot} data-theme={theme}><div className={`${styles.detailShell} ${priority.eventDetailShell}`} data-event-detail>\n      <header className={`${styles.detailHeader} ${priority.eventNameHeader}`}>'
if source_event_return in s:
    s = s.replace(source_event_return, 'return <main className={styles.appRoot} data-theme={theme}><div className={`${styles.detailShell} ${priority.eventDetailShell}`} data-event-detail>\n      {detailSiteHeader}<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader}`}>', 1)

# 4) Event hero: keep full hero, then sticky compact green identity + tabs on desktop.
tabs = '<div className={`${styles.eventTabs} ${priority.eventDetailTabs}`}><button className={detail.tab === "overview" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "overview" })}>赛事介绍</button><button className={detail.tab === "schedule" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "schedule" })}>赛程</button><button className={detail.tab === "data" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "data" })}>赛事数据</button></div>'
sticky_tabs = r'''<div className={priority.eventStickyNav}>
        <div className={priority.eventStickyIdentity}>
          <button type="button" onClick={closeEvent} aria-label="返回赛事列表">‹</button>
          <div><strong>{calendarEvent.nameZh}</strong><small>{calendarEvent.nameEn}</small></div>
          <span>{calendarEvent.season}</span>
        </div>
        <div className={`${styles.eventTabs} ${priority.eventDetailTabs}`}><button className={detail.tab === "overview" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "overview" })}>赛事介绍</button><button className={detail.tab === "schedule" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "schedule" })}>赛程</button><button className={detail.tab === "data" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "data" })}>赛事数据</button></div>
      </div>'''
if tabs not in s:
    raise SystemExit('event tabs marker missing')
s = s.replace(tabs, sticky_tabs, 1)

# 5) Schedule round cards are one-column. Each card owns its best-of label under the score.
s = s.replace('<SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} />', '<SectionHeader eyebrow="ROUND" title={round.labelZh} />')

# 6) Match detail: keep matchup -> frames -> data vertically; remove the added context strip.
context_start = '      <div className={priority.matchContextBar} aria-label="比赛信息">\n'
if context_start not in s:
    raise SystemExit('match context strip missing')
cs = s.index(context_start)
ce = s.index('      <div className={`${priority.matchDetailBody}', cs)
s = s[:cs] + s[ce:]
s = s.replace('<div className={`${priority.matchDetailBody} ${hasMatchupData ? priority.matchDetailBodyWithData : ""}`}>', '<div className={priority.matchDetailBody}>', 1)

# Desktop back control lives inside the matchup hero rather than adding another desktop row.
hero_open = '<section className={`${styles.matchHero} ${priority.matchHeroDesktop}`}>\n        <div className={styles.matchHeroMeta}>'
if hero_open not in s:
    raise SystemExit('match hero marker missing')
s = s.replace(hero_open, '<section className={`${styles.matchHero} ${priority.matchHeroDesktop}`}>\n        <button type="button" className={priority.matchBackButton} onClick={() => closeMatch(selectedEvent.slug)}>‹ 返回赛程</button>\n        <div className={styles.matchHeroMeta}>', 1)

TSX.write_text(s)

# 7) Append authoritative desktop overrides. Earlier Phase 4BC rules remain harmlessly overridden.
css = CSS.read_text()
marker_css = '/* TOURNAMENTS_PHASE4BC_WEB_REDESIGN_V2 */'
if marker_css in css:
    raise SystemExit('redesign css already present')
css += r'''

/* TOURNAMENTS_PHASE4BC_WEB_REDESIGN_V2 */
.detailSiteHeader{display:none}
.detailLocalHeader{display:flex}
.eventStickyNav{display:contents}
.eventStickyIdentity{display:none}
.scheduleDesktopMatch{display:none}
.scheduleMobileMatch{display:block}
.matchBackButton{display:none}

@media (min-width:1024px){
  /* Every secondary/tertiary web page keeps the same website navigation. */
  .detailSiteHeader{display:flex!important;z-index:80;background:rgba(255,255,255,.96)}
  .detailLocalHeader{display:none!important}
  .eventDetailShell,.matchDetailShell{width:min(1180px,calc(100% - 40px));margin:0 auto;background:#f7f8f7}

  /* Recent tournaments: one card per row, action fixed on the right. */
  .recentEventGrid{grid-template-columns:1fr!important;gap:10px!important}
  .recentEventCard{min-height:118px!important;padding:17px 18px!important;display:grid;grid-template-columns:minmax(0,1fr) 132px;grid-template-rows:auto auto auto auto;column-gap:22px;align-items:center}
  .recentEventCardTop{grid-column:1;grid-row:1;margin-bottom:7px}
  .recentEventCard>strong{grid-column:1;grid-row:2;font-size:15px!important;line-height:1.35}
  .recentEventEnglish{grid-column:1;grid-row:3;margin-top:3px!important;font-size:9.5px!important}
  .recentEventCard>p{grid-column:1;grid-row:4;margin:8px 0 0!important;font-size:10px!important}
  .recentEventCard>span{grid-column:2;grid-row:1 / span 4;justify-self:end;align-self:center;margin:0!important;padding:10px 14px;border-radius:10px;background:var(--accent-soft);color:var(--accent-strong);font-size:10.5px!important;font-weight:900;white-space:nowrap}
  .eventListPanel :global([class*="currentEventBanner"]){position:relative;padding-right:170px!important}
  .eventListPanel :global([class*="currentEventBanner"])>span{position:absolute;right:24px;top:50%;margin:0!important;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.14);transform:translateY(-50%);font-size:10.5px!important}

  /* Event detail: full green hero, then a compact green event identity + three tabs stick below the website nav. */
  .eventDetailHeroDesktop{padding:30px 32px 28px!important;border-radius:0!important}
  .eventDetailHeroDesktop h1{margin:19px 0 6px!important;font-size:34px!important}
  .eventDetailHeroDesktop>p{font-size:11px!important}
  .eventStickyNav{position:sticky;top:var(--snooker-header-height);z-index:65;display:block;background:#fff;box-shadow:0 8px 22px rgba(35,45,41,.08)}
  .eventStickyIdentity{height:48px;padding:0 22px;display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;color:#fff;background:linear-gradient(135deg,var(--accent-dark),var(--accent))}
  .eventStickyIdentity>button{width:30px;height:30px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:22px;line-height:1;cursor:pointer}
  .eventStickyIdentity>div{min-width:0}.eventStickyIdentity strong,.eventStickyIdentity small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .eventStickyIdentity strong{font-size:14px}.eventStickyIdentity small{margin-top:2px;color:rgba(255,255,255,.62);font-size:8.5px}
  .eventStickyIdentity>span{font-size:9px;font-weight:800;color:rgba(255,255,255,.74)}
  .eventDetailTabs{position:static!important;top:auto!important;margin:0!important;padding:0 22px!important;box-shadow:none!important;border-bottom:1px solid var(--line)}
  .eventDetailTabs button{height:52px!important;font-size:12px!important}

  /* All three event tabs use desktop spacing and readable typography. */
  .eventDetailShell>.eventOverviewCard,.eventDetailShell>.eventPrizeCard,.eventDetailShell> :global([class*="championCard"]),.eventDetailShell> :global([class*="card"]){margin-left:22px;margin-right:22px}
  .eventDetailShell :global([class*="sectionHeader"]) h2{font-size:20px}
  .eventDetailShell :global([class*="sectionHeader"]) small{font-size:9px}
  .eventDetailShell :global([class*="sectionHeader"])>span{font-size:10px}
  .eventOverviewCard,.eventPrizeCard{padding:22px 24px!important}
  .eventOverviewCard :global([class*="eventOverviewGrid"]){grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px 14px}
  .eventOverviewCard :global([class*="eventOverviewGrid"]) article{min-height:72px;padding:14px 15px}
  .eventOverviewCard :global([class*="eventOverviewGrid"]) span{font-size:10px}.eventOverviewCard :global([class*="eventOverviewGrid"]) b{margin-top:5px;font-size:14px}
  .eventPrizeCard :global([class*="prizeTable"]){display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}
  .eventPrizeCard :global([class*="prizeRow"]) span,.eventPrizeCard :global([class*="prizeRow"]) b{font-size:11px}
  .eventDetailShell :global([class*="statGrid"]){grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .eventDetailShell :global([class*="statGrid"]) article{padding:16px}
  .eventDetailShell :global([class*="statGrid"]) article small{font-size:9.5px}.eventDetailShell :global([class*="statGrid"]) article strong{font-size:25px}.eventDetailShell :global([class*="statGrid"]) article span{font-size:9.5px}
  .eventDetailShell :global([class*="finalFourGrid"]){grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .eventDetailShell :global([class*="chinaResultList"]) button{min-height:64px}
  .eventDetailShell :global([class*="chinaResultList"]) b,.eventDetailShell :global([class*="chinaResultList"]) strong{font-size:12px}

  /* Schedule: one match per row. Left = time/date/#, center = players/avatars/score, right = status/action. */
  .eventScheduleStack{margin:18px 22px 26px!important;gap:18px!important}
  .eventScheduleStack>section{padding:22px 24px!important;border-radius:18px!important}
  .eventScheduleStack :global([class*="matchList"]){display:flex!important;flex-direction:column!important;gap:10px!important}
  .eventScheduleStack :global([class*="sectionHeader"]) h2{font-size:20px!important}
  .scheduleMatchCard{position:relative;min-height:126px!important;padding:0!important;border:1px solid var(--line)!important;border-radius:15px!important;background:#fbfcfb!important;overflow:hidden;text-align:left!important}
  .scheduleMobileMatch{display:none!important}
  .scheduleDesktopMatch{width:100%;min-height:124px;padding:21px 20px;display:grid;grid-template-columns:110px minmax(0,1fr) 145px;gap:18px;align-items:center}
  .scheduleMeta{padding-right:18px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-variant-numeric:tabular-nums}
  .scheduleMeta strong{font-size:15px;line-height:1}.scheduleMeta span{color:#5f6863;font-size:12px;font-weight:750}.scheduleMeta small{color:var(--muted);font-size:11px;font-weight:850}
  .schedulePlayers{min-width:0;display:grid;grid-template-columns:minmax(100px,1fr) 62px 92px 62px minmax(100px,1fr);gap:14px;align-items:center}
  .schedulePlayerName{min-width:0}.schedulePlayerName strong,.schedulePlayerName small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.schedulePlayerName strong{font-size:15px;line-height:1.25}.schedulePlayerName small{margin-top:4px;color:#979e9a;font-size:9.5px;font-weight:600}
  .schedulePlayerLeft{text-align:right}.schedulePlayerRight{text-align:left}
  .schedulePlayers :global([class*="avatar_lg"]){width:62px;height:62px;font-size:13px}
  .scheduleScore{text-align:center;white-space:nowrap}.scheduleScore b{display:block;font-size:26px;letter-spacing:-.045em}.scheduleScore small{display:block;margin-top:5px;color:var(--muted);font-size:10px;font-weight:750}
  .scheduleAction{height:100%;padding-left:18px;border-left:1px solid var(--line);display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:14px}
  .scheduleAction :global([class*="statusPill"]){font-size:9px!important}.scheduleAction>span{padding:10px 12px;border-radius:10px;background:var(--accent-soft);color:var(--accent-strong);font-size:10.5px;font-weight:900;white-space:nowrap}
  .scheduleMatchCard:hover{border-color:color-mix(in srgb,var(--accent) 24%,var(--line))!important;background:#fff!important;box-shadow:0 9px 24px rgba(35,45,41,.05)}

  /* Match detail: matchup first, then frames, then stats. Never side-by-side. */
  .matchHeroDesktop{position:relative;padding:25px 34px 30px!important;border-radius:0!important}
  .matchBackButton{display:inline-flex;position:absolute;left:22px;top:20px;z-index:2;align-items:center;padding:8px 11px;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font-size:10px;font-weight:800;cursor:pointer}
  .matchHeroDesktop :global([class*="matchHeroMeta"]){font-size:10px!important}
  .matchHeroDesktop h1{font-size:20px!important}
  .matchHeroDesktop :global([class*="versusGrid"]){max-width:820px!important;grid-template-columns:minmax(0,1fr) 180px minmax(0,1fr)!important;gap:32px!important}
  .matchHeroDesktop :global([class*="avatar_xl"]){width:104px!important;height:104px!important}
  .matchHeroDesktop :global([class*="versusPlayer"])>strong{font-size:17px!important}.matchHeroDesktop :global([class*="versusPlayer"])>small{font-size:10px!important}
  .matchHeroDesktop :global([class*="bigScore"]) strong{font-size:48px!important}.matchHeroDesktop :global([class*="bigScore"])>small{font-size:9.5px!important}
  .matchDetailBody,.matchDetailBodyWithData{display:flex!important;flex-direction:column!important;gap:16px!important;margin:18px 22px 24px!important}
  .matchFramePanel{width:100%;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(35,45,41,.035)}
  .matchFramePanel :global([class*="frameHead"]){position:static!important;top:auto!important;background:#fff;border-bottom:1px solid var(--line);font-size:10px}
  .matchFramePanel :global([class*="frameRow"]){min-height:58px!important;font-size:12px}
  .matchFramePanel :global([class*="frameRow"]) strong{font-size:15px}
  .matchDataPanel{position:static!important;top:auto!important;width:100%;margin:0!important;box-shadow:0 10px 28px rgba(35,45,41,.04)}
  .matchDataPanel :global([class*="matchupHeader"]) h2{font-size:20px}.matchDataPanel :global([class*="matchupHeader"]) small{font-size:9px}
  .matchDataPanel :global([class*="dataTabs"]) button span{font-size:11px}.matchDataPanel :global([class*="dataTabs"]) button small{font-size:8.5px}
  .matchDataPanel :global([class*="compareGrid"]){font-size:11px}
}

@media (min-width:1024px) and (max-width:1180px){
  .scheduleDesktopMatch{grid-template-columns:92px minmax(0,1fr) 125px;gap:13px;padding:19px 16px}
  .schedulePlayers{grid-template-columns:minmax(82px,1fr) 54px 78px 54px minmax(82px,1fr);gap:10px}
  .schedulePlayers :global([class*="avatar_lg"]){width:54px;height:54px}
  .schedulePlayerName strong{font-size:14px}.schedulePlayerName small{font-size:9px}.scheduleScore b{font-size:23px}
  .scheduleAction{padding-left:13px}.scheduleAction>span{padding:9px 10px;font-size:9.5px}
}
'''
CSS.write_text(css)

# 8) Update regression expectations to the revised approved hierarchy.
f = FOUNDATION.read_text()
old = '''  assert.match(uiSource, /matchContextBar/);\n  assert.match(uiSource, /matchDetailBodyWithData/);\n  assert.match(uiSource, /eventScheduleStack/);\n  assert.match(priorityCss, /TOURNAMENTS_PHASE4BC_CORE/);\n  assert.match(priorityCss, /grid-template-columns:minmax\\(0,1.2fr\\) minmax\\(380px,.8fr\\)/);\n  assert.match(priorityCss, /position:sticky;top:var\\(--snooker-header-height\\)/);\n'''
new = '''  assert.doesNotMatch(uiSource, /matchContextBar/);\n  assert.match(uiSource, /detailSiteHeader/);\n  assert.match(uiSource, /eventStickyIdentity/);\n  assert.match(uiSource, /scheduleDesktopMatch/);\n  assert.match(uiSource, /eventScheduleStack/);\n  assert.match(priorityCss, /TOURNAMENTS_PHASE4BC_WEB_REDESIGN_V2/);\n  assert.match(priorityCss, /grid-template-columns:1fr!important/);\n  assert.match(priorityCss, /position:sticky;top:var\\(--snooker-header-height\\)/);\n  assert.match(priorityCss, /matchDetailBody,.matchDetailBodyWithData\\{display:flex!important;flex-direction:column!important/);\n'''
if old not in f:
    raise SystemExit('foundation phase4 expectation block missing')
f = f.replace(old, new, 1)
FOUNDATION.write_text(f)

p = PHASE4.read_text()
p = p.replace('  assert.match(priorityCss, /TOURNAMENTS_PHASE4BC_CORE/);', '  assert.match(priorityCss, /TOURNAMENTS_PHASE4BC_WEB_REDESIGN_V2/);\n  assert.match(uiSource, /detailSiteHeader/);\n  assert.match(uiSource, /eventStickyIdentity/);\n  assert.match(uiSource, /scheduleDesktopMatch/);\n  assert.doesNotMatch(uiSource, /matchContextBar/);')
PHASE4.write_text(p)

print('phase4bc web redesign applied')
