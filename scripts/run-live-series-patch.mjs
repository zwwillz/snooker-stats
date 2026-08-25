import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourcePath = "scripts/apply-live-series-experience.mjs";
let source = await readFile(sourcePath, "utf8");
const start = source.indexOf("const eventBlock = `");
const endMarker = "`;\nui = regexOnce(ui, /  if \\(detail";
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("Unable to locate eventBlock template in patch script");
const before = source.slice(0, start);
const block = source.slice(start, end).replace(/(?<!\\)\$\{/g, "\\${");
const after = source.slice(end);
source = before + block + after;
const temp = "/tmp/apply-live-series-experience-fixed.mjs";
await writeFile(temp, source);
await import(pathToFileURL(temp).href);

const uiPath = "app/snooker/snooker-data-center-v2.tsx";
let ui = await readFile(uiPath, "utf8");
const generatedBlock = `  const shouldPollDashboard = useMemo(() => {
    const now = Date.now();
    return databaseEvents.some((event) => allMatches(event).some((match) => {
      if (match.status === "live" || match.status === "session-break") return true;
      const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
      if (match.status === "upcoming" && scheduled && scheduled >= now && scheduled - now <= 6 * 60 * 60 * 1000) return true;
      const completed = match.completedDetectedAt || match.sourceUpdatedAt;
      const completedAt = completed ? Date.parse(completed) : 0;
      return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && now - completedAt <= 60 * 60 * 1000;
    }));
  }, [databaseEvents]);`;
const safeBlock = `  const pollReferenceTime = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;
  const shouldPollDashboard = databaseEvents.some((event) => allMatches(event).some((match) => {
    if (match.status === "live" || match.status === "session-break") return true;
    const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
    if (match.status === "upcoming" && scheduled && scheduled >= pollReferenceTime && scheduled - pollReferenceTime <= 6 * 60 * 60 * 1000) return true;
    const completed = match.completedDetectedAt || match.sourceUpdatedAt;
    const completedAt = completed ? Date.parse(completed) : 0;
    return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && pollReferenceTime - completedAt <= 60 * 60 * 1000;
  }));`;
if (!ui.includes(generatedBlock)) throw new Error("Generated poll predicate target missing");
ui = ui.replace(generatedBlock, safeBlock);
await writeFile(uiPath, ui);
