import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function read(path) { return readFile(path, "utf8"); }
async function write(path, value) { await writeFile(path, value.endsWith("\n") ? value : `${value}\n`); }
function once(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`patch target missing: ${label}`);
  return source.replace(from, to);
}
function regexOnce(source, pattern, to, label) {
  if (!pattern.test(source)) throw new Error(`patch regex target missing: ${label}`);
  return source.replace(pattern, to);
}

const uiPath = "app/snooker/snooker-data-center-v2.tsx";
let ui = await read(uiPath);
ui = once(ui,
  'import { eventDetailTypeLabel } from "@/lib/snooker/taxonomy";\n',
  'import { eventDetailTypeLabel } from "@/lib/snooker/taxonomy";\nimport { matchDisplayStatus, mergeEventSnapshotsMonotonic, selectHomepageHeadlineMatch } from "@/lib/snooker/live-client";\n',
  "live client import",
);
ui = once(ui,
  '  | { type: "match"; matchId: string; eventSlug: string }\n',
  '  | { type: "match"; matchId: string; eventSlug: string; seriesSlug?: string }\n',
  "match detail series slug",
);
ui = once(ui,
  'function StatusPill({ status, label }: { status: string; label: string }) {\n  return <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""}`}>{label}</span>;\n}\n',
  'function StatusPill({ status, label }: { status: string; label: string }) {\n  const motion = status === "live" ? priority.liveStatusPill : status === "session-break" ? priority.breakStatusPill : "";\n  return <span className={`${styles.statusPill} ${styles[`status_${status}`] ?? ""} ${motion}`}>{label}</span>;\n}\n',
  "status pill animation",
);
ui = once(ui,
  '<StatusPill status={match.status} label={match.status === "session-break" ? "进行中" : match.statusLabelZh} />',
  '<StatusPill status={match.status} label={matchDisplayStatus(match)} />',
  "schedule break label",
);
ui = once(ui,
  '<b>{score}</b>\n        <div className={`${polish.matchPlayerCell} ${polish.matchPlayerRight}`}>',
  '<b className={match.status === "live" ? priority.liveScoreText : ""}>{score}</b>\n        <div className={`${polish.matchPlayerCell} ${polish.matchPlayerRight}`}>',
  "schedule score pulse",
);
ui = once(ui,
  '  const hasLiveMatch = useMemo(() => databaseEvents.some((event) => allMatches(event).some((match) => match.status === "live" || match.status === "session-break")), [databaseEvents]);\n',
  '  const shouldPollDashboard = useMemo(() => {\n    const now = Date.now();\n    return databaseEvents.some((event) => allMatches(event).some((match) => {\n      if (match.status === "live" || match.status === "session-break") return true;\n      const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;\n      if (match.status === "upcoming" && scheduled && scheduled >= now && scheduled - now <= 6 * 60 * 60 * 1000) return true;\n      const completed = match.completedDetectedAt || match.sourceUpdatedAt;\n      const completedAt = completed ? Date.parse(completed) : 0;\n      return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && now - completedAt <= 60 * 60 * 1000;\n    }));\n  }, [databaseEvents]);\n',
  "poll predicate",
);
ui = regexOnce(ui,
  /  const refresh = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
`  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/snooker/v1/dashboard", { cache: "no-store", headers: { Accept: "application/json" } });
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
            if (changed.length) {
              const updatedById = new Map(merged.flatMap((event) => allMatches(event)).map((match) => [match.id, match.sourceUpdatedAt ?? changedAt]));
              setMatchUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(changed.map((id) => [id, updatedById.get(id) ?? changedAt])) }));
            }
            return merged;
          });
        }
        if (data.eventSeries) setEventSeries(data.eventSeries);
      }
      if (data.sourceHealth) setSourceHealth(data.sourceHealth);
    } catch {
      setSourceHealth(null);
    } finally {
      setRefreshing(false);
    }
  }, []);`,
  "dashboard refresh",
);
ui = once(ui, '    if (!hasLiveMatch) return;\n', '    if (!shouldPollDashboard) return;\n', "poll condition");
ui = once(ui, '  }, [hasLiveMatch, refresh]);\n', '  }, [shouldPollDashboard, refresh]);\n', "poll deps");
ui = regexOnce(ui,
  /  const ensureEventDetail = async \(slug: string\) => \{[\s\S]*?\n  const openPlayer = \(playerId: string\) => \{/,
`  const ensureEventDetail = async (slug: string) => {
    if (loadingEventSlug === slug) return;
    const existing = eventBySlug.get(slug);
    if (existing && !allMatches(existing).some((match) => match.status === "live" || match.status === "session-break")) return;
    setLoadingEventSlug(slug);
    try {
      const response = await fetch(\`/api/snooker/v1/event?slug=\${encodeURIComponent(slug)}\`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as { ok?: boolean; event?: SnookerEvent };
      if (response.ok && data.ok && data.event) {
        setDatabaseEvents((current) => {
          const index = current.findIndex((event) => event.slug === slug);
          if (index < 0) return [...current, data.event!];
          const next = [...current];
          next[index] = mergeEventSnapshotsMonotonic([current[index]], [data.event!])[0] ?? current[index];
          return next;
        });
      }
    } catch {
      // Keep the metadata-only fallback when the request fails.
    } finally {
      setLoadingEventSlug((current) => current === slug ? null : current);
    }
  };
  const openEvent = (slug: string, tab: EventTab = "overview", seriesSlug?: string) => {
    setDetail({ type: "event", slug, ...(seriesSlug ? { seriesSlug } : {}), tab });
    void ensureEventDetail(slug);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openSeries = (series: SnookerEventSeries, tab: EventTab = "overview") => {
    const stage = preferredSeriesStage(series, today);
    if (!stage) return;
    setDetail({ type: "event", slug: stage.slug, seriesSlug: series.slug, tab });
    series.stages.filter((item) => item.dataReady).forEach((item) => void ensureEventDetail(item.slug));
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openMatch = (matchId: string, eventSlug: string, seriesSlug?: string) => {
    setMatchDataTab("match");
    setDetail({ type: "match", matchId, eventSlug, ...(seriesSlug ? { seriesSlug } : {}) });
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openPlayer = (playerId: string) => {`,
  "event detail loading/openers",
);
ui = once(ui,
  '    const statusLabel = match.status === "completed" || match.status === "walkover" ? "已结束" : match.status === "upcoming" ? "待开始" : "进行中";\n',
  '    const statusLabel = matchDisplayStatus(match);\n',
  "match detail status",
);
ui = once(ui,
  '    const updated = new Date(matchUpdatedAt[match.id] ?? selectedEvent.snapshotAt).toLocaleTimeString("zh-CN", {\n',
  '    const updated = new Date(match.sourceUpdatedAt ?? matchUpdatedAt[match.id] ?? selectedEvent.snapshotAt).toLocaleTimeString("zh-CN", {\n',
  "match update timestamp",
);
ui = once(ui,
  '<header className={styles.detailHeader}><button onClick={() => setDetail({ type: "event", slug: selectedEvent.slug, tab: "schedule" })}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>',
  '<header className={styles.detailHeader}><button onClick={() => setDetail({ type: "event", slug: selectedEvent.slug, ...(detail.seriesSlug ? { seriesSlug: detail.seriesSlug } : {}), tab: "schedule" })}>‹</button><strong>比赛详情</strong><span>MATCH</span></header>',
  "match back navigation",
);
ui = once(ui,
  '<div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : `${match.score1 ?? "-"} - ${match.score2 ?? "-"}`}</strong><StatusPill status={match.status} label={statusLabel} /><small>{bestOfLabel(match.bestOf)}</small>{realtime ? <small>{refreshing ? "正在同步…" : `最近更新 ${updated}`}</small> : null}</div>',
  '<div className={styles.bigScore}><strong>{match.status === "walkover" ? "W - O" : <><span>{match.score1 ?? "-"}</span> <i className={match.status === "live" ? priority.liveSeparator : ""}>-</i> <span>{match.score2 ?? "-"}</span></>}</strong><StatusPill status={match.status} label={statusLabel} /><small>{bestOfLabel(match.bestOf)}</small>{realtime ? <small>{refreshing ? "正在同步…" : `最近更新 ${updated}`}</small> : null}</div>',
  "match detail live separator",
);

const eventBlock = `  if (detail?.type === "event") {
    const seriesDetail = detail.seriesSlug ? seriesBySlug.get(detail.seriesSlug) : undefined;
    const selectedSeriesStage = seriesDetail?.stages.find((stage) => stage.slug === detail.slug);
    const calendarEvent = snapshot.calendar.find((item) => item.slug === detail.slug) ?? (seriesDetail && selectedSeriesStage ? {
      id: selectedSeriesStage.eventId,
      slug: selectedSeriesStage.slug,
      nameZh: seriesDetail.nameZh,
      nameEn: seriesDetail.nameEn,
      season: seriesDetail.season,
      typeZh: seriesDetail.typeZh,
      eventType: seriesDetail.eventType,
      eventStage: seriesDetail.eventStage,
      rankingStatus: seriesDetail.rankingStatus,
      status: selectedSeriesStage.status,
      statusLabelZh: selectedSeriesStage.statusLabelZh,
      startDate: selectedSeriesStage.startDate,
      endDate: selectedSeriesStage.endDate,
      cityZh: seriesDetail.cityZh,
      countryZh: seriesDetail.countryZh,
      ...(seriesDetail.venueZh ? { venueZh: seriesDetail.venueZh } : {}),
      dataReady: selectedSeriesStage.dataReady,
    } satisfies SnookerCalendarEvent : featuredEventCard);
    const full = eventBySlug.get(detail.slug);
    if (!calendarEvent) return null;
    const seriesEvents = seriesDetail
      ? seriesDetail.stages.map((stage) => eventBySlug.get(stage.slug)).filter((event): event is SnookerEvent => Boolean(event))
      : [];
    const aggregateEvents = seriesEvents.length ? seriesEvents : full ? [full] : [];
    const eventMatches = aggregateEvents.flatMap((event) => allMatches(event));
    const finalEvent = [...aggregateEvents].reverse().find((event) => finalOf(event));
    const final = finalEvent ? finalOf(finalEvent) : undefined;
    const champion = final?.winnerId ? players.get(final.winnerId) : undefined;
    const eventStats = aggregateEvents.length ? {
      matches: eventMatches.length,
      players: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id])).size,
      china: new Set(eventMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter((id) => isChina(players.get(id)))).size,
      completed: eventMatches.filter((match) => match.status === "completed" || match.status === "walkover").length,
      partial: aggregateEvents.some((event) => event.schedulePartial),
    } : null;
    const chinaStats = aggregateEvents.length ? snapshot.players.filter(isChina).map((player) => {
      const parts = aggregateEvents.map((event) => currentEventStats(player.id, event)).filter((stats): stats is PlayerEventStats => Boolean(stats));
      if (!parts.length) return null;
      return { player, stats: { wins: parts.reduce((sum, stats) => sum + stats.wins, 0), losses: parts.reduce((sum, stats) => sum + stats.losses, 0), bestRoundLabelZh: parts.at(-1)?.bestRoundLabelZh ?? "—" } };
    }).filter((item): item is { player: SnookerPlayer; stats: { wins: number; losses: number; bestRoundLabelZh: string } } => Boolean(item)) : [];
    const prizeEvent = aggregateEvents.find((event) => event.prizes?.length) ?? full;
    const totalPrize = prizeEvent?.prizes?.find((row) => row.isTotal);
    const overviewStart = seriesDetail?.startDate ?? calendarEvent.startDate;
    const overviewEnd = seriesDetail?.endDate ?? calendarEvent.endDate;
    const overviewCountry = seriesDetail?.countryZh ?? calendarEvent.countryZh;
    const overviewCity = seriesDetail?.cityZh ?? calendarEvent.cityZh;
    const overviewVenue = seriesDetail?.venueZh ?? calendarEvent.venueZh;

    return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>
      <header className={\`${styles.detailHeader} ${priority.eventNameHeader}\`}><button onClick={() => setDetail(null)}>‹</button><strong>{seriesDetail?.nameZh ?? calendarEvent.nameZh}</strong><span>{calendarEvent.season}</span></header>
      <section className={styles.eventDetailHero}><div className={styles.eventDetailTop}><StatusPill status={seriesDetail?.status ?? calendarEvent.status} label={seriesDetail?.statusLabelZh ?? calendarEvent.statusLabelZh} /><span>{eventDetailTypeLabel(calendarEvent)}</span></div><h1>{seriesDetail?.nameZh ?? calendarEvent.nameZh}</h1><p>{seriesDetail?.nameEn ?? calendarEvent.nameEn}</p><div className={styles.eventDetailMeta}><span>{formatDateRange(overviewStart, overviewEnd)}</span><span>{overviewCountry} · {overviewCity}</span></div></section>
      <div className={styles.eventTabs}><button className={detail.tab === "overview" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "overview" })}>赛事介绍</button><button className={detail.tab === "schedule" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "schedule" })}>赛程</button><button className={detail.tab === "data" ? styles.tabActive : ""} onClick={() => setDetail({ ...detail, tab: "data" })}>赛事数据</button></div>

      {detail.tab === "overview" ? <>
        {finalEvent?.status === "completed" && champion ? <section className={polish.championCard}><div className={polish.championAvatar}><PlayerAvatar player={champion} size="md" /><span>冠</span></div><div className={polish.championText}><small>CHAMPION · 本届冠军</small><strong>{champion.nameZh}</strong><span>{champion.nameEn}</span></div>{final ? <div className={polish.championScore}><small>FINAL</small><b>{final.score1}:{final.score2}</b></div> : null}</section> : null}
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT OVERVIEW" title="赛事概览" /><div className={insight.eventOverviewGrid}><article><span>赛季</span><b>{calendarEvent.season}</b></article><article><span>赛事类型</span><b>{eventDetailTypeLabel(calendarEvent)}</b></article><article><span>比赛时间</span><b>{formatDateRange(overviewStart, overviewEnd)}</b></article><article><span>举办地</span><b>{overviewCountry} · {overviewCity}</b></article>{prizeEvent?.previousChampionZh ? <article><span>上届冠军{prizeEvent.previousChampionYear ? \` · \${prizeEvent.previousChampionYear}\` : ""}</span><b>{prizeEvent.previousChampionZh}</b></article> : null}{overviewVenue ? <article><span>场馆</span><b>{overviewVenue}</b></article> : null}</div></section>
        {prizeEvent?.prizes?.length ? <section className={styles.card}><SectionHeader eyebrow="PRIZE MONEY" title="奖金分配" action={totalPrize ? \`总奖金 \${money(totalPrize.amount)}\` : undefined} /><div className={polish.prizeTable}>{[...prizeEvent.prizes].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => <div className={\`${polish.prizeRow} ${row.isTotal ? polish.prizeTotal : ""}\`} key={row.key}><span>{row.labelZh}</span><b>{money(row.amount)}</b></div>)}</div></section> : null}
      </> : null}

      {detail.tab === "schedule" ? seriesDetail && seriesDetail.stages.length > 1 ? <div className={priority.seriesSchedule}>
        {seriesDetail.stages.map((stage) => {
          const stageEvent = eventBySlug.get(stage.slug);
          return <section className={priority.seriesStageSection} key={stage.eventId}>
            <div className={priority.seriesStageHeading}><div><small>CHAMPIONSHIP LEAGUE STAGE</small><h2>{stage.stageNameZh}</h2></div><span>{formatDateRange(stage.startDate, stage.endDate)}</span></div>
            {stageEvent ? <div className={styles.roundStack}>
              {stageEvent.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {stageEvent.publishedMatchCount ?? allMatches(stageEvent).length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
              {stageEvent.rounds.map((round) => <section className={styles.card} key={\`${stage.eventId}-${round.key}\`}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, stageEvent.slug, seriesDetail.slug)} />)}</div></section>)}
            </div> : <div className={priority.seriesStageEmpty}>{stage.dataReady ? "正在加载该阶段赛程…" : "该阶段赛程尚未发布。"}</div>}
          </section>;
        })}
      </div> : full ? <div className={styles.roundStack}>
        {full.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {full.publishedMatchCount ?? allMatches(full).length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
        {full.rounds.map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}
      </div> : <section className={styles.card}><div className={styles.emptyState}>{loadingEventSlug === detail.slug ? "正在加载赛程…" : "详细赛程尚未入库。"}</div></section> : null}

      {detail.tab === "data" ? eventStats ? <>
        <section className={styles.card}><SectionHeader eyebrow="TOURNAMENT DATA" title="赛事统计" /><div className={styles.statGrid}><article><small>已公布场次</small><strong>{eventStats.matches}</strong><span>{eventStats.partial ? "部分赛程" : "已入库赛程"}</span></article><article><small>参赛球员</small><strong>{eventStats.players}</strong><span>合并去重</span></article><article><small>中国球员</small><strong>{eventStats.china}</strong><span>合并去重</span></article><article><small>已完成</small><strong>{eventStats.completed}</strong><span>全部阶段</span></article></div></section>
        <section className={styles.card}><SectionHeader eyebrow="CHINA WATCH" title="中国军团本届成绩" /><div className={styles.chinaResultList}>{chinaStats.map(({ player, stats }) => <button key={player.id} onClick={() => openPlayer(player.id)}><PlayerAvatar player={player} size="sm" /><span><b>{player.nameZh}</b><small>世界第 {player.currentRank ?? "—"}</small></span><strong>{stats.bestRoundLabelZh}</strong><em>{stats.wins}胜{stats.losses}负</em></button>)}</div></section>
      </> : <section className={styles.card}><div className={styles.emptyState}>赛事数据将在签表与比赛数据入库后显示。</div></section> : null}
    </div></main>;
  }
`;
ui = regexOnce(ui, /  if \(detail\?\.type === "event"\) \{[\s\S]*?\n  \}\n\n  const featuredDetail/, `${eventBlock}\n  const featuredDetail`, "series detail block");
ui = once(ui,
  '  const latestCompleted = [...databaseEvents].filter((event) => event.status === "completed" && event.endDate <= today).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];\n  const currentOrLatest = activeEventCard ? eventBySlug.get(activeEventCard.slug) : latestCompleted;\n  const headlineMatch = activeEventCard ? allMatches(currentOrLatest ?? snapshot.event).find((match) => match.status === "live" || match.status === "session-break") ?? finalOf(currentOrLatest) : finalOf(latestCompleted);\n  const headlineEvent = activeEventCard ? currentOrLatest : latestCompleted;\n',
  '  const headlineSelection = selectHomepageHeadlineMatch(databaseEvents, players);\n  const headlineMatch = headlineSelection?.match;\n  const headlineEvent = headlineSelection?.event;\n',
  "headline selector",
);
ui = once(ui,
  '<StatusPill status={headlineMatch.status} label={headlineMatch.status === "completed" ? "已结束" : "进行中"} />',
  '<StatusPill status={headlineMatch.status} label={matchDisplayStatus(headlineMatch)} />',
  "headline status",
);
ui = once(ui,
  '<div><strong>{headlineMatch.score1 ?? "-"} <i>:</i> {headlineMatch.score2 ?? "-"}</strong><small>{bestOfLabel(headlineMatch.bestOf)}</small></div>',
  '<div><strong>{headlineMatch.score1 ?? "-"} <i className={headlineMatch.status === "live" ? priority.liveSeparator : ""}>:</i> {headlineMatch.score2 ?? "-"}</strong><small>{bestOfLabel(headlineMatch.bestOf)}</small></div>',
  "headline score separator",
);
ui = once(ui,
  '<p>按赛季查看完整赛事目录；多阶段赛事合并为一站，进入详情后可切换各阶段赛程。</p>',
  '<p>按赛季查看完整赛事目录；多阶段赛事合并为一站，进入赛程后按阶段连续展示。</p>',
  "matches intro",
);
await write(uiPath, ui);

const dbPath = "lib/snooker/database-public.ts";
let db = await read(dbPath);
db = once(db,
  '  source_updated_at: string | null;\n};\n\ntype DbFrame',
  '  source_updated_at: string | null;\n  source_status?: string | null;\n  source_status_meta?: string | null;\n  completed_detected_at?: string | null;\n};\n\ntype DbFrame',
  "db match source fields",
);
db = once(db,
  '  if (status === "session-break") return "进行中 · 阶段休息";\n',
  '  if (status === "session-break") return "局间休息";\n',
  "db break label",
);
db = once(db,
  '              ...(winner ? { winnerId: winner } : {}),\n',
  '              ...(winner ? { winnerId: winner } : {}),\n              ...(matchRow.source_updated_at ? { sourceUpdatedAt: matchRow.source_updated_at } : {}),\n              ...(matchRow.completed_detected_at ? { completedDetectedAt: matchRow.completed_detected_at } : {}),\n',
  "match timestamps mapping",
);
db = db.replaceAll('winner_id,note,source_updated_at&event_id=', 'winner_id,note,source_updated_at,source_status,source_status_meta,completed_detected_at&event_id=');
await write(dbPath, db);

const cssPath = "app/snooker/snooker-priority.module.css";
let css = await read(cssPath);
css += `

.liveStatusPill{position:relative;padding-left:17px!important}
.liveStatusPill::before{content:"";position:absolute;left:7px;top:50%;width:6px;height:6px;border-radius:50%;background:currentColor;transform:translateY(-50%);animation:snookerLivePulse 1.6s ease-in-out infinite}
.breakStatusPill{position:relative;padding-left:17px!important}
.breakStatusPill::before{content:"";position:absolute;left:7px;top:50%;width:6px;height:6px;border-radius:50%;background:currentColor;transform:translateY(-50%);opacity:.58}
.liveSeparator{display:inline-block;font-style:normal;animation:snookerScorePulse 1.6s ease-in-out infinite}
.liveScoreText{animation:snookerScorePulse 1.9s ease-in-out infinite}
@keyframes snookerLivePulse{0%,100%{opacity:.45;box-shadow:0 0 0 0 currentColor}50%{opacity:1;box-shadow:0 0 0 4px transparent}}
@keyframes snookerScorePulse{0%,100%{opacity:.45;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}
.seriesSchedule{display:flex;flex-direction:column;gap:18px}
.seriesStageSection{display:flex;flex-direction:column;gap:10px}
.seriesStageHeading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:4px 4px 0}
.seriesStageHeading small{display:block;color:var(--accent);font-size:7px;font-weight:850;letter-spacing:.12em}
.seriesStageHeading h2{margin:4px 0 0;font-size:18px;letter-spacing:-.03em}
.seriesStageHeading>span{flex:none;color:var(--muted);font-size:8px;font-weight:750}
.seriesStageEmpty{padding:22px 14px;border:1px dashed var(--line);border-radius:16px;background:#fff;color:var(--muted);font-size:9px;text-align:center}
@media (prefers-reduced-motion:reduce){.liveStatusPill::before,.liveSeparator,.liveScoreText{animation:none!important}.liveStatusPill::before{opacity:1}}
`;
await write(cssPath, css);

const migrationPath = "supabase/migrations/20260825191000_harden_live_match_status_transitions.sql";
const migration = `create or replace function public.snooker_guard_live_match_state()
returns trigger
language plpgsql
set search_path = 'public', 'pg_catalog'
as $$
declare
  v_meta text := lower(coalesce(new.source_status_meta, ''));
  v_source text := lower(coalesce(new.source_status, ''));
  v_old_total integer := 0;
  v_new_total integer := 0;
begin
  if v_source = 'live' and v_meta ~ '(interval|session[ _-]?break|mid[ _-]?session|break|pause)' then
    new.status := 'session-break';
  elsif v_source = 'live' and new.status not in ('completed', 'walkover') then
    new.status := 'live';
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('completed', 'walkover') and new.status not in ('completed', 'walkover') then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.completed_detected_at := coalesce(old.completed_detected_at, new.completed_detected_at);
    elsif old.status in ('live', 'session-break') and new.status = 'upcoming' then
      new.status := old.status;
    end if;

    v_old_total := coalesce(old.score1, 0) + coalesce(old.score2, 0);
    v_new_total := coalesce(new.score1, 0) + coalesce(new.score2, 0);
    if old.status in ('live', 'session-break') and new.status in ('live', 'session-break') and v_new_total < v_old_total then
      new.score1 := old.score1;
      new.score2 := old.score2;
    end if;

    if old.source_updated_at is not null and new.source_updated_at is not null and new.source_updated_at < old.source_updated_at then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.source_status := old.source_status;
      new.source_status_meta := old.source_status_meta;
      new.source_updated_at := old.source_updated_at;
      new.completed_detected_at := old.completed_detected_at;
    end if;
  end if;

  if new.status = 'completed' and new.completed_detected_at is null then
    new.completed_detected_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists snooker_guard_live_match_state_trigger on public.snooker_matches;
create trigger snooker_guard_live_match_state_trigger
before insert or update of status, score1, score2, winner_id, source_status, source_status_meta, source_updated_at
on public.snooker_matches
for each row execute function public.snooker_guard_live_match_state();
`;
await write(migrationPath, migration);

const checksumPath = "supabase/migration-checksums.json";
const manifest = JSON.parse(await read(checksumPath));
const normalizedMigration = migration.endsWith("\n") ? migration : `${migration}\n`;
const md5 = createHash("md5").update(normalizedMigration).digest("hex");
if (!manifest.migrations.some((item) => item.version === "20260825191000")) {
  manifest.migrations.push({ version: "20260825191000", name: "harden_live_match_status_transitions", md5 });
}
await write(checksumPath, `${JSON.stringify(manifest, null, 2)}\n`);

const testPath = "tests/snooker-live-series-experience.test.mjs";
const tests = `import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ui = await readFile(new URL("../app/snooker/snooker-data-center-v2.tsx", import.meta.url), "utf8");
const liveClient = await readFile(new URL("../lib/snooker/live-client.ts", import.meta.url), "utf8");
const liveRead = await readFile(new URL("../lib/snooker/live-read-through.ts", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../app/api/snooker/v1/dashboard/route.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260825191000_harden_live_match_status_transitions.sql", import.meta.url), "utf8");

test("live dashboard bypasses stale caches and client merge is monotonic", () => {
  assert.match(liveRead, /cache: "no-store"/);
  assert.match(dashboard, /refreshSnookerDatabaseViewLive/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /mergeEventSnapshotsMonotonic/);
  assert.match(liveClient, /sourceUpdatedAt/);
  assert.match(liveClient, /scoreTotal\(incoming\) < scoreTotal\(current\)/);
  assert.match(liveClient, /FINAL_STATUSES\.has\(current\.status\)/);
});

test("session breaks remain active and are shown as break state", () => {
  assert.match(liveRead, /session-break/);
  assert.match(liveRead, /interval\|session/);
  assert.match(ui, /matchDisplayStatus\(match\)/);
  assert.match(migration, /new\.status := 'session-break'/);
  assert.match(migration, /old\.status in \('live', 'session-break'\) and new\.status = 'upcoming'/);
});

test("homepage headline selection is deterministic and retains recent results", () => {
  assert.match(liveClient, /selectHomepageHeadlineMatch/);
  assert.match(liveClient, /60 \* 60 \* 1000/);
  assert.match(liveClient, /roundPriority/);
  assert.match(liveClient, /chinaPriority/);
  assert.match(ui, /selectHomepageHeadlineMatch\(databaseEvents, players\)/);
});

test("event series presents a continuous schedule without a stage selector", () => {
  assert.doesNotMatch(ui, /className=\{priority\.stageSelector\}/);
  assert.match(ui, /seriesDetail\.stages\.map/);
  assert.match(ui, /seriesStageSection/);
  assert.match(ui, /overviewStart = seriesDetail\?\.startDate/);
  assert.match(ui, /合并去重/);
});

test("live visual treatment respects reduced motion", async () => {
  const css = await readFile(new URL("../app/snooker/snooker-priority.module.css", import.meta.url), "utf8");
  assert.match(css, /liveStatusPill/);
  assert.match(css, /liveSeparator/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
`;
await write(testPath, tests);

console.log("Applied live score, break-state, homepage headline and event-series experience patch.");
