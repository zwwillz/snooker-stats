import type { SnookerCalendarEvent } from "./domain";
import { SNOOKER_CACHE_SECONDS } from "./cache-policy";
import { getSnookerSupabasePublicConfig } from "./supabase-config";
import { compactEventTypeLabel, normalizeEventTaxonomy } from "./taxonomy";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const REST_URL = `${SUPABASE_URL}/rest/v1`;

type DbCalendarEvent = {
  id: string;
  slug: string;
  season: string;
  name_en: string;
  name_zh: string;
  type_zh: string | null;
  event_type: string | null;
  event_stage: string | null;
  ranking_status: string | null;
  start_date: string | null;
  end_date: string | null;
  country_zh: string | null;
  city_zh: string | null;
  venue_zh: string | null;
  data_ready: boolean;
};

function todayInChina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusFromDates(startDate: string, endDate: string): "upcoming" | "live" | "completed" {
  const today = todayInChina();
  if (today < startDate) return "upcoming";
  if (today > endDate) return "completed";
  return "live";
}

function statusLabel(status: "upcoming" | "live" | "completed") {
  if (status === "completed") return "已结束";
  if (status === "live") return "进行中";
  return "即将开始";
}

export async function loadSnookerEventCalendar(season?: string): Promise<SnookerCalendarEvent[]> {
  if (process.env.SNOOKER_BUILD_OFFLINE === "1") return [];
  const seasonFilter = season ? `&season=eq.${encodeURIComponent(season)}` : "";
  const response = await fetch(
    `${REST_URL}/snooker_events?select=id,slug,season,name_en,name_zh,type_zh,event_type,event_stage,ranking_status,start_date,end_date,country_zh,city_zh,venue_zh,data_ready${seasonFilter}&order=start_date.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      next: { revalidate: SNOOKER_CACHE_SECONDS.history },
    },
  );
  if (!response.ok) throw new Error(`SNOOKER_EVENT_CALENDAR_HTTP_${response.status}`);

  const rows = await response.json() as DbCalendarEvent[];
  return rows
    .filter((row) => Number(row.season.slice(0, 4)) >= 2019)
    .map((row) => {
      const startDate = row.start_date || row.end_date || new Date().toISOString().slice(0, 10);
      const endDate = row.end_date || startDate;
      const status = statusFromDates(startDate, endDate);
      const taxonomy = normalizeEventTaxonomy(row.event_type, row.event_stage, row.ranking_status, row.type_zh);
      return {
        id: `db-calendar-${row.id}`,
        slug: row.slug,
        nameZh: row.name_zh,
        nameEn: row.name_en,
        season: row.season,
        typeZh: compactEventTypeLabel(taxonomy),
        eventType: taxonomy.eventType,
        eventStage: taxonomy.eventStage,
        rankingStatus: taxonomy.rankingStatus,
        status,
        statusLabelZh: statusLabel(status),
        startDate,
        endDate,
        cityZh: row.city_zh || "待定",
        countryZh: row.country_zh || "待定",
        ...(row.venue_zh ? { venueZh: row.venue_zh } : {}),
        current: status === "live",
        dataReady: row.data_ready,
      } satisfies SnookerCalendarEvent;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
