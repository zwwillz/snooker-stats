import { NextResponse } from "next/server";
import {
  getSnookerPlayerDirectoryPage,
  searchSnookerPlayerDirectory,
  type SnookerPlayerDirectoryScope,
} from "@/lib/snooker/player-data";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    if (mode === "search") {
      const players = await searchSnookerPlayerDirectory({
        query: url.searchParams.get("q"),
        chinaOnly: url.searchParams.get("filter") === "china",
      });
      return NextResponse.json(
        { ok: true, players },
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" } },
      );
    }

    const scope: SnookerPlayerDirectoryScope = url.searchParams.get("scope") === "archive" ? "archive" : "tour";
    const page = await getSnookerPlayerDirectoryPage({
      scope,
      cursor: url.searchParams.get("cursor"),
      limit: Number(url.searchParams.get("limit") ?? 32),
    });
    return NextResponse.json(
      { ok: true, scope, ...page },
      { headers: { "Cache-Control": scope === "archive" ? "private, no-store" : "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (error) {
    console.error("[player-directory] failed", error);
    return NextResponse.json({ ok: false, players: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
