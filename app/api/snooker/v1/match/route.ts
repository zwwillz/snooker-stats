import { NextResponse } from "next/server";
import { loadSnookerMatchDetail } from "@/lib/snooker/match-detail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const matchId = requestUrl.searchParams.get("id")?.trim() || "";
  if (!matchId) {
    return NextResponse.json({ ok: false, error: "MATCH_ID_REQUIRED" }, {
      status: 400,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  try {
    const detail = await loadSnookerMatchDetail(matchId);
    if (!detail) {
      return NextResponse.json({ ok: false, error: "MATCH_NOT_FOUND" }, {
        status: 404,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
    return NextResponse.json({ ok: true, ...detail }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[snooker-match] targeted match detail failed", error);
    return NextResponse.json({ ok: false, error: "MATCH_DETAIL_UNAVAILABLE" }, {
      status: 502,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
