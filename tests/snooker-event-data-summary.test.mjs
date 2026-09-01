import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("event data follows the approved summary order and suppresses league final-four cards", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  const dataStart = ui.indexOf('{detail.tab === "data"');
  const dataEnd = ui.indexOf("const featuredDetail", dataStart);
  const dataPanel = ui.slice(dataStart, dataEnd);

  const finalFour = dataPanel.indexOf('title="本届四强"');
  const statistics = dataPanel.indexOf('title="赛事统计"');
  const highlights = dataPanel.indexOf('title="赛事亮点"');
  const china = dataPanel.indexOf('title="中国球员战绩"');
  assert.ok(finalFour >= 0 && finalFour < statistics && statistics < highlights && highlights < china);
  for (const label of ["最高单杆", "胜率最高", "147次数", "破百总数"]) assert.match(dataPanel, new RegExp(label));
  assert.match(ui, /championship\[-_ \]league\|冠军联赛/);
});

test("qualifiers and tour-selection events expose only overview, statistics and highlights", async () => {
  const [ui, taxonomy, core] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/taxonomy.ts"),
    read("lib/snooker/event-detail-core.ts"),
  ]);
  assert.match(taxonomy, /export function isQualificationEvent/);
  assert.match(taxonomy, /eventStage === "qualifier"/);
  assert.match(taxonomy, /eventType === "pro_qualifier"/);
  assert.match(taxonomy, /typeZh === "资格赛"/);
  assert.match(taxonomy, /typeZh === "选拔赛"/);
  assert.match(ui, /const qualificationEvent = isQualificationEvent\(calendarEvent\)/);
  assert.match(ui, /!qualificationEvent && prizeEvent\?\.prizes\?\.length/);
  assert.match(ui, /!qualificationEvent \? <section className=\{styles\.card\}><SectionHeader eyebrow="CHINA WATCH"/);
  assert.match(core, /buildPlayerStats\(rounds, breakRows, canonical, !qualificationEvent\)/);
  assert.match(core, /qualificationEvent[\s\S]*Promise\.resolve\(\[\] as DbPrize\[\]\)/);
});

test("Chinese player results use round semantics instead of participant counts", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.doesNotMatch(ui, /function roundFieldSize/);
  assert.match(ui, /roundIsSemifinal\(key, label\)[\s\S]*label: "四强", priority: 4/);
  assert.match(ui, /quarter\[-_ \]\?final\|1\\\/4\|四分之一[\s\S]*label: "八强", priority: 8/);
  assert.match(ui, /wild\[-_ \]\?card\|外卡[\s\S]*label: "外卡轮", priority: 512/);
  assert.match(ui, /function eventPlayerBestResult\(event: SnookerEvent, playerId: string\)[\s\S]*allMatches\(event\)[\s\S]*match\.player1Id === playerId \|\| match\.player2Id === playerId/);
  assert.match(ui, /eventPlayerBestResult\(event, stats\.playerId\)\.label/);
  assert.match(ui, /eventResultPriority\(full, a\.stats\) - eventResultPriority\(full, b\.stats\)/);
  assert.doesNotMatch(ui, /eventRoundResult\(stats\.lastRoundKey, stats\.lastRoundLabelZh\)/);
});

test("missing prize distributions stay hidden instead of showing a misleading placeholder", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /!qualificationEvent && prizeEvent\?\.prizes\?\.length \? <section/);
  assert.doesNotMatch(ui, /showPrizePlaceholder/);
  assert.doesNotMatch(ui, /奖金信息待官方公布/);
});

test("event aggregation uses final results and event-scoped break rows", async () => {
  const [core, foundation] = await Promise.all([
    read("lib/snooker/event-detail-core.ts"),
    read("lib/snooker/foundation.ts"),
  ]);
  assert.match(core, /snooker_breaks\?select=match_id,player_id,break_value/);
  assert.match(core, /isChampion = true/);
  assert.match(core, /roundProgressScore/);
  assert.match(foundation, /roundProgressScore/);
});

test("current-season metadata migration resolves stable slugs and official prize sources", async () => {
  const migration = await read("supabase/migrations/20260901061422_backfill_2026_27_event_metadata.sql");
  assert.match(migration, /join public\.snooker_players as player on player\.slug = champions\.player_slug/);
  assert.match(migration, /'wuhan-open-2026', 'xiao-guodong', 2025/);
  assert.match(migration, /'british-open-2026'/);
  assert.match(migration, /'world-championship-2027'/);
  assert.match(migration, /https:\/\/www\.wst\.tv\//);
  assert.match(migration, /on conflict \(event_id, prize_key\) do update/);
});
