import { NextResponse } from "next/server";
import { loadPlayerCompare } from "@/lib/snooker/player-compare";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const player1 = searchParams.get("player1")?.trim() ?? "";
  const player2 = searchParams.get("player2")?.trim() ?? "";
  const season = searchParams.get("season")?.trim() || null;

  if (!player1 || !player2 || player1 === player2) {
    return NextResponse.json(
      { ok: false, error: "请选择两名不同的职业球员。" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const compare = await loadPlayerCompare(player1, player2, season);
    if (!compare) {
      return NextResponse.json(
        { ok: false, error: "球员对比数据暂不可用，请确认两名球员均为当前职业巡回赛球员。" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, compare },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[player-compare] failed", error);
    return NextResponse.json(
      { ok: false, error: "球员对比数据加载失败，请稍后重试。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
