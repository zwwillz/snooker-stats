import { readFile, writeFile } from "node:fs/promises";

async function read(path) { return readFile(path, "utf8"); }
async function write(path, value) { await writeFile(path, value.endsWith("\n") ? value : `${value}\n`); }
function once(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`patch target missing: ${label}`);
  return source.replace(from, to);
}

const uiPath = "app/snooker/snooker-data-center-v2.tsx";
let ui = await read(uiPath);

ui = once(ui,
`function allMatches(event: SnookerEvent) {
  return event.rounds.flatMap((round) => round.matches);
}

function finalOf(event?: SnookerEvent) {`,
`function allMatches(event: SnookerEvent) {
  return event.rounds.flatMap((round) => round.matches);
}

function scheduledTime(match: SnookerMatch) {
  const parsed = match.scheduledAt ? Date.parse(match.scheduledAt) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function orderedScheduleRounds(event: SnookerEvent) {
  const completedEvent = event.status === "completed" || allMatches(event).every((match) => match.status === "completed" || match.status === "walkover");
  const rounds = event.rounds.map((round) => ({
    ...round,
    matches: [...round.matches].sort((a, b) => {
      const aTime = scheduledTime(a);
      const bTime = scheduledTime(b);
      if (aTime !== null && bTime !== null && aTime !== bTime) return completedEvent ? bTime - aTime : aTime - bTime;
      if (aTime !== null && bTime === null) return -1;
      if (aTime === null && bTime !== null) return 1;
      return a.matchNo - b.matchNo || a.id.localeCompare(b.id);
    }),
  }));

  return rounds.sort((a, b) => {
    if (completedEvent) {
      if (a.key === "final" && b.key !== "final") return -1;
      if (b.key === "final" && a.key !== "final") return 1;
      const aTime = Math.max(...a.matches.map((match) => scheduledTime(match) ?? Number.NEGATIVE_INFINITY));
      const bTime = Math.max(...b.matches.map((match) => scheduledTime(match) ?? Number.NEGATIVE_INFINITY));
      if (aTime !== bTime) return bTime - aTime;
    } else {
      const aTimes = a.matches.map(scheduledTime).filter((value): value is number => value !== null);
      const bTimes = b.matches.map(scheduledTime).filter((value): value is number => value !== null);
      const aTime = aTimes.length ? Math.min(...aTimes) : Number.POSITIVE_INFINITY;
      const bTime = bTimes.length ? Math.min(...bTimes) : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
    }
    return a.labelZh.localeCompare(b.labelZh, "zh-CN");
  });
}

function finalOf(event?: SnookerEvent) {`,
"schedule ordering helpers",
);

ui = once(ui,
`          return <section className={priority.seriesStageSection} key={stage.eventId}>
            <div className={priority.seriesStageHeading}><div><small>CHAMPIONSHIP LEAGUE STAGE</small><h2>{stage.stageNameZh}</h2></div><span>{formatDateRange(stage.startDate, stage.endDate)}</span></div>
            {stageEvent ? <div className={styles.roundStack}>
              {stageEvent.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {stageEvent.publishedMatchCount ?? allMatches(stageEvent).length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
              {stageEvent.rounds.map((round) => <section className={styles.card} key={\`${stage.eventId}-${round.key}\`}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, stageEvent.slug, seriesDetail.slug)} />)}</div></section>)}
            </div> : <div className={priority.seriesStageEmpty}>{stage.dataReady ? "正在加载该阶段赛程…" : "该阶段赛程尚未发布。"}</div>}
          </section>;`,
`          return <section className={priority.seriesStageSection} key={stage.eventId}>
            {stageEvent ? <div className={styles.roundStack}>
              {stageEvent.schedulePartial ? <div className={insight.partialNotice}><b>部分赛程</b><span className={polish.partialText}>官方当前已公布 {stageEvent.publishedMatchCount ?? allMatches(stageEvent).length} 场场地赛程，后续签表将随官方发布自动补齐。</span></div> : null}
              {orderedScheduleRounds(stageEvent).map((round) => <section className={styles.card} key={\`${stage.eventId}-${round.key}\`}><SectionHeader title={\`${stage.stageNameZh} · ${round.labelZh}\`} action={\`${formatDateRange(stage.startDate, stage.endDate)} · ${bestOfLabel(round.bestOf)}\`} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, stageEvent.slug, seriesDetail.slug)} />)}</div></section>)}
            </div> : <div className={priority.seriesStageEmpty}>{stage.dataReady ? "正在加载该阶段赛程…" : "该阶段赛程尚未发布。"}</div>}
          </section>;`,
"merge stage heading into round cards",
);

ui = once(ui,
`        {full.rounds.map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}`,
`        {orderedScheduleRounds(full).map((round) => <section className={styles.card} key={round.key}><SectionHeader title={round.labelZh} action={bestOfLabel(round.bestOf)} /><div className={styles.matchList}>{round.matches.map((match) => <MatchListRow key={match.id} match={match} players={players} onOpen={() => openMatch(match.id, full.slug)} />)}</div></section>)}`,
"completed event schedule ordering",
);

await write(uiPath, ui);

const liveClientPath = "lib/snooker/live-client.ts";
let liveClient = await read(liveClientPath);
liveClient = once(liveClient,
`export function mergeEventSnapshotsMonotonic(currentEvents: SnookerEvent[], incomingEvents: SnookerEvent[]) {
  const currentMatchById = new Map(currentEvents.flatMap((event) => event.rounds.flatMap((round) => round.matches)).map((match) => [match.id, match]));
  return incomingEvents.map((event) => ({
    ...event,
    rounds: event.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const current = currentMatchById.get(match.id);
        return current ? mergeLiveMatchMonotonic(current, match) : match;
      }),
    })),
  }));
}`,
`export function mergeEventSnapshotsMonotonic(currentEvents: SnookerEvent[], incomingEvents: SnookerEvent[]) {
  const currentMatchById = new Map(currentEvents.flatMap((event) => event.rounds.flatMap((round) => round.matches)).map((match) => [match.id, match]));
  const mergeEvent = (event: SnookerEvent) => ({
    ...event,
    rounds: event.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const current = currentMatchById.get(match.id);
        return current ? mergeLiveMatchMonotonic(current, match) : match;
      }),
    })),
  });
  const incomingById = new Map(incomingEvents.map((event) => [event.id, mergeEvent(event)]));
  const currentIds = new Set(currentEvents.map((event) => event.id));
  return [
    ...currentEvents.map((event) => incomingById.get(event.id) ?? event),
    ...incomingEvents.filter((event) => !currentIds.has(event.id)).map(mergeEvent),
  ];
}`,
"preserve event details during dashboard refresh",
);
await write(liveClientPath, liveClient);

const testPath = "tests/snooker-schedule-stability.test.mjs";
await write(testPath, `import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("series schedule merges stage identity into the round card", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.doesNotMatch(ui, /CHAMPIONSHIP LEAGUE STAGE/);
  assert.doesNotMatch(ui, /priority\\.seriesStageHeading/);
  assert.match(ui, /title=\\{\\`\\$\\{stage\\.stageNameZh\\} · \\$\\{round\\.labelZh\\}\\`\\}/);
  assert.match(ui, /orderedScheduleRounds\\(stageEvent\\)/);
});

test("schedule ordering uses scheduled time instead of match number as the primary key", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");
  assert.match(ui, /function scheduledTime\\(match: SnookerMatch\\)/);
  assert.match(ui, /completedEvent \\? bTime - aTime : aTime - bTime/);
  assert.match(ui, /a\\.key === "final"/);
  assert.match(ui, /orderedScheduleRounds\\(full\\)/);
});

test("dashboard snapshot merge preserves historical event details not present in a refresh", async () => {
  const liveClient = await read("lib/snooker/live-client.ts");
  assert.match(liveClient, /incomingById/);
  assert.match(liveClient, /currentEvents\\.map\\(\\(event\\) => incomingById\\.get\\(event\\.id\\) \\?\\? event\\)/);
  assert.match(liveClient, /incomingEvents\\.filter\\(\\(event\\) => !currentIds\\.has\\(event\\.id\\)\\)/);
});
`);

console.log("Applied schedule title, chronological ordering, and event-detail persistence fixes.");
