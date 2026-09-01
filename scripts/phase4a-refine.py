from pathlib import Path
import re

tsx_path = Path('app/snooker/snooker-data-center-v2.tsx')
css_path = Path('app/snooker/snooker-priority.module.css')
tsx = tsx_path.read_text()
css = css_path.read_text()

season_pattern = r'''function SeasonSelector\(\{ seasons, value, onChange, onPrefetch \}: \{ seasons: string\[\]; value: string; onChange: \(season: string\) => void; onPrefetch\?: \(season: string\) => void \}\) \{.*?\n\}\n\nfunction statValue'''
season_replacement = '''function RecentEventCard({ item, onOpen, onPrefetch }: { item: SnookerCalendarEvent; onOpen: () => void; onPrefetch?: () => void }) {
  const nameZh = item.nameZh?.trim() || item.nameEn?.trim() || "赛事名称待确认";
  const nameEn = item.nameEn?.trim();
  const typeZh = item.typeZh?.trim() || "赛事";
  const place = [item.countryZh, item.cityZh].map((value) => value?.trim()).filter(Boolean).join(" ");
  return <button className={priority.recentEventCard} data-status={item.status} onPointerEnter={onPrefetch} onFocus={onPrefetch} onTouchStart={onPrefetch} onClick={onOpen}>
    <div className={priority.recentEventCardTop}><StatusPill status={item.status} label={eventStatusLabel(item)} /><small>{typeZh}</small></div>
    <strong>{nameZh}</strong>
    {nameEn ? <small className={priority.recentEventEnglish}>{nameEn}</small> : null}
    <p>{formatDateRange(item.startDate, item.endDate)}{place ? ` · ${place}` : ""}</p>
    <span>查看详情 ›</span>
  </button>;
}

function SeasonSelector({ seasons, value, onChange, onPrefetch }: { seasons: string[]; value: string; onChange: (season: string) => void; onPrefetch?: (season: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const desktopVisibleCount = 6;
  const hiddenCount = Math.max(0, seasons.length - desktopVisibleCount);
  const scroll = (direction: -1 | 1) => rail.current?.scrollBy({ left: direction * 180, behavior: "auto" });
  return <div className={priority.seasonSelector} data-expanded={expanded ? "true" : "false"} aria-label="赛季选择器">
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(-1)} aria-label="查看较新赛季">‹</button>
    <div className={priority.seasonRail} ref={rail}>
      {seasons.map((season, index) => {
        const older = index >= desktopVisibleCount && season !== value;
        return <button type="button" key={season} aria-label={`${season}赛季`} className={`${season === value ? priority.seasonActive : ""} ${older ? priority.seasonOlder : ""}`} onPointerEnter={() => onPrefetch?.(season)} onFocus={() => onPrefetch?.(season)} onTouchStart={() => onPrefetch?.(season)} onClick={() => onChange(season)}>{season}</button>;
      })}
    </div>
    <button type="button" className={priority.seasonArrow} onClick={() => scroll(1)} aria-label="查看较早赛季">›</button>
    {hiddenCount > 0 ? <button type="button" className={priority.seasonMoreButton} onClick={() => setExpanded((current) => !current)}>{expanded ? "收起历史赛季" : `更多历史赛季（${hiddenCount}）`}</button> : null}
  </div>;
}

function statValue'''
tsx, count = re.subn(season_pattern, season_replacement, tsx, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'SeasonSelector replacement failed: {count}')

recent_pattern = r'''  const firstUpcomingCurrent = seasonCalendar\.find\(\(item\) => item\.startDate > today\);\n  const recentEvents = seasonCalendar.*?\n  const recentListEvents = featuredEventCard \? recentEvents\.filter\(\(item\) => item\.id !== featuredEventCard\.id\) : recentEvents;'''
recent_replacement = '''  const firstUpcomingCurrent = mainSeasonEvents.find((item) => item.startDate > today);
  const recentFeaturedEvent = activeEventCard;
  const recentCompletedEvents = [...mainSeasonEvents]
    .filter((item) => item.endDate < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 3);
  const recentCardEvents = [firstUpcomingCurrent, ...recentCompletedEvents]
    .filter((item): item is SnookerCalendarEvent => Boolean(item) && item?.id !== recentFeaturedEvent?.id)
    .slice(0, 4);'''
tsx, count = re.subn(recent_pattern, recent_replacement, tsx, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'Recent events replacement failed: {count}')

matches_pattern = r'''        <div className=\{priority\.eventCenterLayout\}>.*?        </div>\n      </> : null\}'''
matches_replacement = '''        <div className={priority.eventCenterLayout}>
          <aside className={priority.eventSidebar} aria-label="赛事浏览与筛选">
            <div className={priority.eventModeTabs}><button className={eventListMode === "recent" ? priority.eventModeActive : ""} onClick={() => setEventListMode("recent")}>近期赛事</button><button className={eventListMode === "calendar" ? priority.eventModeActive : ""} onClick={() => setEventListMode("calendar")}>赛季赛历</button></div>
            {eventListMode === "calendar" ? <SeasonSelector seasons={seasonOptions} value={selectedSeason} onPrefetch={(season) => { void ensureCalendarSeason(season); }} onChange={(season) => { setSelectedSeason(season); void ensureCalendarSeason(season); }} /> : null}
          </aside>
          <div className={priority.eventListPanel}>
            {eventListMode === "recent" ? <>
              {recentFeaturedEvent ? <section className={styles.currentEventBanner} onPointerEnter={() => void ensureEventDetail(recentFeaturedEvent.slug)} onFocus={() => void ensureEventDetail(recentFeaturedEvent.slug)} onTouchStart={() => void ensureEventDetail(recentFeaturedEvent.slug)} onClick={() => openEvent(recentFeaturedEvent.slug, "overview")}><div><span className={eventStatusClass(recentFeaturedEvent.status)}><StatusPill status={recentFeaturedEvent.status} label="正在进行" /></span><small>{recentFeaturedEvent.typeZh}</small></div><h2>{recentFeaturedEvent.nameZh}</h2>{recentFeaturedEvent.nameEn ? <small className={priority.featuredEventEnglish}>{recentFeaturedEvent.nameEn}</small> : null}<p>{formatDateRange(recentFeaturedEvent.startDate, recentFeaturedEvent.endDate)}{recentFeaturedEvent.cityZh ? ` · ${recentFeaturedEvent.cityZh}` : ""}</p><span>查看详情 ›</span></section> : null}
              <section className={styles.card}><SectionHeader eyebrow="RECENT TOURNAMENTS" title="近期赛事" action="最多 5 站" /><div className={priority.recentEventGrid}>{recentCardEvents.map((item) => <RecentEventCard key={item.id} item={item} onPrefetch={() => void ensureEventDetail(item.slug)} onOpen={() => openEvent(item.slug)} />)}{recentCardEvents.length === 0 && !recentFeaturedEvent ? <div className={styles.emptyState}>本赛季暂无可显示的近期赛事。</div> : null}</div><button className={priority.recentMoreButton} onClick={() => { setSelectedSeason(initialCurrentSeason); setEventListMode("calendar"); void ensureCalendarSeason(initialCurrentSeason); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" })); }}>查看本赛季完整赛历</button></section>
            </> : selectedSeasonLoadError && !selectedSeasonLoaded ? <section className={styles.card}><div className={styles.emptyState}>该赛季赛历加载失败，请稍后重试。</div><button className={styles.fullButton} onClick={() => void ensureCalendarSeason(selectedSeason)}>重新加载</button></section> : <section className={`${styles.card} ${priority.calendarTableCard}`}><SectionHeader eyebrow={`${selectedSeason} SEASON`} title="赛季赛历" action={selectedSeasonLoading ? "正在加载…" : selectedSeasonLoaded ? `共 ${selectedSeasonEvents.length} 项赛事` : "按需加载"} /><div className={priority.eventTableHead} aria-hidden="true"><span>日期 / 状态</span><span>赛事</span><span>类型</span><span>日期 / 地点</span><span /></div><div className={styles.calendarList}>{selectedSeasonEvents.map((item) => <EventCard key={item.id} item={item} onPrefetch={() => void ensureEventDetail(item.slug)} onOpen={() => openEvent(item.slug)} />)}{selectedSeasonEvents.length === 0 ? <div className={styles.emptyState}>{selectedSeasonLoading ? "正在加载该赛季赛历…" : selectedSeasonLoaded ? "该赛季暂无赛事。" : "选择赛季后加载赛事。"}</div> : null}</div></section>}
          </div>
        </div>
      </> : null}'''
tsx, count = re.subn(matches_pattern, matches_replacement, tsx, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'Matches layout replacement failed: {count}')

marker = '/* TOURNAMENTS_PHASE4A_DESKTOP */'
if marker not in css:
    raise SystemExit('Phase4A CSS marker not found')
css = css.split(marker, 1)[0].rstrip() + '\n\n' + marker + '''
.eventCenterLayout,.eventSidebar,.eventListPanel{display:contents}
.eventTableHead,.featuredEventEnglish,.seasonMoreButton{display:none}
.recentEventGrid{display:grid;grid-template-columns:1fr;gap:10px}
.recentEventCard{width:100%;min-width:0;padding:15px;border:1px solid var(--line);border-radius:15px;background:#fbfcfb;color:inherit;text-align:left;cursor:pointer;box-shadow:0 7px 20px rgba(35,45,41,.025)}
.recentEventCard[data-status="upcoming"]{border-color:color-mix(in srgb,#c2a64a 28%,var(--line));background:#fffdf6}
.recentEventCardTop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.recentEventCardTop>small{color:var(--muted);font-size:8px;font-weight:750}.recentEventCard>strong{display:block;overflow:hidden;font-size:13px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.recentEventEnglish{display:block;margin-top:3px;overflow:hidden;color:#969d99;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.recentEventCard>p{margin:9px 0 0;color:var(--muted);font-size:8px;line-height:1.45}.recentEventCard>span{display:block;margin-top:12px;color:var(--accent-strong);font-size:8px;font-weight:850}
.recentMoreButton{width:100%;margin-top:12px;padding:12px;border:0;border-radius:12px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:850;cursor:pointer}

@media (min-width:1024px){
  .eventCenterLayout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px;align-items:start}
  .eventSidebar{display:flex;min-width:0;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 10px 28px rgba(35,45,41,.035);position:sticky;top:calc(var(--snooker-header-height,68px) + 18px)}
  .eventModeTabs{display:grid;grid-template-columns:1fr;gap:6px;padding:0;border:0;border-radius:0;background:transparent}
  .eventModeTabs button{height:43px;padding:0 12px;border:1px solid transparent;border-radius:11px;text-align:left;font-size:11px;font-weight:850;color:#4f5853}
  .eventModeTabs .eventModeActive{border-color:color-mix(in srgb,var(--accent) 18%,var(--line));background:var(--accent-faint);color:var(--accent-strong);box-shadow:none}
  .seasonSelector{display:block;margin:0 0 0 8px;padding:4px 0 0 10px;border-left:1px solid var(--line)}
  .seasonArrow{display:none}
  .seasonRail{display:flex;flex-direction:column;gap:3px;overflow:visible}
  .seasonRail button{width:100%;min-width:0;height:34px;padding:0 9px;border:0;border-radius:9px;background:transparent;color:#78807c;text-align:left;font-size:9.5px;font-weight:750;scroll-snap-align:none}
  .seasonRail button:hover{background:#f5f7f6;color:#4f5853}
  .seasonRail button.seasonActive{background:var(--accent-soft);color:var(--accent-strong);font-weight:900}
  .seasonSelector:not([data-expanded="true"]) .seasonOlder{display:none}
  .seasonMoreButton{display:block;width:100%;margin-top:5px;padding:8px 8px;border:0;border-radius:9px;background:transparent;color:#8a928e;text-align:left;font-size:8.5px;font-weight:800;cursor:pointer}
  .seasonMoreButton:hover{background:#f5f7f6;color:var(--accent-strong)}
  .eventListPanel{display:flex;min-width:0;flex-direction:column;gap:18px}
  .eventListPanel :global([class*="currentEventBanner"]){min-height:154px;padding:22px 24px;border-radius:20px}
  .eventListPanel :global([class*="currentEventBanner"]) h2{max-width:80%;margin:17px 0 2px;font-size:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .featuredEventEnglish{display:block;max-width:80%;margin:0 0 8px;color:rgba(255,255,255,.58);font-size:9px;font-weight:650;letter-spacing:.035em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .eventListPanel :global([class*="currentEventBanner"]) p{font-size:10px}.eventListPanel :global([class*="currentEventBanner"])>span{margin-top:13px}
  .recentEventGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .recentEventCard{min-height:142px;padding:16px 17px;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease}
  .recentEventCard:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--accent) 20%,var(--line));box-shadow:0 10px 24px rgba(35,45,41,.05)}
  .recentEventCard:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 24%,transparent);outline-offset:2px}
  .recentMoreButton{display:none}
  .calendarTableCard{overflow:visible}
  .eventTableHead{position:sticky;top:var(--snooker-header-height,68px);z-index:8;display:grid;grid-template-columns:84px minmax(0,1.75fr) 108px minmax(170px,1fr) 18px;gap:14px;align-items:center;margin:0 -18px;padding:11px 22px 10px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);border-radius:0;background:#fff;box-shadow:0 6px 14px rgba(35,45,41,.035);color:#919894;font-size:8px;font-weight:800;letter-spacing:.04em}
  .eventTableHead span:first-child{text-align:center}
  .eventListPanel :global([class*="calendarList"]){margin-top:0}
  .eventListPanel :global([class*="calendarList"])>button{min-height:76px;padding:13px 4px;border-top:1px solid var(--line);display:grid;grid-template-columns:84px minmax(0,1.75fr) 108px minmax(170px,1fr) 18px;grid-template-rows:auto auto;gap:2px 14px;align-items:center}
  .eventListPanel :global([class*="calendarList"])>button:first-child{border-top:0}.eventListPanel :global([class*="calendarList"])>button:hover{background:var(--accent-faint)}
  .eventListPanel :global([class*="calendarList"])>button:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 24%,transparent);outline-offset:2px;border-radius:10px}
  .eventListPanel :global([class*="calendarList"])>button[class*="calendarCurrent"]{margin:0;padding:13px 4px;border:0;border-left:3px solid var(--accent);border-radius:10px;background:var(--accent-faint)}
  .eventListPanel :global([class*="calendarList"])>button>div:first-child{grid-column:1;grid-row:1 / span 2}.eventListPanel :global([class*="calendarList"])>button>div:nth-child(2){display:contents}
  .eventListPanel :global([class*="calendarList"])>button>div:nth-child(2)>strong{grid-column:2;grid-row:1;min-width:0;font-size:14px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .eventListPanel :global([class*="calendarList"])>button>div:nth-child(2)>small{grid-column:2;grid-row:2;min-width:0;margin-top:1px;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .eventListPanel :global([class*="calendarList"])>button>div:nth-child(2)>span{grid-column:3;grid-row:1 / span 2;margin:0;align-self:center}.eventListPanel :global([class*="calendarList"])>button>div:nth-child(2)>p{grid-column:4;grid-row:1 / span 2;margin:0;align-self:center;font-size:9px;line-height:1.45;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.eventListPanel :global([class*="calendarList"])>button>em{grid-column:5;grid-row:1 / span 2;align-self:center}
  .eventListPanel :global([class*="calendarDate"]) b{font-size:13px}.eventListPanel :global([class*="calendarDate"]) small{margin-top:5px;font-size:8px}
}

@media (min-width:1280px){.eventCenterLayout{grid-template-columns:200px minmax(0,1fr);gap:20px}}
@media (min-width:1024px) and (max-width:1180px){.eventCenterLayout{grid-template-columns:184px minmax(0,1fr);gap:16px}.eventTableHead,.eventListPanel :global([class*="calendarList"])>button{grid-template-columns:76px minmax(0,1.55fr) 96px minmax(150px,1fr) 16px;gap:2px 10px}}
'''.strip() + '\n'

tsx_path.write_text(tsx)
css_path.write_text(css)
