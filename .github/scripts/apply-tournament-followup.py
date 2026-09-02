from pathlib import Path

TSX = Path('app/snooker/snooker-data-center-v2.tsx')
CSS = Path('app/snooker/snooker-priority.module.css')
TEST = Path('tests/tournaments-phase4-followup.test.mjs')

s = TSX.read_text()

def replace_once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'missing {label}')
    s = s.replace(old, new, 1)

# Remove scroll-driven compact hero state/effect. Tabs will be the only sticky event-detail element.
replace_once('  const [eventHeaderCompact, setEventHeaderCompact] = useState(false);\n', '', 'eventHeaderCompact state')
compact_effect = '''  useEffect(() => {\n    if (detail?.type !== "event") return;\n\n    const desktopQuery = window.matchMedia("(min-width: 1024px)");\n    let frame = 0;\n    const updateCompactState = () => {\n      frame = 0;\n      const nextCompact = desktopQuery.matches && window.scrollY > 64;\n      setEventHeaderCompact((current) => current === nextCompact ? current : nextCompact);\n    };\n    const requestUpdate = () => {\n      if (!frame) frame = window.requestAnimationFrame(updateCompactState);\n    };\n\n    requestUpdate();\n    window.addEventListener("scroll", requestUpdate, { passive: true });\n    window.addEventListener("resize", requestUpdate);\n    return () => {\n      if (frame) window.cancelAnimationFrame(frame);\n      window.removeEventListener("scroll", requestUpdate);\n      window.removeEventListener("resize", requestUpdate);\n    };\n  }, [detail?.type]);\n\n'''
replace_once(compact_effect, '', 'compact hero effect')

# Secondary/tertiary desktop pages deliberately have no selected root-nav item.
old_detail_nav = '''    <nav className={styles.desktopNav} aria-label="主要导航">{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} aria-current={item.id === activeView ? "page" : undefined} className={item.id === activeView ? styles.desktopNavActive : ""} onPointerEnter={() => warmRootView(item.id)} onFocus={() => warmRootView(item.id)} onTouchStart={() => warmRootView(item.id)} onClick={(event) => { event.preventDefault(); changeView(item.id); }}><span>{item.label}</span><small>{item.labelEn}</small></a>)}</nav>'''
new_detail_nav = '''    <nav className={styles.desktopNav} aria-label="主要导航">{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} onPointerEnter={() => warmRootView(item.id)} onFocus={() => warmRootView(item.id)} onTouchStart={() => warmRootView(item.id)} onClick={(event) => { event.preventDefault(); changeView(item.id); }}><span>{item.label}</span><small>{item.labelEn}</small></a>)}</nav>'''
replace_once(old_detail_nav, new_detail_nav, 'detail nav active state')

# Restore mobile-only back controls for event/match detail headers. Desktop still hides local headers.
for old, new, label in [
    ('<header className={`${styles.detailHeader} ${priority.detailLocalHeader} ${priority.detailLocalHeaderNoBack}`}><strong>比赛详情</strong><span>MATCH</span></header>', '<header className={`${styles.detailHeader} ${priority.detailLocalHeader}`}><button onClick={() => window.history.back()} aria-label="返回上一页">‹</button><strong>比赛详情</strong><span>MATCH</span></header>', 'match loading back header 1'),
    ('<header className={`${styles.detailHeader} ${priority.detailLocalHeader} ${priority.detailLocalHeaderNoBack}`}><strong>比赛详情</strong><span>MATCH</span></header>', '<header className={`${styles.detailHeader} ${priority.detailLocalHeader}`}><button onClick={() => window.history.back()} aria-label="返回上一页">‹</button><strong>比赛详情</strong><span>MATCH</span></header>', 'match loading back header 2'),
    ('<header className={`${styles.detailHeader} ${priority.detailLocalHeader} ${priority.detailLocalHeaderNoBack}`}><strong>比赛详情</strong><span>MATCH</span></header>', '<header className={`${styles.detailHeader} ${priority.detailLocalHeader}`}><button onClick={() => window.history.back()} aria-label="返回上一页">‹</button><strong>比赛详情</strong><span>MATCH</span></header>', 'match detail back header'),
    ('<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader} ${priority.detailLocalHeaderNoBack}`}><strong>{calendarEvent.nameZh}</strong><span>{calendarEvent.season}</span></header>', '<header className={`${styles.detailHeader} ${priority.eventNameHeader} ${priority.detailLocalHeader}`}><button onClick={() => window.history.back()} aria-label="返回上一页">‹</button><strong>{calendarEvent.nameZh}</strong><span>{calendarEvent.season}</span></header>', 'event mobile back header'),
]:
    replace_once(old, new, label)

# Hero is no longer inside a sticky/compact wrapper; only tabs stick on desktop.
open_wrapper = '''      <div className={`${priority.eventStickyNav} ${eventHeaderCompact ? priority.eventDetailCompact : ""}`} data-event-header-state={eventHeaderCompact ? "compact" : "expanded"}>\n        <section className={`${styles.eventDetailHero} ${priority.eventDetailHeroDesktop}`}><div className={styles.eventDetailTop}><StatusPill status={calendarEvent.status} label={calendarEvent.statusLabelZh} /><span>{eventDetailTypeLabel(calendarEvent)}</span></div><h1>{calendarEvent.nameZh}</h1><p>{calendarEvent.nameEn}</p><div className={styles.eventDetailMeta}>{isHistoricalEvent ? <span className={priority.eventHeroHistory}>{calendarEvent.season}赛季 · 历史赛事</span> : null}<span>{formatDateRange(overviewStart, overviewEnd)}</span><span>{overviewCountry} · {overviewCity}</span></div></section>\n        <div className={`${styles.eventTabs} ${priority.eventDetailTabs}`}>'''
new_wrapper = '''      <section className={`${styles.eventDetailHero} ${priority.eventDetailHeroDesktop}`}><div className={styles.eventDetailTop}><StatusPill status={calendarEvent.status} label={calendarEvent.statusLabelZh} /><span>{eventDetailTypeLabel(calendarEvent)}</span></div><h1>{calendarEvent.nameZh}</h1><p>{calendarEvent.nameEn}</p><div className={styles.eventDetailMeta}>{isHistoricalEvent ? <span className={priority.eventHeroHistory}>{calendarEvent.season}赛季 · 历史赛事</span> : null}<span>{formatDateRange(overviewStart, overviewEnd)}</span><span>{overviewCountry} · {overviewCity}</span></div></section>\n      <div className={`${styles.eventTabs} ${priority.eventDetailTabs}`}>'''
replace_once(open_wrapper, new_wrapper, 'event sticky wrapper opening')
replace_once('''</button></div>\n      </div>\n\n      {detail.tab === "overview" ? <>''', '''</button></div>\n\n      {detail.tab === "overview" ? <>''', 'event sticky wrapper closing')

TSX.write_text(s)

css = CSS.read_text()
marker = '/* TOURNAMENTS_PHASE4_FOLLOWUP_V1 */'
if marker not in css:
    css += r'''

/* TOURNAMENTS_PHASE4_FOLLOWUP_V1 */
@media (min-width:1024px){
  /* Keep secondary/tertiary pages on the shared website canvas and restore useful desktop width. */
  .eventDetailShell,.matchDetailShell{width:min(1280px,calc(100% - 48px))!important;margin:0 auto!important;background:transparent!important;box-shadow:none!important}

  /* Stable event detail scrolling: hero scrolls normally; only the three tabs stick below the global header. */
  .eventStickyNav{display:contents!important;position:static!important;overflow:visible!important;background:transparent!important;box-shadow:none!important}
  .eventDetailHeroDesktop{position:relative!important;max-height:none!important;padding:32px 34px 30px!important;border-radius:0 0 24px 24px!important;overflow:hidden!important;transition:none!important}
  .eventDetailHeroDesktop h1{max-width:82%!important;margin:20px 0 7px!important;font-size:clamp(38px,3vw,44px)!important;line-height:1.14!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;transition:none!important}
  .eventDetailHeroDesktop>p{max-width:82%!important;font-size:12.5px!important;line-height:1.4!important;transition:none!important}
  .eventDetailHeroDesktop :global([class*="eventDetailMeta"]){margin-top:18px!important;gap:18px!important;font-size:13px!important;transition:none!important}
  .eventDetailTabs{position:sticky!important;top:var(--snooker-header-height)!important;z-index:65!important;margin:0!important;padding:0 24px!important;border-radius:0!important;border-bottom:1px solid var(--line)!important;background:rgba(255,255,255,.97)!important;box-shadow:0 6px 16px rgba(35,45,41,.055)!important;backdrop-filter:blur(16px)}
  .eventDetailTabs button{height:52px!important;font-size:13px!important;font-weight:800!important}

  /* Typography V1: tournament list. */
  .recentEventCard>strong{font-size:15px!important}
  .recentEventEnglish{font-size:11px!important;line-height:1.35!important}
  .recentEventCard>p{font-size:11.5px!important;line-height:1.5!important}
  .recentEventCardTop>small{font-size:10px!important}
  .recentEventCard>span{font-size:12.5px!important}
  .eventListPanel :global([class*="currentEventBanner"]) h2{font-size:26px!important}
  .featuredEventEnglish{font-size:11px!important}
  .eventListPanel :global([class*="currentEventBanner"]) p{font-size:12px!important}
  .eventListPanel :global([class*="currentEventBanner"])>span{font-size:12.5px!important}

  /* Typography V1: event overview / data. */
  .eventDetailShell :global([class*="sectionHeader"]) h2{font-size:22px!important}
  .eventDetailShell :global([class*="sectionHeader"]) small{font-size:9px!important}
  .eventDetailShell :global([class*="sectionHeader"])>span{font-size:11px!important}
  .eventOverviewCard :global([class*="eventOverviewGrid"]) span{font-size:11px!important}
  .eventOverviewCard :global([class*="eventOverviewGrid"]) b{font-size:14px!important;line-height:1.4!important}
  .eventPrizeCard :global([class*="prizeRow"]) span{font-size:12px!important}
  .eventPrizeCard :global([class*="prizeRow"]) b{font-size:14px!important}
  .eventDetailShell :global([class*="statGrid"]) article small{font-size:10px!important}
  .eventDetailShell :global([class*="statGrid"]) article span{font-size:11px!important}
  .eventDetailShell :global([class*="chinaResultList"]) b,.eventDetailShell :global([class*="chinaResultList"]) strong{font-size:14px!important}

  /* Typography V1: schedule. One match per row remains unchanged structurally. */
  .eventScheduleStack :global([class*="sectionHeader"]) h2{font-size:22px!important}
  .scheduleMeta strong{font-size:15px!important}
  .scheduleMeta span{font-size:12px!important}
  .scheduleMeta small{font-size:11px!important}
  .schedulePlayerName strong{font-size:15px!important}
  .schedulePlayerName small{font-size:11px!important;line-height:1.35!important}
  .scheduleScore b{font-size:27px!important}
  .scheduleScore small{font-size:11px!important}
  .scheduleAction :global([class*="statusPill"]){font-size:10px!important}
  .scheduleDetailAction{font-size:12.5px!important}

  /* Typography V1: match detail, keeping vertical order matchup -> frames -> statistics. */
  .matchHeroDesktop h1{font-size:22px!important}
  .matchHeroDesktop :global([class*="matchHeroMeta"]){font-size:12px!important}
  .matchHeroDesktop :global([class*="versusPlayer"])>strong{font-size:18px!important}
  .matchHeroDesktop :global([class*="versusPlayer"])>small{font-size:11px!important}
  .matchFramePanel :global([class*="frameHead"]){font-size:12px!important}
  .matchFramePanel :global([class*="frameRow"]){font-size:13px!important}
  .matchFramePanel :global([class*="frameRow"]) strong{font-size:16px!important}
  .matchDataPanel :global([class*="matchupHeader"]) h2{font-size:22px!important}
  .matchDataPanel :global([class*="dataTabs"]) button span{font-size:13px!important}
  .matchDataPanel :global([class*="dataTabs"]) button small{font-size:9px!important}
  .matchDataPanel :global([class*="compareGrid"]){font-size:12px!important}
}

@media (min-width:1024px) and (max-width:1180px){
  .eventDetailShell,.matchDetailShell{width:calc(100% - 32px)!important}
  .eventDetailHeroDesktop h1{font-size:38px!important}
  .schedulePlayerName strong{font-size:15px!important}
  .schedulePlayerName small{font-size:10.5px!important}
}
'''
CSS.write_text(css)

TEST.write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("tournament detail uses stable tabs-only sticky behavior", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);
  assert.doesNotMatch(ui, /eventHeaderCompact/);
  assert.doesNotMatch(ui, /data-event-header-state/);
  assert.match(css, /TOURNAMENTS_PHASE4_FOLLOWUP_V1/);
  assert.match(css, /\.eventDetailTabs\{position:sticky!important;top:var\(--snooker-header-height\)!important/);
});

test("secondary and tertiary tournament pages restore mobile back controls and web width", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);
  assert.match(ui, /aria-label="返回上一页"/);
  assert.match(css, /\.eventDetailShell,\.matchDetailShell\{width:min\(1280px,calc\(100% - 48px\)\)!important/);
});

test("detail website navigation does not keep a root item selected", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const start = ui.indexOf("const detailSiteHeader");
  const end = ui.indexOf("if (detail?.type === \"player\")", start);
  const header = ui.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(header, /desktopNavActive/);
  assert.doesNotMatch(header, /aria-current=/);
});
''')

print('tournament follow-up patch prepared')
