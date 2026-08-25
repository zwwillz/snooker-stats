import { readFile, writeFile } from "node:fs/promises";

const path = "app/snooker/snooker-data-center-v2.tsx";
let source = await readFile(path, "utf8");
const from = `  const shouldPollDashboard = useMemo(() => {
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
const to = `  const pollReferenceTime = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;
  const shouldPollDashboard = databaseEvents.some((event) => allMatches(event).some((match) => {
    if (match.status === "live" || match.status === "session-break") return true;
    const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
    if (match.status === "upcoming" && scheduled && scheduled >= pollReferenceTime && scheduled - pollReferenceTime <= 6 * 60 * 60 * 1000) return true;
    const completed = match.completedDetectedAt || match.sourceUpdatedAt;
    const completedAt = completed ? Date.parse(completed) : 0;
    return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && pollReferenceTime - completedAt <= 60 * 60 * 1000;
  }));`;
if (!source.includes(from)) throw new Error("poll render-purity patch target missing");
source = source.replace(from, to);
await writeFile(path, source);
