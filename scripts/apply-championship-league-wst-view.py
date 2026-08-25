from pathlib import Path

path = Path("lib/snooker/database-public.ts")
source = path.read_text()

anchor = "function buildEventSeries(seriesRows: DbEventSeries[], eventRows: DbSeriesEvent[], loadedAt: string) {"
helper = r'''function isChampionshipLeagueSeries(series: DbEventSeries, rows: DbSeriesEvent[]) {
  return /championship league/i.test(series.name_en)
    || rows.some((row) => /championship league/i.test(row.name_en));
}

function championshipLeagueStandaloneSeries(series: DbEventSeries, row: DbSeriesEvent, loadedAt: string): SnookerEventSeries {
  const startDate = row.start_date || loadedAt.slice(0, 10);
  const endDate = row.end_date || startDate;
  const status = statusFromDates(startDate, endDate);
  const taxonomy = normalizeEventTaxonomy(row.event_type, row.event_stage, row.ranking_status, row.type_zh);
  return {
    id: `db-series-event-${row.id}`,
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    season: series.season,
    startDate,
    endDate,
    status,
    statusLabelZh: statusLabel(status),
    typeZh: compactEventTypeLabel(taxonomy),
    eventType: taxonomy.eventType,
    eventStage: taxonomy.eventStage,
    rankingStatus: taxonomy.rankingStatus,
    countryZh: row.country_zh || "待定",
    cityZh: row.city_zh || "待定",
    ...(row.venue_zh ? { venueZh: row.venue_zh } : {}),
    sourceName: series.source_name || "Snooker DB",
    stages: [{
      eventId: `db-event-${row.id}`,
      slug: row.slug,
      nameEn: row.name_en,
      nameZh: row.name_zh,
      stageNameEn: row.stage_name_en,
      stageNameZh: row.stage_name_zh,
      stageOrder: 1,
      startDate,
      endDate,
      status,
      statusLabelZh: statusLabel(status),
      dataReady: row.data_ready,
    }],
  };
}

'''
if helper.strip() not in source:
    if anchor not in source:
        raise SystemExit("buildEventSeries anchor not found")
    source = source.replace(anchor, helper + anchor, 1)

old = '''    const representative = rows[0];
    if (!representative) return [];
    const startDate = series.start_date || representative.start_date || loadedAt.slice(0, 10);'''
new = '''    const representative = rows[0];
    if (!representative) return [];
    if (isChampionshipLeagueSeries(series, rows)) {
      return rows.map((row) => championshipLeagueStandaloneSeries(series, row, loadedAt));
    }
    const startDate = series.start_date || representative.start_date || loadedAt.slice(0, 10);'''
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit("series split target not found")

old = '''    let roundRows: DbRound[] = [];
    let matchRows: DbMatch[] = [];
    let frameRows: DbFrame[] = [];

    if (dataReadyIds.length) {'''
new = '''    let roundRows: DbRound[] = [];
    let matchRows: DbMatch[] = [];
    let frameRows: DbFrame[] = [];
    const detailEventIds = focusedEventIds(eventRows, loadedAt.slice(0, 10));

    if (dataReadyIds.length) {'''
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit("detailEventIds declaration target not found")

old = '''      const detailEventIds = focusedEventIds(eventRows, loadedAt.slice(0, 10));
      const matchIds = matchRows.filter((row) => detailEventIds.has(row.event_id)).map((row) => row.id);'''
new = '''      const matchIds = matchRows.filter((row) => detailEventIds.has(row.event_id)).map((row) => row.id);'''
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit("detailEventIds inner target not found")

old = '''    const eventDetails = buildEventDetails(eventRows, roundRows, matchRows, frameRows, uuidToCanonical, loadedAt);
    const eventSeries = buildEventSeries(seriesRows, seriesEventRows, loadedAt)'''
new = '''    const builtEventDetails = buildEventDetails(eventRows, roundRows, matchRows, frameRows, uuidToCanonical, loadedAt);
    const eventDetails = builtEventDetails.filter((event) => {
      const eventUuid = event.id.startsWith("db-event-") ? event.id.slice("db-event-".length) : null;
      const historicalChampionshipLeague = /championship league/i.test(event.nameEn)
        && event.status === "completed"
        && eventUuid
        && !detailEventIds.has(eventUuid);
      return !historicalChampionshipLeague;
    });
    const eventSeries = buildEventSeries(seriesRows, seriesEventRows, loadedAt)'''
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit("eventDetails on-demand target not found")

path.write_text(source)

test = Path("tests/snooker-championship-league-wst-identity.test.mjs")
test.write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\nconst root = new URL("../", import.meta.url);\nconst read = (path) => readFile(new URL(path, root), "utf8");\n\ntest("Championship League keeps each WST source event as an individual user-facing stop", async () => {\n  const database = await read("lib/snooker/database-public.ts");\n  assert.match(database, /function isChampionshipLeagueSeries/);\n  assert.match(database, /rows\\.map\\(\\(row\\) => championshipLeagueStandaloneSeries\\(series, row, loadedAt\\)\\)/);\n  assert.match(database, /id: `db-series-event-\\$\\{row\\.id\\}`/);\n  assert.match(database, /stages: \\[\\{/);\n});\n\ntest("historical Championship League stops hydrate full match and frame data on demand", async () => {\n  const database = await read("lib/snooker/database-public.ts");\n  assert.match(database, /historicalChampionshipLeague/);\n  assert.match(database, /!detailEventIds\\.has\\(eventUuid\\)/);\n  assert.match(database, /export async function loadSnookerEventDetail/);\n  assert.match(database, /snooker_matches\\?select=id,event_id,round_id,source_match_id,match_no,player1_id,player2_id,score1,score2/);\n  assert.match(database, /snooker_frames\\?select=id,match_id,frame_no,score1,score2,break1,break2,note/);\n});\n''')

print("Applied Championship League WST stop presentation and on-demand frame hydration.")
