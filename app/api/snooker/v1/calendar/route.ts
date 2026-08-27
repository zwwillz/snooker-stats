import { NextResponse } from "next/server";
import { loadSnookerEventCalendar } from "@/lib/snooker/event-calendar";
import { SNOOKER_CACHE_SECONDS } from "@/lib/snooker/cache-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const calendar = await loadSnookerEventCalendar();
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
