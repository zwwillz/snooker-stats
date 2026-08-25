from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def append_once(path, marker, addition):
    p = Path(path)
    text = p.read_text()
    if marker in text:
        return
    p.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n")

# 1. Client live reconciliation + deterministic headline selection.
path = "app/snooker/snooker-data-center-v2.tsx"
replace_once(path,
'import { eventDetailTypeLabel } from "@/lib/snooker/taxonomy";\n',
'import { eventDetailTypeLabel } from "@/lib/snooker/taxonomy";\nimport { matchDisplayStatus, mergeEventSnapshotsMonotonic, selectHomepageHeadlineMatch } from "@/lib/snooker/live-client";\n')

replace_once(path,
'  | { type: "match"; matchId: string; eventSlug: string }\n',
'  | { type: "match"; matchId: string; eventSlug: string; seriesSlug?: string }\n')

replace_once(path,
'''function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""}`}>{label}</span>;
}''',
'''function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""} ${status === "live" ? priority.livePill : ""}`}>{label}</span>;
}''')

replace_once(path,
'<StatusPill status={match.status} label={match.status === "session-break" ? "进行中" : match.statusLabelZh} />',
'<StatusPill status={match.status} label={matchDisplayStatus(match)} />')

replace_once(path,
'''  const hasLiveMatch = useMemo(() => databaseEvents.some((event) => allMatches(event).some((match) => match.status === "live" || match.status === "session-break")), [databaseEvents]);

  const refresh = useCallback(async () => {''',
'''  const hasLiveMatch = useMemo(() => databaseEvents.some((event) => allMatches(event).some((match) => match.status === "live" || match.status === "session-break")), [databaseEvents]);
  const shouldPollDashboard = useMemo(() => {
    const now = Date.now();
    return databaseEvents.some((event) => allMatches(event).some((match) => {
      if (match.status === "live" || match.status === "session-break") return true;
      const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : NaN;
      if (match.status === "upcoming" && Number.isFinite(scheduled) && scheduled >= now && scheduled - now <= 6 * 60 * 60 * 1000) return true;
      const completed = Date.parse(match.completedDetectedAt ?? match.sourceUpdatedAt ?? "");
      return (match.status === "completed" || match.status === "walkover") && Number.isFinite(completed) && now - completed <= 60 * 60 * 1000;
    }));
  }, [databaseEvents]);

  const refresh = useCallback(async () => {''')

replace_once(path,
'''      const response = await fetch("/api/snooker/v1/dashboard", { headers: { Accept: "application/json" } });
      const data = await response.json() as DashboardResponse;
      if (response.ok && data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        if (data.databaseEvents) {
          const changedAt = data.sourceHealth?.fetchedAt ?? new Date().toISOString();
          const next = new Map(data.databaseEvents.flatMap((event) => allMatches(event)).map((match) => [match.id, matchSignature(match)]));
          const changed: string[] = [];
          for (const [id, signature] of next) if (signatures.current.get(id) !== signature) changed.push(id);
          signatures.current = next;
          if (changed.length) setMatchUpdatedAt((current) => ({ ...current, ...Object.fromEntries(changed.map((id) => [id, changedAt])) }));
          setDatabaseEvents(data.databaseEvents);
        }
        if (data.eventSeries) setEventSeries(data.eventSeries);
      }''',
'''      const response = await fetch("/api/snooker/v1/dashboard", { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as DashboardResponse;
      if (response.ok && data.ok && data.snapshot) {
        setSnapshot((current) => ({
          ...data.snapshot!,
          event: mergeEventSnapshotsMonotonic([current.event], [data.snapshot!.event])[0] ?? data.snapshot!.event,
        }));
        if (data.databaseEvents) {
          const changedAt = data.sourceHealth?.fetchedAt ?? new Date().toISOString();
          setDatabaseEvents((current) => {
            const merged = mergeEventSnapshotsMonotonic(current, data.databaseEvents!);
            const next = new Map(merged.flatMap((event) => allMatches(event)).map((match) => [match.id, matchSignature(match)]));
            const changed: string[] = [];
            for (const [id, signature] of next) if (signatures.current.get(id) !== signature) changed.push(id);
            signatures.current = next;
            if (changed.length) setMatchUpdatedAt((times) => ({ ...times, ...Object.fromEntries(changed.map((id) => [id, changedAt])) }));
            return merged;
          });
        }
        if (data.eventSeries) setEventSeries(data.eventSeries);
      }''')

replace_once(path,
'''  useEffect(() => {
    if (!hasLiveMatch) return;
    const timer = window.setInterval(() => void refresh(), 30_000);''',
'''  useEffect(() => {
    if (!shouldPollDashboard) return;
    const timer = window.setInterval(() => void refresh(), 30_000);''')
replace_once(path,
'  }, [hasLiveMatch, refresh]);\n',
'  }, [shouldPollDashboard, refresh]);\n')

replace_once(path,
'''      const response = await fetch(`/api/snooker/v1/event?slug=${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
      const data = await response.json() as { ok?: boolean; event?: SnookerEvent };
      if (response.ok && data.ok && data.event) {
        setDatabaseEvents((current) => current.some((event) => event.slug === slug) ? current : [...current, data.event!]);
      }''',
'''      const response = await fetch(`/api/snooker/v1/event?slug=${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as { ok?: boolean; event?: SnookerEvent };
      if (response.ok && data.ok && data.event) {
        setDatabaseEvents((current) => {
          const existing = current.find((event) => event.slug === slug);
          if (!existing) return [...current, data.event!];
          const merged = mergeEventSnapshotsMonotonic([existing], [data.event!])[0] ?? data.event!;
          return current.map((event) => event.slug === slug ? merged : event);
        });
      }''')

replace_once(path,
'''  const openSeries = (series: SnookerEventSeries, tab: EventTab = "overview") => {
    const stage = preferredSeriesStage(series, today);
    if (stage) openEvent(stage.slug, tab, series.slug);
  };
  const openMatch = (matchId: string, eventSlug: string) => {
    setMatchDataTab("match");
    setDetail({ type: "match", matchId, eventSlug });''',
'''  const openSeries = (series: SnookerEventSeries, tab: EventTab = "overview") => {
    const stage = preferredSeriesStage(series, today);
    if (!stage) return;
    setDetail({ type: "event", slug: stage.slug, seriesSlug: series.slug, tab });
    for (const item of series.stages.filter((item) => item.dataReady)) void ensureEventDetail(item.slug);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openMatch = (matchId: string, eventSlug: string, seriesSlug?: string) => {
    setMatchDataTab("match");
    setDetail({ type: "match", matchId, eventSlug, ...(seriesSlug ? { seriesSlug } : {}) });''')

replace_once(path,
'      <header className={styles.detailHeader}><button onClick={() => setDetail({ type: "event", slug: selectedEvent.slug, tab: "schedule" })}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>',
'      <header className={styles.detailHeader}><button onClick={() => setDetail({ type: "event", slug: selectedEvent.slug, ...(detail.seriesSlug ? { seriesSlug: detail.seriesSlug } : {}), tab: "schedule" })}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>')

replace_once(path,
'    const statusLabel = match.status === "completed" || match.status === "walkover" ? "已结束" : match.status === "upcoming" ? "待开始" : "进行中";\n',
'    const statusLabel = matchDisplayStatus(match);\n')

# 2. Series detail: aggregate all WST stages for presentation, remove top stage switcher.
replace_once(path,
'''    const full = eventBySlug.get(detail.slug);
    if (!calendarEvent) return null;
    const eventMatches = full ? allMatches(full) : [];
    const final = full ? finalOf(full) : undefined;
    const champion = final?.winnerId ? players.get(final.winnerId) : undefined;
    const eventStats = full ? {
      matches: eventMatches.length,
      players: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id])).size,
      china: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter((id) => isChina(players.get(id)))).size,
      completed: eventMatches.filter((match) => match.status === "completed" || match.status === "walkover").length,
    } : null;
    const chinaStats = full ? snapshot.players.filter(isChina).map((player) => ({ player, stats: currentEventStats(player.id, full) })).filter((item) => item.stats) : [];
    const totalPrize = full?.prizes?.find((row) => row.isTotal);''',
'''    const full = eventBySlug.get(detail.slug);
    if (!calendarEvent) return null;
    const seriesEvents = seriesDetail
      ? seriesDetail.stages.map((stage) => eventBySlug.get(stage.slug)).filter((event): event is SnookerEvent => Boolean(event))
      : full ? [full] : [];
    const aggregateEvent = seriesDetail && seriesEvents.length ? {
      ...seriesEvents[0],
      id: seriesDetail.id,
      slug: seriesDetail.slug,
      nameZh: seriesDetail.nameZh,
      nameEn: seriesDetail.nameEn,
      startDate: seriesDetail.startDate,
      endDate: seriesDetail.endDate,
      status: seriesDetail.status,
      statusLabelZh: seriesDetail.statusLabelZh,
      cityZh: seriesDetail.cityZh,
      countryZh: seriesDetail.countryZh,
      venueZh: seriesDetail.venueZh ?? seriesEvents[0].venueZh,
      rounds: seriesEvents.flatMap((event) => event.rounds.map((round) => ({ ...round, key: `${event.slug}:${round.key}` }))),
    } satisfies SnookerEvent : full;
    const eventMatches = aggregateEvent ? allMatches(aggregateEvent) : [];
    const final = [...seriesEvents].reverse().map((event) => finalOf(event)).find(Boolean) ?? (full ? finalOf(full) : undefined);
    const champion = final?.winnerId ? players.get(final.winnerId) : undefined;
    const eventStats = aggregateEvent ? {
      matches: eventMatches.length,
      players: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id])).size,
      china: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter((id) => isChina(players.get(id)))).size,
      completed: eventMatches.filter((match) => match.status === "completed" || match.status === "walkover").length,
    } : null;
    const chinaStats = aggregateEvent ? snapshot.players.filter(isChina).map((player) => ({ player, stats: currentEventStats(player.id, aggregateEvent) })).filter((item) => item.stats) : [];
    const prizeEvent = [...seriesEvents].reverse().find((event) => event.prizes?.length) ?? full;
    const totalPrize = prizeEvent?.prizes?.find((row) => row.isTotal);''')

replace_once(path,
'''      {seriesDetail && seriesDetail.stages.length > 1 ? <div className={priority.stageSelector} aria-label="赛事阶段选择">
        {seriesDetail.stages.map((stage) => <button type="button" key={stage.eventId} className={stage.slug === detail.slug ? priority.stageActive : ""} onClick={() => openEvent(stage.slug, detail.tab, seriesDetail.slug)}><span>{stage.stageNameZh}</span><small>{formatDateRange(stage.startDate, stage.endDate)}{stage.dataReady ? "" : " · 数据准备中"}</small></button>)}
      </div> : null}
''', '')

replace_once(path,
'''        {full?.status === "completed" && champion ? <section className={polish.championCard}><div className={polish.championAvatar}><PlayerAvatar player={champion} size="md" /><span>冠</span></div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>{champion.nameZh}</strong><span>{champion.nameEn}</span></div>{final ? <div className={polish.championScore}><small>FINAL</small><b>{final.score1}:{final.score2}</b></div> : null}</section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW" title="赛事概览" /><div className={insight.eventOverviewGrid}><article><span>赛季</span><b>{calendarEvent.season}</b></article><article><span>赛事类型</span><b>{eventDetailTypeLabel(calendarEvent)}</b></article><article><span>比赛时间</span><b>{formatDateRange(calendarEvent.startDate, calendarEvent.endDate)}</b></article><article><span>举办地</span><b>{calendarEvent.countryZh} · {calendarEvent.cityZh}</b></article>{full?.previousChampionZh ? <article><span>上届冠军{full.previousChampionYear ? ` · ${full.previousChampionYear}` : ""}</span><b>{full.previousChampionZh}</b></article> : null}{calendarEvent.venueZh ? <article><span>场馆</span><b>{calendarEvent.venueZh}</b></article> : null}</div></section>
        {full?.prizes?.length ? <section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY" title="奖金分配" action={totalPrize ? `总奖金 ${money(totalPrize.amount)}` : undefined} /><div className={polish.prizeTable}>{[...full.prizes].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => <div className={`${polish.prizeRow} ${row.isTotal ? polish.prizeTotal : ""}`} key={row.key}><span>{row.labelZh}</span><b>{money(row.amount)}</b></div>)}</div></section> : null}''',
'''        {(seriesDetail?.status ?? full?.status) === "completed" && champion ? <section className={polish.championCard}><div className={polish.championAvatar}><PlayerAvatar player={champion} size="md" /><span>冠</span></div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>{champion.nameZh}</strong><span>{champion.nameEn}</span></div>{final ? <div className={polish.championScore}><small>FINAL</small><b>{final.score1}:{final.score2}</b></div> : null}</section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW" title="赛事概览" /><div className={insight.eventOverviewGrid}><article><span>赛季</span><b>{seriesDetail?.season ?? calendarEvent.season}</b></article><article><span>赛事类型</span><b>{eventDetailTypeLabel(calendarEvent)}</b></article><article><span>比赛时间</span><b>{formatDateRange(seriesDetail?.startDate ?? calendarEvent.startDate, seriesDetail?.endDate ?? calendarEvent.endDate)}</b></article><article><span>举办地</span><b>{seriesDetail?.countryZh ?? calendarEvent.countryZh} · {seriesDetail?.cityZh ?? calendarEvent.cityZh}</b></article>{aggregateEvent?.previousChampionZh ? <article><span>上届冠军{aggregateEvent.previousChampionYear ? ` · ${aggregateEvent.previousChampionYear}` : ""}</span><b>{aggregateEvent.previousChampionZh}</b></article> : null}{(seriesDetail?.venueZh ?? calendarEvent.venueZh) ? <article><span>场馆</span><b>{seriesDetail?.venueZh ?? calendarEvent.venueZh}</b></article> : null}</div></section>
        {prizeEvent?.prizes?.length ? <section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY" title="奖金分配" action={totalPrize ? `总奖金 ${money(totalPrize.amount)}` : undefined} /><div className={polish.prizeTable}>{[...prizeEvent.prizes].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => <div className={`${polish.prizeRow} ${row.isTotal ? polish.prizeTotal : ""}`} key={row.key}><span>{row.labelZh}</span><b>{money(row.amount)}</b></div>)}</div></section> : null}''')

replace_once(path,
'''      {detail.tab === "schedule" ? full ? <div className={styles.roundStack}>
        {full.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {full.publishedMatchCount ?? eventMatches.length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
        {full.rounds.map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}
      </div> : <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlug === detail.slug ? "正在加载该阶段赛程…" : "该阶段详细赛程尚未入库。"}</div></section> : null}''',
'''      {detail.tab === "schedule" ? seriesDetail ? <div className={styles.roundStack}>
        {seriesDetail.stages.map((stage) => {
          const stageEvent = eventBySlug.get(stage.slug);
          return <div className={priority.seriesStage} key={stage.eventId}>
            <div className={priority.seriesStageHeader}><div><small>CHAMPIONSHIP STAGE</small><h2>{stage.stageNameZh}</h2></div><span>{formatDateRange(stage.startDate, stage.endDate)}</span></div>
            {stageEvent ? <>
              {stageEvent.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {stageEvent.publishedMatchCount ?? allMatches(stageEvent).length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
              {stageEvent.rounds.map((round) => <section className={styles.card} key={`${stage.slug}:${round.key}`}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, stageEvent.slug, seriesDetail.slug)} />)}</div></section>)}
            </> : <section className={styles.card}><div className={styles.emptyState}>{stage.dataReady ? `正在加载${stage.stageNameZh}赛程…` : `${stage.stageNameZh}数据准备中。`}</div></section>}
          </div>;
        })}
      </div> : full ? <div className={styles.roundStack}>
        {full.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {full.publishedMatchCount ?? eventMatches.length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
        {full.rounds.map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}
      </div> : <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlug === detail.slug ? "正在加载赛程…" : "该赛事详细赛程尚未入库。"}</div></section> : null}''')

replace_once(path,
'''      {detail.tab === "data" ? full && eventStats ? <>
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT DATA" title="赛事统计" /><div className={styles.statGrid}><article><small>已公布场次</small><strong>{eventStats.matches}</strong><span>{full.schedulePartial ? "部分赛程" : "完整赛程"}</span></article><article><small>参赛球员</small><strong>{eventStats.players}</strong><span>当前签表</span></article><article><small>中国球员</small><strong>{eventStats.china}</strong><span>当前签表</span></article><article><small>已完成</small><strong>{eventStats.completed}</strong><span>数据库统计</span></article></div></section>''',
'''      {detail.tab === "data" ? aggregateEvent && eventStats ? <>
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT DATA" title="赛事统计" /><div className={styles.statGrid}><article><small>已公布场次</small><strong>{eventStats.matches}</strong><span>{seriesDetail ? `${seriesEvents.length}/${seriesDetail.stages.length}阶段已载入` : aggregateEvent.schedulePartial ? "部分赛程" : "完整赛程"}</span></article><article><small>参赛球员</small><strong>{eventStats.players}</strong><span>去重统计</span></article><article><small>中国球员</small><strong>{eventStats.china}</strong><span>去重统计</span></article><article><small>已完成</small><strong>{eventStats.completed}</strong><span>数据库统计</span></article></div></section>''')

# 3. Homepage card selection and labels.
replace_once(path,
'''  const latestCompleted = [...databaseEvents].filter((event) => event.status === "completed" && event.endDate <= today).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const currentOrLatest = activeEventCard ? eventBySlug.get(activeEventCard.slug) : latestCompleted;
  const headlineMatch = activeEventCard ? allMatches(currentOrLatest ?? snapshot.event).find((match) => match.status === "live" || match.status === "session-break") ?? finalOf(currentOrLatest) : finalOf(latestCompleted);
  const headlineEvent = activeEventCard ? currentOrLatest : latestCompleted;''',
'''  const headlineSelection = selectHomepageHeadlineMatch(databaseEvents, players);
  const headlineMatch = headlineSelection?.match;
  const headlineEvent = headlineSelection?.event;''')

replace_once(path,
'<StatusPill status={headlineMatch.status} label={headlineMatch.status === "completed" ? "已结束" : "进行中"} />',
'<StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} />')

replace_once(path,
'按赛季查看完整赛事目录；多阶段赛事合并为一站，进入详情后可切换各阶段赛程。',
'按赛季查看完整赛事目录；多阶段赛事合并为一站，进入详情后赛程按阶段连续展开。')

# 4. Base DB model timestamps + live stale-first prevention.
path = "lib/snooker/database-public.ts"
replace_once(path,
'''  source_updated_at: string | null;
};

type DbFrame''',
'''  source_updated_at: string | null;
  completed_detected_at: string | null;
};

type DbFrame''')
# Both current-season and detail match selects.
p = Path(path)
text = p.read_text()
needle = 'winner_id,note,source_updated_at&event_id='
if text.count(needle) < 2:
    raise SystemExit(f"expected two match select patterns, found {text.count(needle)}")
text = text.replace(needle, 'winner_id,note,source_updated_at,completed_detected_at&event_id=')
p.write_text(text)
replace_once(path,
'''              ...(matchRow.note ? { note: matchRow.note } : {}),
              ...(winner ? { winnerId: winner } : {}),''',
'''              ...(matchRow.note ? { note: matchRow.note } : {}),
              ...(matchRow.source_updated_at ? { sourceUpdatedAt: matchRow.source_updated_at } : {}),
              ...(matchRow.completed_detected_at ? { completedDetectedAt: matchRow.completed_detected_at } : {}),
              ...(winner ? { winnerId: winner } : {}),''')

path = "lib/snooker/database-public-v2.ts"
replace_once(path,
'''  if (cachedView && cachedView.staleUntil > now) {
    if (!inflightView) {
      inflightView = refreshSnookerDatabaseViewV2().finally(() => { inflightView = null; });
    }
    return cachedView.value;
  }''',
'''  if (cachedView && cachedView.staleUntil > now) {
    if (hasLiveMatch(cachedView.value)) {
      if (inflightView) return inflightView;
      inflightView = refreshSnookerDatabaseViewV2().finally(() => { inflightView = null; });
      return inflightView;
    }
    if (!inflightView) {
      inflightView = refreshSnookerDatabaseViewV2().finally(() => { inflightView = null; });
    }
    return cachedView.value;
  }''')

# 5. Visual live indicator and series stage layout.
append_once("app/snooker/snooker-priority.module.css", ".livePill::before", r'''
.livePill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.livePill::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
  animation: snookerLivePulse 1.6s ease-out infinite;
}
@keyframes snookerLivePulse {
  0% { opacity: .45; box-shadow: 0 0 0 0 currentColor; transform: scale(.9); }
  45% { opacity: 1; box-shadow: 0 0 0 5px transparent; transform: scale(1.08); }
  100% { opacity: .6; box-shadow: 0 0 0 0 transparent; transform: scale(.95); }
}
.seriesStage { display: grid; gap: 10px; }
.seriesStage + .seriesStage { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
.seriesStageHeader { display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 0 2px; }
.seriesStageHeader div { display: grid; gap: 3px; }
.seriesStageHeader small { font-size: 9px; letter-spacing: .13em; color: var(--muted); }
.seriesStageHeader h2 { margin: 0; font-size: 18px; color: var(--ink); }
.seriesStageHeader > span { flex: 0 0 auto; font-size: 12px; color: var(--muted); }
@media (max-width: 390px) {
  .seriesStageHeader { align-items: start; flex-direction: column; gap: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .livePill::before { animation: none; opacity: 1; }
}
''')

# 6. Update and add regression tests.
path = "tests/snooker-event-series-season-filter.test.mjs"
replace_once(path,
'test("event UI exposes swipeable seasons and multi-stage drill-down", async () => {',
'test("event UI exposes swipeable seasons and continuous multi-stage schedules", async () => {')
replace_once(path,
'''  assert.match(ui, /seriesDetail\\.stages\\.map/);
  assert.match(ui, /api\\/snooker\\/v1\\/event\\?slug=/);
  assert.match(css, /\\.seasonRail\\{[^}]*overflow-x:auto/s);
  assert.match(css, /\\.stageSelector\\{[^}]*overflow-x:auto/s);''',
'''  assert.match(ui, /seriesDetail\\.stages\\.map/);
  assert.match(ui, /seriesStageHeader/);
  assert.doesNotMatch(ui, /priority\\.stageSelector/);
  assert.match(ui, /for \\(const item of series\\.stages\\.filter/);
  assert.match(ui, /api\\/snooker\\/v1\\/event\\?slug=/);
  assert.match(css, /\\.seasonRail\\{[^}]*overflow-x:auto/s);
  assert.match(css, /\\.seriesStageHeader/);''')

Path("tests/snooker-live-experience.test.mjs").write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("live read-through bypasses caches and preserves authoritative timestamps", async () => {
  const [readThrough, database, dashboard, detail] = await Promise.all([
    read("lib/snooker/live-read-through.ts"),
    read("lib/snooker/database-public.ts"),
    read("app/api/snooker/v1/dashboard/route.ts"),
    read("app/api/snooker/v1/event/route.ts"),
  ]);
  assert.match(readThrough, /cache: "no-store"/);
  assert.match(readThrough, /source_updated_at/);
  assert.match(readThrough, /completed_detected_at/);
  assert.match(readThrough, /interval\|session\[ _-\]\?break\|mid/);
  assert.match(database, /sourceUpdatedAt: matchRow\.source_updated_at/);
  assert.match(database, /completedDetectedAt: matchRow\.completed_detected_at/);
  assert.match(dashboard, /refreshSnookerDatabaseViewLive/);
  assert.match(detail, /refreshSingleEventLive/);
});

test("client live updates are monotonic and homepage selection is deterministic", async () => {
  const [helper, ui, cache] = await Promise.all([
    read("lib/snooker/live-client.ts"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/database-public-v2.ts"),
  ]);
  assert.match(helper, /isIncomingOlder/);
  assert.match(helper, /FINAL_STATUSES\.has\(current\.status\)/);
  assert.match(helper, /scoreTotal\(incoming\) < scoreTotal\(current\)/);
  assert.match(helper, /60 \* 60 \* 1000/);
  assert.match(helper, /roundPriority/);
  assert.match(helper, /chinaPriority/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /mergeEventSnapshotsMonotonic/);
  assert.match(ui, /selectHomepageHeadlineMatch\(databaseEvents, players\)/);
  assert.match(ui, /matchDisplayStatus/);
  assert.match(cache, /if \(hasLiveMatch\(cachedView\.value\)\)/);
  assert.match(cache, /return inflightView/);
});

test("live UI distinguishes interval state and provides reduced-motion animation", async () => {
  const [helper, ui, css] = await Promise.all([
    read("lib/snooker/live-client.ts"),
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-priority.module.css"),
  ]);
  assert.match(helper, /session-break.*局间休息/);
  assert.match(ui, /status === "live" \? priority\.livePill/);
  assert.match(css, /@keyframes snookerLivePulse/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
''')

print("live + series experience patch applied")
