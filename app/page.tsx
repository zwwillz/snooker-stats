import SnookerDataCenterV2 from "./snooker/snooker-data-center-v2";
import SnookerViewUrlSync from "./snooker/snooker-view-url-sync";
import { SNOOKER_BUILD_MARK } from "@/lib/snooker/foundation";
import { loadSnookerDatabaseViewV2 } from "@/lib/snooker/database-public-v2";
import { refreshSnookerDatabaseViewLive } from "@/lib/snooker/live-read-through";
import { CURRENT_RANKING_KEYS, loadSnookerRankingHub, type SnookerCurrentRankingKey, type SnookerRankingSection } from "@/lib/snooker/ranking-hub";
import { buildHomeLeaders } from "@/lib/snooker/home-leaders";
import { loadSnookerHomeBootstrap } from "@/lib/snooker/home-bootstrap";
import { snookerCacheLabel, SNOOKER_CACHE_SECONDS } from "@/lib/snooker/cache-policy";

export const revalidate = 60;

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
  const useHomeBootstrap = !requestedPlayer && !query.section && !query.list && !query.group;

  let database;
  let rankingHub;
  let bootstrapLeaders = null;
  let bootstrapCompare = null;

  if (useHomeBootstrap) {
    const bootstrap = await loadSnookerHomeBootstrap();
    database = bootstrap.database;
    rankingHub = bootstrap.rankingHub;
    bootstrapLeaders = bootstrap.homeLeaders;
    bootstrapCompare = bootstrap.homePlayerCompare;
  } else {
    const [cachedDatabase, fullRankingHub] = await Promise.all([
      loadSnookerDatabaseViewV2(),
      loadSnookerRankingHub(),
    ]);
    database = await refreshSnookerDatabaseViewLive(cachedDatabase);
    rankingHub = fullRankingHub;
  }

  const snapshot = database.snapshot;
  const initialDatabaseEvents = useHomeBootstrap ? database.eventDetails : [snapshot.event];
  const homeLeaders = bootstrapLeaders ?? buildHomeLeaders(snapshot.players, database.currentSeason);
  const hasLiveMatch = initialDatabaseEvents.some((event) => event.rounds.some((round) => round.matches.some((match) => match.status === "live" || match.status === "session-break")));

  const sourceHealth = {
    online: database.databaseOnline,
    accepted: database.databaseOnline,
    fetchedAt: database.loadedAt,
    sourceLabel: useHomeBootstrap
      ? database.databaseOnline ? "Supabase · 首页缓存" : "最近成功缓存"
      : hasLiveMatch ? "Supabase · 实时直读" : snookerCacheLabel(database.databaseOnline),
    cacheSeconds: useHomeBootstrap
      ? SNOOKER_CACHE_SECONDS.recent
      : hasLiveMatch ? 0 : database.databaseOnline ? SNOOKER_CACHE_SECONDS.recent : SNOOKER_CACHE_SECONDS.history,
    message: database.databaseOnline
      ? useHomeBootstrap
        ? "根视图使用单次轻量数据入口；直播比分进入页面后立即校正并按30秒刷新，完整球员、排名和赛事详情按需读取。"
        : "前端读取独立斯诺克数据库；赛事详情按站完整读取，直播比分使用 no-store 实时直读。"
      : "首页数据源暂不可用，当前优先使用最近一次成功缓存。",
  };

  return (
    <>
      <SnookerViewUrlSync />
      <SnookerDataCenterV2
        initialSnapshot={snapshot}
        initialDatabaseEvents={initialDatabaseEvents}
        initialCurrentSeason={database.currentSeason}
        initialRankingHub={rankingHub}
        initialSourceHealth={sourceHealth}
        buildMark={`${SNOOKER_BUILD_MARK}-DB14`}
        initialView={initialView}
        initialPlayerSlug={requestedPlayer}
        initialDataSection={initialDataSection}
        initialRankingKey={initialDataSection ? rankingKey(query.list) : null}
        initialRankingSection={initialDataSection ? rankingSection(query.group) : "current"}
        initialPlayerCompare={bootstrapCompare}
        initialHomeLeaders={homeLeaders}
        initialHomeBootstrap={useHomeBootstrap}
      />
    </>
  );
}
