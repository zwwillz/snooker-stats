import { NextRequest, NextResponse } from "next/server";
import { loadSnookerEventCalendar } from "@/lib/snooker/event-calendar";
import { SNOOKER_CACHE_SECONDS } from "@/lib/snooker/cache-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season")?.trim() || undefined;
  if (season && !/^\d{4}\/\d{2}$/.test(season)) {
    return NextResponse.json(
      { ok: false, calendar: [], error: "INVALID_SEASON" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const calendar = await loadSnookerEventCalendar(season);
    return NextResponse.json(
      { ok: true, calendar },
      { headers: { "Cache-Control": `public, s-maxage=${SNOOKER_CACHE_SECONDS.history}, stale-while-revalidate=${SNOOKER_CACHE_SECONDS.history}` } },
    );
  } catch (error) {
    console.error("[snooker-calendar] load failed", error);
    return NextResponse.json(
      { ok: false, calendar: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
