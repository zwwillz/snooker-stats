import { NextResponse } from "next/server";
import type { HomeLiveMatchRow } from "@/lib/snooker/home-live-overlay";
import { getSnookerSupabasePublicConfig } from "@/lib/snooker/supabase-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT = [
  "id",
  "event_id",
  "score1",
  "score2",
  "status",
  "source_status",
  "source_status_meta",
  "source_updated_at",
  "completed_detected_at",
  "current_player_side",
  "current_break",
  "live_frame_no",
].join(",");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const ids = [...new Set((requestUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => UUID_PATTERN.test(value)))]
    .slice(0, 64);

  if (!ids.length) {
    return NextResponse.json({ ok: true, matches: [], fetchedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const { url, publishableKey } = getSnookerSupabasePublicConfig();
  const params = new URLSearchParams({
    select: SELECT,
    id: `in.(${ids.join(",")})`,
  });

  try {
    const response = await fetch(`${url}/rest/v1/snooker_matches?${params.toString()}`, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HOME_LIVE_HTTP_${response.status}`);
    const matches = await response.json() as HomeLiveMatchRow[];
    return NextResponse.json({ ok: true, matches, fetchedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[snooker-home-live] score overlay failed", error);
    return NextResponse.json({ ok: false, matches: [], fetchedAt: new Date().toISOString() }, {
      status: 502,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
