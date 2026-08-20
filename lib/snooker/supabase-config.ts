export type SnookerSupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

const OFFLINE_CONFIG: SnookerSupabasePublicConfig = {
  url: "https://offline.invalid",
  publishableKey: "offline-publishable-key",
};

export function getSnookerSupabasePublicConfig(): SnookerSupabasePublicConfig {
  const url = process.env.SNOOKER_SUPABASE_URL?.trim();
  const publishableKey = process.env.SNOOKER_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (url && publishableKey) return { url, publishableKey };
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") return OFFLINE_CONFIG;

  const missing = [
    !url ? "SNOOKER_SUPABASE_URL" : null,
    !publishableKey ? "SNOOKER_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter(Boolean).join("、");
  throw new Error(`缺少斯诺克 Supabase 公开读取配置：${missing}`);
}
