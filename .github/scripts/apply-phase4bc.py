from pathlib import Path

TSX = Path('app/snooker/snooker-data-center-v2.tsx')
CSS = Path('app/snooker/snooker-priority.module.css')

text = TSX.read_text()

def patch_region(source, start_marker, end_marker, transforms):
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    region = source[start:end]
    original = region
    for old, new, count in transforms:
        if old not in region:
            raise SystemExit(f'missing marker in region: {old[:120]}')
        region = region.replace(old, new, count)
    if region == original:
        raise SystemExit('region unchanged')
    return source[:start] + region + source[end:]

text = patch_region(text, '  if (detail?.type === "match") {', '  if (detail?.type === "event") {', [
    ('<div className={styles.detailShell}>', '<div className={`${styles.detailShell} ${priority.matchDetailShell}`} data-match-detail>', 1),
    ('<section className={styles.matchHero}>', '<section className={`${styles.matchHero} ${priority.matchHeroDesktop}`}>', 1),
    ('      </section>\n\n      <section className={styles.frameSection}>', '''      </section>\n\n      <div className={priority.matchContextBar} aria-label="比赛信息">\n        <span><small>轮次</small><b>{match.roundLabelZh}</b></span>\n        <span><small>时间</small><b>{match.timeLabelZh ?? "待定"}</b></span>\n        {match.tableLabelZh ? <span><small>球台</small><b>{match.tableLabelZh}</b></span> : null}\n        {match.sessionLabelZh ? <span><small>阶段</small><b>{match.sessionLabelZh}</b></span> : null}\n        <span><small>赛制</small><b>{bestOfLabel(match.bestOf)}</b></span>\n      </div>\n\n      <div className={`${priority.matchDetailBody} ${hasMatchupData ? priority.matchDetailBodyWithData : ""}`}>\n      <section className={`${styles.frameSection} ${priority.matchFramePanel}`}>''', 1),
    ('{hasMatchupData ? <section className={polish.matchupCard}>', '{hasMatchupData ? <section className={`${polish.matchupCard} ${priority.matchDataPanel}`}>', 1),
    ('\n      {realtime ? <div className={styles.liveFooter}>', '\n      </div>\n\n      {realtime ? <div className={styles.liveFooter}>', 1),
])

text = patch_region(text, '  if (detail?.type === "event") {', '  const featuredDetail =', [
    ('<div className={styles.detailShell}>', '<div className={`${styles.detailShell} ${priority.eventDetailShell}`} data-event-detail>', 1),
    ('<section className={styles.eventDetailHero}>', '<section className={`${styles.eventDetailHero} ${priority.eventDetailHeroDesktop}`}>', 1),
    ('<div className={styles.eventTabs}>', '<div className={`${styles.eventTabs} ${priority.eventDetailTabs}`}>', 1),
    ('<div className={styles.roundStack}>', '<div className={`${styles.roundStack} ${priority.eventScheduleStack}`}>', 1),
    ('<section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW"', '<section className={`${styles.card} ${priority.eventOverviewCard}`}><SectionHeader eyebrow="TOURNAMENT OVERVIEW"', 1),
    ('<section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY"', '<section className={`${styles.card} ${priority.eventPrizeCard}`}><SectionHeader eyebrow="PRIZE MONEY"', 1),
])

TSX.write_text(text)

css = CSS.read_text()
marker = '/* TOURNAMENTS_PHASE4BC_CORE */'
if marker not in css:
    css += r'''

/* TOURNAMENTS_PHASE4BC_CORE */
.eventDetailHeroDesktop,.matchHeroDesktop{min-width:0}
.matchContextBar{margin:12px 14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--line)}
.matchContextBar>span{min-width:0;padding:11px 12px;background:#fff}
.matchContextBar small,.matchContextBar b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.matchContextBar small{color:var(--muted);font-size:8px}
.matchContextBar b{margin-top:4px;font-size:10px}
.matchDetailBody{display:block}

@media (min-width:1024px){
  .eventDetailShell,.matchDetailShell{width:min(1180px,calc(100% - 40px));margin:0 auto;background:#f7f8f7;box-shadow:0 0 70px rgba(25,35,31,.07)}
  .eventDetailShell :global([class*="detailHeader"]),.matchDetailShell :global([class*="detailHeader"]){height:var(--snooker-header-height);padding:0 22px}
  .eventDetailHeroDesktop{padding:28px 30px 26px;border-radius:0 0 24px 24px;background:radial-gradient(circle at 92% 0,rgba(255,255,255,.15),transparent 34%),linear-gradient(135deg,var(--accent-dark),var(--accent))}
  .eventDetailHeroDesktop h1{max-width:820px;margin:20px 0 5px;font-size:34px;line-height:1.18}
  .eventDetailHeroDesktop>p{max-width:820px;font-size:11px}
  .eventDetailHeroDesktop :global([class*="eventDetailMeta"]){margin-top:18px;gap:18px;font-size:10px}
  .eventDetailTabs{top:var(--snooker-header-height);z-index:55;margin:0;padding:0 22px;border-radius:0;background:rgba(255,255,255,.97);box-shadow:0 5px 14px rgba(35,45,41,.035)}
  .eventDetailTabs button{height:54px;font-size:11px}
  .eventDetailShell>.eventOverviewCard,.eventDetailShell>.eventPrizeCard{margin:16px 18px}
  .eventScheduleStack{margin:16px 18px!important;gap:16px!important}
  .eventScheduleStack>section{padding:20px 22px}
  .eventScheduleStack :global([class*="matchRow"]){min-height:86px;padding:14px 16px;border-radius:13px;background:#fbfcfb}
  .eventScheduleStack :global([class*="matchLine"]) span{font-size:12px}
  .eventScheduleStack :global([class*="matchLine"]) b{font-size:18px}
  .eventOverviewCard :global([class*="eventOverviewGrid"]){grid-template-columns:repeat(3,minmax(0,1fr))}
  .eventPrizeCard :global([class*="prizeTable"]){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;border-top:0}
  .eventPrizeCard :global([class*="prizeRow"]){border-top:1px solid var(--line)}

  .matchHeroDesktop{padding:24px 34px 30px;text-align:center;border-radius:0 0 24px 24px;background:radial-gradient(circle at 50% -30%,rgba(255,255,255,.18),transparent 38%),linear-gradient(135deg,var(--accent-dark),var(--accent))}
  .matchHeroDesktop :global([class*="matchHeroMeta"]){max-width:1040px;margin:0 auto;font-size:10px}
  .matchHeroDesktop h1{margin:15px 0 22px;font-size:19px}
  .matchHeroDesktop :global([class*="versusGrid"]){max-width:790px;margin:0 auto;grid-template-columns:minmax(0,1fr) 170px minmax(0,1fr);gap:30px}
  .matchHeroDesktop :global([class*="avatar_xl"]){width:102px;height:102px}
  .matchHeroDesktop :global([class*="versusPlayer"])>strong{font-size:16px}
  .matchHeroDesktop :global([class*="versusPlayer"])>small{max-width:220px;font-size:9px}
  .matchHeroDesktop :global([class*="bigScore"]) strong{font-size:46px}
  .matchHeroDesktop :global([class*="bigScore"])>small{font-size:9px}
  .matchContextBar{max-width:1144px;margin:16px 18px;grid-template-columns:repeat(5,minmax(0,1fr));border-radius:14px}
  .matchContextBar>span{padding:12px 14px;text-align:center}
  .matchContextBar small{font-size:8px}.matchContextBar b{font-size:10px}
  .matchDetailBody{margin:0 18px 18px}
  .matchDetailBodyWithData{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(380px,.8fr);gap:16px;align-items:start}
  .matchFramePanel{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(35,45,41,.035)}
  .matchFramePanel :global([class*="frameHead"]){position:sticky;top:var(--snooker-header-height);z-index:9;background:#fff;border-bottom:1px solid var(--line)}
  .matchFramePanel :global([class*="frameRow"]){min-height:56px!important}
  .matchDataPanel{min-width:0;margin:0!important;position:sticky;top:calc(var(--snooker-header-height) + 16px);box-shadow:0 10px 28px rgba(35,45,41,.04)}
  .matchDetailShell>.matchDetailBody+ :global([class*="liveFooter"]){margin:0 18px 18px}
}

@media (min-width:1180px){
  .eventScheduleStack :global([class*="matchList"]){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 12px}
}

@media (max-width:1023px){
  .matchContextBar>span:last-child:nth-child(odd){grid-column:1/-1}
}
'''
CSS.write_text(css)
print('phase4bc patch applied')
