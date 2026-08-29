import SnookerDataCenterV2 from "./snooker/snooker-data-center-v2";
import LiveStrikerIndicatorGated from "./snooker/live-striker-indicator-gated";
import SnookerViewUrlSync from "./snooker/snooker-view-url-sync";
import HomeExtras from "./snooker/home-extras";
import { SNOOKER_BUILD_MARK } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { refreshSnookerDatabaseViewLive } from "@/lib/snooker/live-read-through";
import { CURRENT_RANKING_KEYS, loadSnookerRankingHub, type SnookerCurrentRankingKey, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";
import { buildHomeLeaders } from "@/lib/snooker/home-leaders";
import { loadSnookerHomeBootstrapV3 } from "@/lib/snooker/home-bootstrap-v3";
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
  const query = await searchParams;
  const requestedPlayer = query.player?.trim() || null;
  const initialDataSection = query.view === "data" && query.section === "rankings" ? "rankings" as const : null;
  const initialView: SnookerRootView = requestedPlayer
    ? "players"
    : initialDataSection
      ? "data"
      : query.view === "matches" || query.view === "players" || query.view === "data"
        ? query.view
        : "home";
  const useHomeBootstrap = initialView === "home" && !requestedPlayer;

  const [cachedDatabase, rankingHub, bootstrapLeaders, bootstrapCompare] = useHomeBootstrap
    ? await loadSnookerHomeBootstrapV3().then((bootstrap) => [bootstrap.database, bootstrap.rankingHub, bootstrap.homeLeaders, bootstrap.homePlayerCompare] as const)
    : await Promise.all([loadSnookerDatabaseViewV2(), loadSnookerRankingHub()]).then(([database, hub]) => [database, hub, null, null] as const);

  const database = await refreshSnookerDatabaseViewLive(cachedDatabase);
  const focusedEvent = database.snapshot.event;
  const focusedEvents = [focusedEvent];
  const snapshot = database.snapshot;
  const homeLeaders = bootstrapLeaders ?? buildHomeLeaders(snapshot.players, database.currentSeason);
  const hasLiveMatch = focusedEvents.some((event) => event.rounds.some((round) => round.matches.some((match) => match.status === "live" || match.status === "session-break")));

  const sourceHealth = {
    online: database.databaseOnline,
    accepted: database.databaseOnline,
    fetchedAt: database.loadedAt,
    sourceLabel: hasLiveMatch ? "Supabase · 实时直读" : snookerCacheLabel(database.databaseOnline),
    cacheSeconds: hasLiveMatch ? 0 : database.databaseOnline ? SNOOKER_CACHE_SECONDS.recent : SNOOKER_CACHE_SECONDS.history,
    message: database.databaseOnline
      ? useHomeBootstrap
        ? "首页使用轻量数据入口；赛事详情、完整排名和专业数据按需读取，直播比分继续使用 no-store 实时直读。"
        : "前端读取独立斯诺克数据库；赛事详情按站完整读取，直播比分使用 no-store 实时直读。"
      : "独立数据库暂不可用，当前使用本地已验证快照兜底。",
  };

  return (
    <>
      <SnookerViewUrlSync />
      <SnookerDataCenterV2
        initialSnapshot={snapshot}
        initialDatabaseEvents={focusedEvents}
        initialCurrentSeason={database.currentSeason}
        initialRankingHub={rankingHub}
        initialSourceHealth={sourceHealth}
        buildMark={`${SNOOKER_BUILD_MARK}-DB13`}
        initialView={initialView}
        initialPlayerSlug={requestedPlayer}
        initialDataSection={initialDataSection}
        initialRankingKey={initialDataSection ? rankingKey(query.list) : null}
        initialRankingSection={initialDataSection ? rankingSection(query.group) : "current"}
        initialPlayerCompare={bootstrapCompare}
      />
      {useHomeBootstrap ? <HomeExtras leaders={homeLeaders} /> : null}
      <LiveStrikerIndicatorGated />
    </>
  );
}
