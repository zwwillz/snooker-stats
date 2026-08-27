export const SNOOKER_CACHE_SECONDS = {
  realtime: 30,
  recent: 300,
  player: 3600,
  history: 60,
} as const;

export const SNOOKER_DASHBOARD_CACHE_CONTROL = [
  "public",
  "max-age=15",
  `s-maxage=${SNOOKER_CACHE_SECONDS.realtime}`,
  `stale-while-revalidate=${SNOOKER_CACHE_SECONDS.recent}`,
  "stale-if-error=86400",
].join(", ");

export function snookerCacheLabel(databaseOnline: boolean) {
  return databaseOnline ? "Supabase · 智能缓存" : "本地验证快照 · 服务降级";
}
