import type { SnookerPlayer } from "./domain";
import { normalizePlayerStatus } from "./taxonomy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const BATCH_SIZE = 48;

const PLAYER_SELECT = [
  "id",
  "slug",
  "name_en",
  "name_zh",
  "short_name_en",
  "short_name_zh",
  "nationality_zh",
  "country_code",
  "date_of_birth",
  "turned_pro",
  "current_rank",
  "ranking_points",
  "avatar_url",
  "profile_source",
  "is_current_tour",
  "tour_status",
  "player_status",
].join(",");

type DbPlayer = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  short_name_en: string | null;
  short_name_zh: string | null;
  nationality_zh: string | null;
  country_code: string | null;
  date_of_birth: string | null;
  turned_pro: number | null;
  current_rank: number | null;
  ranking_points: number | null;
  avatar_url: string | null;
  profile_source: string | null;
  is_current_tour: boolean;
  tour_status: string;
  player_status: string;
};

function canonicalId(slug: string) {
  return `p-${slug}`;
}

function batches(values: string[]) {
  const result: string[][] = [];
  for (let index = 0; index < values.length; index += BATCH_SIZE) result.push(values.slice(index, index + BATCH_SIZE));
  return result;
}

async function rest<T>(path: string): Promise<T> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") throw new Error("SNOOKER_BUILD_OFFLINE");
  const response = await fetch(`${REST_URL}/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
    next: { revalidate: SNOOKER_CACHE_SECONDS.player },
  });
  if (!response.ok) throw new Error(`SNOOKER_SCOPED_PLAYER_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function inFilter(values: string[]) {
  return encodeURIComponent(`(${values.join(",")})`);
}

function mapPlayer(row: DbPlayer): SnookerPlayer {
  return {
    id: canonicalId(row.slug),
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    shortNameZh: row.short_name_zh || row.name_zh,
    ...(row.short_name_en ? { shortNameEn: row.short_name_en } : {}),
    nationalityZh: row.nationality_zh || "未知",
    countryCode: row.country_code || "",
    currentRank: row.current_rank,
    rankingPoints: row.ranking_points,
    ...(row.date_of_birth ? { dateOfBirth: row.date_of_birth } : {}),
    ...(row.turned_pro ? { turnedPro: row.turned_pro } : {}),
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
    profileSource: row.profile_source === "WST" || row.profile_source === "snooker.org" ? row.profile_source : "curated",
    isCurrentTour: row.is_current_tour,
    tourStatus: row.tour_status,
    playerStatus: normalizePlayerStatus(row.player_status, row.is_current_tour, row.turned_pro),
  };
}

export type ScopedSnookerPlayers = {
  players: SnookerPlayer[];
  canonicalByDbId: Map<string, string>;
};

export async function loadSnookerPlayersByDbIds(ids: string[]): Promise<ScopedSnookerPlayers> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return { players: [], canonicalByDbId: new Map() };
  const settled = await Promise.allSettled(
    batches(unique).map((batch) => rest<DbPlayer[]>(`snooker_players?select=${PLAYER_SELECT}&id=in.${inFilter(batch)}`)),
  );
  const rows = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  return {
    players: rows.map(mapPlayer),
    canonicalByDbId: new Map(rows.map((row) => [row.id, canonicalId(row.slug)])),
  };
}

export async function loadSnookerPlayersForCanonicalIds(ids: string[]): Promise<SnookerPlayer[]> {
  const slugs = [...new Set(ids
    .filter((id) => id.startsWith("p-") && id.length > 2)
    .map((id) => id.slice(2)))];
  const dbIds = [...new Set(ids.filter((id) => !id.startsWith("p-") && /^[0-9a-f-]{36}$/i.test(id)))];
  const requests: Array<Promise<DbPlayer[]>> = [];
  for (const batch of batches(slugs)) requests.push(rest<DbPlayer[]>(`snooker_players?select=${PLAYER_SELECT}&slug=in.${inFilter(batch)}`));
  for (const batch of batches(dbIds)) requests.push(rest<DbPlayer[]>(`snooker_players?select=${PLAYER_SELECT}&id=in.${inFilter(batch)}`));
  if (!requests.length) return [];
  const settled = await Promise.allSettled(requests);
  const byId = new Map<string, SnookerPlayer>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const row of result.value) {
      const player = mapPlayer(row);
      byId.set(player.id, player);
    }
  }
  return [...byId.values()];
}
