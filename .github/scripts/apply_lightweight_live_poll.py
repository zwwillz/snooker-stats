from pathlib import Path

path = Path("app/snooker/snooker-data-center-v2.tsx")
text = path.read_text()

old_import = '''} from "@/lib/snooker/live-client";
import styles from "./snooker-data-center.module.css";'''
new_import = '''} from "@/lib/snooker/live-client";
import { dbMatchUuid, mergeHomeLiveEvent, type HomeLiveMatchRow } from "@/lib/snooker/home-live-overlay";
import styles from "./snooker-data-center.module.css";'''
if text.count(old_import) != 1:
    raise SystemExit(f"live overlay import anchor: expected 1 match, got {text.count(old_import)}")
text = text.replace(old_import, new_import)

old_type = '''type DashboardResponse = {
  ok?: boolean;
  snapshot?: SnookerDashboardSnapshot;
  databaseEvents?: SnookerEvent[];
  currentSeason?: string;
  sourceHealth?: SourceHealth;
};

type CalendarResponse = {'''
new_type = '''type DashboardResponse = {
  ok?: boolean;
  snapshot?: SnookerDashboardSnapshot;
  databaseEvents?: SnookerEvent[];
  currentSeason?: string;
  sourceHealth?: SourceHealth;
};

type HomeLiveResponse = {
  ok?: boolean;
  matches?: HomeLiveMatchRow[];
  fetchedAt?: string;
};

type CalendarResponse = {'''
if text.count(old_type) != 1:
    raise SystemExit(f"home live response type anchor: expected 1 match, got {text.count(old_type)}")
text = text.replace(old_type, new_type)

start_marker = '''  const pollReferenceTime = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;'''
end_marker = '''

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {'''
if text.count(start_marker) != 1 or text.count(end_marker) != 1:
    raise SystemExit(f"live refresh block anchors invalid: start={text.count(start_marker)} end={text.count(end_marker)}")
start = text.index(start_marker)
end = text.index(end_marker, start)
new_block = '''  const pollReferenceTime = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;
  const shouldPollLive = databaseEvents.some((event) => allMatches(event).some((match) => {
    if (match.status === "live" || match.status === "session-break") return true;
    const scheduled = match.scheduledAt ? Date.parse(match.scheduledAt) : 0;
    if (match.status === "upcoming" && scheduled && scheduled >= pollReferenceTime && scheduled - pollReferenceTime <= UPCOMING_PREHEAT_MS) return true;
    const completedAt = resolveCompletedAt(match, pollReferenceTime);
    return (match.status === "completed" || match.status === "walkover") && completedAt > 0 && pollReferenceTime - completedAt <= COMPLETED_PROTECTION_MS;
  }));
  const liveRefreshState = useRef<{ events: SnookerEvent[]; detailType: DetailState["type"] | null }>({
    events: databaseEvents,
    detailType: detail?.type ?? null,
  });

  useEffect(() => {
    liveRefreshState.current = { events: databaseEvents, detailType: detail?.type ?? null };
  }, [databaseEvents, detail?.type]);

  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    setRefreshing(true);
    try {
      const currentEvents = liveRefreshState.current.events;
      if (liveRefreshState.current.detailType === "match") {
        const response = await fetch("/api/snooker/v1/dashboard", { cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json() as DashboardResponse;
        if (!response.ok || !data.ok || !data.snapshot) throw new Error("DASHBOARD_UNAVAILABLE");
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
        if (data.sourceHealth) setSourceHealth(data.sourceHealth);
      } else {
        const matchIds = [...new Set(currentEvents.flatMap((event) => allMatches(event))
          .map((match) => dbMatchUuid(match))
          .filter((id): id is string => Boolean(id)))];
        if (!matchIds.length) return;

        const response = await fetch(`/api/snooker/v1/home-live?ids=${encodeURIComponent(matchIds.join(","))}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = await response.json() as HomeLiveResponse;
        if (!response.ok || !data.ok || !data.matches) throw new Error("HOME_LIVE_UNAVAILABLE");

        const changedAt = data.fetchedAt ?? new Date().toISOString();
        const clientIdByDbId = new Map<string, string>();
        for (const event of currentEvents) {
          for (const match of allMatches(event)) {
            const uuid = dbMatchUuid(match);
            if (uuid) clientIdByDbId.set(uuid, match.id);
          }
        }
        const updatedEntries = data.matches.flatMap((row) => {
          const clientId = clientIdByDbId.get(row.id);
          return clientId ? [[clientId, row.source_updated_at ?? changedAt] as const] : [];
        });

        setDatabaseEvents((current) => current.map((event) => mergeHomeLiveEvent(event, data.matches!)));
        setSnapshot((current) => ({
          ...current,
          event: mergeHomeLiveEvent(current.event, data.matches!),
          builtAt: changedAt,
        }));
        if (updatedEntries.length) {
          setMatchUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(updatedEntries) }));
        }
        setSourceHealth({
          online: true,
          accepted: true,
          fetchedAt: changedAt,
          message: "轻量实时比分已同步；完整逐局和统计仅在比赛详情读取。",
          sourceLabel: "Supabase · 轻量实时比分",
          cacheSeconds: 0,
        });
      }
    } catch {
      setSourceHealth((current) => current ? {
        ...current,
        accepted: false,
        message: "实时比分暂时不可用，继续显示最近成功数据。",
      } : current);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldPollLive) return;
    const firstRefreshFrame = window.requestAnimationFrame(() => void refresh());
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(firstRefreshFrame);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [shouldPollLive, refresh]);'''
text = text[:start] + new_block + text[end:]
path.write_text(text)
