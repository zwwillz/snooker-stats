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
  '  const completedEvent = event.status === "completed" || allMatches(event).every((match) => match.status === "completed" || match.status === "walkover");',
  '  const final = finalOf(event);\n  const completedEvent = event.status === "completed" || final?.status === "completed" || final?.status === "walkover";',
  "authoritative event completion",
);

replaceOnce(
  '}\n\nfunction finalOf(event?: SnookerEvent) {',
  `}\n\nfunction scheduleFocusMatch(event: SnookerEvent, now = Date.now()) {\n  const matches = allMatches(event);\n  const ascending = (a: SnookerMatch, b: SnookerMatch) => {\n    const aTime = scheduledTime(a) ?? Number.POSITIVE_INFINITY;\n    const bTime = scheduledTime(b) ?? Number.POSITIVE_INFINITY;\n    return aTime - bTime || a.matchNo - b.matchNo || a.id.localeCompare(b.id);\n  };\n\n  const live = matches\n    .filter((match) => match.status === "live" || match.status === "session-break")\n    .sort(ascending);\n  if (live.length) return live[0];\n\n  const upcoming = matches.filter((match) => match.status === "upcoming").sort(ascending);\n  const future = upcoming.filter((match) => {\n    const time = scheduledTime(match);\n    return time !== null && time >= now;\n  });\n  if (future.length) return future[0];\n  if (upcoming.length) return upcoming[0];\n\n  return matches\n    .filter((match) => match.status === "completed" || match.status === "walkover")\n    .sort((a, b) => {\n      const aTime = scheduledTime(a) ?? Number.NEGATIVE_INFINITY;\n      const bTime = scheduledTime(b) ?? Number.NEGATIVE_INFINITY;\n      return bTime - aTime || b.matchNo - a.matchNo || b.id.localeCompare(a.id);\n    })[0];\n}\n\nfunction finalOf(event?: SnookerEvent) {`,
  "schedule focus selector",
);

replaceOnce(
  '    <button className={`${styles.matchRow} ${priority.horizontalMatchRow}`} onClick={onOpen}>',
  '    <button className={`${styles.matchRow} ${priority.horizontalMatchRow}`} data-schedule-match-id={match.id} onClick={onOpen}>',
  "schedule row locator",
);

replaceOnce(
  '  const eventDetailReturn = useRef<{ slug: string; tab: EventTab; scrollY: number } | null>(null);',
  '  const eventDetailReturn = useRef<{ slug: string; tab: EventTab; scrollY: number } | null>(null);\n  const scheduleAutoFocusedEvents = useRef(new Set<string>());',
  "schedule focus guard",
);

replaceOnce(
  '  const eventBySlug = useMemo(() => new Map(databaseEvents.map((event) => [event.slug, event])), [databaseEvents]);',
  `  const eventBySlug = useMemo(() => new Map(databaseEvents.map((event) => [event.slug, event])), [databaseEvents]);\n\n  useEffect(() => {\n    if (detail?.type !== "event" || detail.tab !== "schedule") return;\n    const event = eventBySlug.get(detail.slug);\n    if (!event || event.status !== "live" || scheduleAutoFocusedEvents.current.has(event.id)) return;\n    const target = scheduleFocusMatch(event);\n    if (!target) return;\n\n    const frame = window.requestAnimationFrame(() => {\n      const element = Array.from(document.querySelectorAll<HTMLElement>("[data-schedule-match-id]"))\n        .find((node) => node.dataset.scheduleMatchId === target.id);\n      if (!element) return;\n      scheduleAutoFocusedEvents.current.add(event.id);\n      element.scrollIntoView({ block: "center", behavior: "auto" });\n    });\n\n    return () => window.cancelAnimationFrame(frame);\n  }, [detail, eventBySlug]);`,
  "schedule first-entry autofocus",
);

await writeFile(target, source, "utf8");
