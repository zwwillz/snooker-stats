import SnookerDataCenterV2 from "./snooker/snooker-data-center-v2";
import LiveStrikerIndicator from "./snooker/live-striker-indicator";
import SnookerViewUrlSync from "./snooker/snooker-view-url-sync";
import { SNOOKER_BUILD_MARK } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { refreshSnookerDatabaseViewLive } from "@/lib/snooker/live-read-through";
import { CURRENT_RANKING_KEYS, loadSnookerRankingHub, type SnookerCurrentRankingKey, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";
import { snookerCacheLabel, SNOOKER_CACHE_SECONDS } from "@/lib/snooker/cache-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SnookerRootView = "home" | "matches" | "players" | "data";

function rankingKey(value?: string): SnookerCurrentRankingKey {
  return CURRENT_RANKING_KEYS.find((key) => key === value) ?? "world_official";
}

function rankingSection(value?: string): SnookerRankingSection {
  return value === "qualification" || value === "history" ? value : "current";
}

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; player?: string; section?: string; list?: string; group?: string }> }) {
  const [cachedDatabase, rankingHub, query] = await Promise.all([loadSnookerDatabaseViewV2(), loadSnookerRankingHub(), searchParams]);
  const database = await refreshSnookerDatabaseViewLive(cachedDatabase);
  const requestedPlayer = query.player?.trim() || null;
  const initialDataSection = query.view === "data" && query.section === "rankings" ? "rankings" as const : null;
  const initialView: SnookerRootView = requestedPlayer
    ? "players"
    : initialDataSection
      ? "data"
      : query.view === "matches" || query.view === "players" || query.view === "data"
        ? query.view
        : "home";
  const hasLiveMatch = database.eventDetails.some((event) => event.rounds.some((round) => round.matches.some((match) => match.status === "live" || match.status === "session-break")));

  const sourceHealth = {
    online: database.databaseOnline,
    accepted: database.databaseOnline,
    fetchedAt: database.loadedAt,
    sourceLabel: hasLiveMatch ? "Supabase · 实时直读" : snookerCacheLabel(database.databaseOnline),
    cacheSeconds: hasLiveMatch ? 0 : database.databaseOnline ? SNOOKER_CACHE_SECONDS.recent : SNOOKER_CACHE_SECONDS.history,
    message: database.databaseOnline
      ? "前端读取独立斯诺克数据库；直播比分使用 no-store 实时直读。"
      : "独立数据库暂不可用，当前使用本地已验证快照兜底。",
  };

  return (
    <>
      <SnookerViewUrlSync />
      <SnookerDataCenterV2
        initialSnapshot={database.snapshot}
        initialDatabaseEvents={database.eventDetails}
        initialEventSeries={database.eventSeries}
        initialCurrentSeason={database.currentSeason}
        initialRankingHub={rankingHub}
        initialSourceHealth={sourceHealth}
        buildMark={`${SNOOKER_BUILD_MARK}-DB11`}
        initialView={initialView}
        initialPlayerSlug={requestedPlayer}
        initialDataSection={initialDataSection}
        initialRankingKey={initialDataSection ? rankingKey(query.list) : null}
        initialRankingSection={initialDataSection ? rankingSection(query.group) : "current"}
      />
      <LiveStrikerIndicator />
    </>
  );
}
